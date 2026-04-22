<?php

namespace App\Services;

use App\Models\LandlordVerification;
use App\Models\Property;
use App\Models\PropertyImage;
use App\Models\User;
use App\Services\Subscription\SubscriptionResolverService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use ProtoneMedia\LaravelFFMpeg\Support\FFMpeg;

class PropertyService
{
    public function __construct(private readonly SubscriptionResolverService $subscriptionResolverService) {}

    public function canLandlordSubmitProperties(User $user): bool
    {
        if ((bool) ($user->is_verified ?? false)) {
            return true;
        }

        if ($user->role !== 'landlord') {
            return false;
        }

        $verification = LandlordVerification::where('user_id', $user->id)->first();

        return (bool) ($verification
            && in_array($verification->status, LandlordVerification::LANDLORD_ACCESS_STATUSES, true));
    }

    public function createProperty(array $validated, User $user): Property
    {
        return DB::transaction(function () use ($validated, $user) {
            try {
                $this->assertCanCreatePropertyUnderSubscription($user);
            } catch (ValidationException $e) {
                \Illuminate\Support\Facades\Log::warning('Property creation blocked by subscription limit', [
                    'user_id' => $user->id,
                    'errors' => $e->errors(),
                ]);
                throw $e;
            }

            $canSubmitProperties = $this->canLandlordSubmitProperties($user);

            $currentStatus = Property::STATUS_DRAFT;
            $isPublished = false;
            $isAvailable = false;

            if ($canSubmitProperties) {
                $currentStatus = ($validated['is_draft'] ?? false) ? Property::STATUS_DRAFT : ($validated['current_status'] ?? Property::STATUS_PENDING);
                // New properties (Draft/Pending) should NOT be published or available initially
                $isPublished = false;
                $isAvailable = false;
            }

            if (isset($validated['property_rules']) && is_string($validated['property_rules'])) {
                $validated['property_rules'] = json_decode($validated['property_rules'], true) ?? [];
            }

            $sexRestriction = strtolower($validated['sex_restriction'] ?? 'mixed');
            $sexRestriction = match ($sexRestriction) {
                'boys', 'male' => 'male',
                'girls', 'female' => 'female',
                default => 'mixed',
            };

            $propertyType = $this->normalizePropertyTypeValue($validated['property_type'] ?? '');

            $reservationFeeAmountRaw = $validated['reservation_fee_amount']
                ?? $validated['reservation_fee']
                ?? 0;
            $reservationFeeAmount = is_numeric($reservationFeeAmountRaw)
                ? (float) $reservationFeeAmountRaw
                : 0.0;
            $reservationFeeGapDaysRaw = $validated['reservation_fee_gap_days'] ?? 3;
            $reservationFeeGapDays = max(0, (int) $reservationFeeGapDaysRaw);
            $normalBookingLimit = min(4, max(1, (int) ($validated['normal_booking_limit'] ?? 1)));
            $proxyBookingLimit = min(4, max(1, (int) ($validated['proxy_booking_limit'] ?? 3)));
            $minPartialPaymentPct = min(100, max(1, (int) ($validated['min_partial_payment_pct'] ?? 20)));

            $property = Property::create([
                'landlord_id' => $user->id,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'property_type' => $propertyType,
                'sex_restriction' => $sexRestriction,
                'current_status' => $currentStatus,
                'street_address' => $validated['street_address'],
                'city' => $validated['city'],
                'province' => $validated['province'],
                'barangay' => $validated['barangay'] ?? null,
                'postal_code' => $validated['postal_code'] ?? null,
                'latitude' => $validated['latitude'] ?? null,
                'longitude' => $validated['longitude'] ?? null,
                'nearby_landmarks' => $validated['nearby_landmarks'] ?? null,
                'max_occupants' => $validated['max_occupants'] ?? 1,
                'number_of_bedrooms' => $validated['number_of_bedrooms'] ?? null,
                'number_of_bathrooms' => $validated['number_of_bathrooms'] ?? null,
                'floor_area' => $validated['floor_area'] ?? null,
                'floor_level' => $validated['floor_level'] ?? null,
                'total_floors' => $validated['total_floors'] ?? 1,
                'property_rules' => $validated['property_rules'] ?? null,
                'total_rooms' => 0,
                'available_rooms' => 0,
                'is_published' => $isPublished,
                'is_available' => $isAvailable,
                'is_eligible' => $validated['is_eligible'] ?? false,
                'require_1month_advance' => (bool) ($validated['require_1month_advance'] ?? false),
                'allow_partial_payments' => array_key_exists('allow_partial_payments', $validated)
                    ? (bool) $validated['allow_partial_payments']
                    : true,
                'force_wallet_refunds' => array_key_exists('force_wallet_refunds', $validated)
                    ? (bool) $validated['force_wallet_refunds']
                    : true,
                'normal_booking_limit' => $normalBookingLimit,
                'proxy_booking_limit' => $proxyBookingLimit,
                'min_partial_payment_pct' => $minPartialPaymentPct,
                'require_reservation_fee' => (bool) ($validated['require_reservation_fee'] ?? false),
                'reservation_fee' => $reservationFeeAmount,
                'reservation_fee_gap_days' => $reservationFeeGapDays,
                'accepted_payments' => $validated['accepted_payments'] ?? null,
            ]);

            $this->handleFileUploads($property, app('request'));

            if (isset($validated['amenities']) && is_array($validated['amenities'])) {
                $this->syncAmenities($property, $validated['amenities']);
            }

            return $property;
        });
    }

    public function updateProperty(Property $property, array $validated, Request $request): Property
    {
        return DB::transaction(function () use ($property, $validated, $request) {
            $user = Auth::user();
            $canSubmitProperties = $user instanceof User
                ? $this->canLandlordSubmitProperties($user)
                : false;

            if (isset($validated['is_draft']) && $validated['is_draft']) {
                $validated['current_status'] = Property::STATUS_DRAFT;
            }

            if (! $canSubmitProperties) {
                $validated['current_status'] = Property::STATUS_DRAFT;
                $validated['is_published'] = false;
            }

            // Prevent changing status from pending to active/inactive by landlord
            if ($property->current_status === Property::STATUS_PENDING && isset($validated['current_status'])) {
                if (in_array($validated['current_status'], [Property::STATUS_ACTIVE, Property::STATUS_INACTIVE])) {
                    unset($validated['current_status']);
                }
            }

            $hasStatusUpdate = array_key_exists('current_status', $validated);
            $hasPublishUpdate = array_key_exists('is_published', $validated);
            $hasAvailabilityUpdate = array_key_exists('is_available', $validated);

            if ($hasPublishUpdate) {
                $validated['is_published'] = (bool) $validated['is_published'];
            }

            if ($hasAvailabilityUpdate) {
                $validated['is_available'] = (bool) $validated['is_available'];
            }

            // Keep status authoritative while still allowing explicit publish toggle for active properties.
            if ($hasStatusUpdate) {
                if (in_array($validated['current_status'], [
                    Property::STATUS_MAINTENANCE,
                    Property::STATUS_INACTIVE,
                    Property::STATUS_DRAFT,
                    Property::STATUS_PENDING,
                ], true)) {
                    $validated['is_published'] = false;
                    $validated['is_available'] = false;
                } elseif ($validated['current_status'] === Property::STATUS_ACTIVE) {
                    if (! $hasPublishUpdate) {
                        $validated['is_published'] = true;
                    }

                    if (! $hasAvailabilityUpdate) {
                        $validated['is_available'] = true;
                    }
                }
            }

            $effectiveStatus = $hasStatusUpdate
                ? $validated['current_status']
                : $property->current_status;

            if ($effectiveStatus !== Property::STATUS_ACTIVE) {
                $validated['is_published'] = false;
            }

            if (isset($validated['property_rules']) && is_string($validated['property_rules'])) {
                $validated['property_rules'] = json_decode($validated['property_rules'], true) ?? [];
            }

            if (isset($validated['sex_restriction'])) {
                $val = strtolower($validated['sex_restriction']);
                $validated['sex_restriction'] = match ($val) {
                    'boys', 'male' => 'male',
                    'girls', 'female' => 'female',
                    default => 'mixed',
                };
            }

            if (isset($validated['property_type'])) {
                $validated['property_type'] = $this->normalizePropertyTypeValue($validated['property_type']);
            }

            if (array_key_exists('require_1month_advance', $validated)) {
                $validated['require_1month_advance'] = (bool) $validated['require_1month_advance'];
            }

            if (array_key_exists('allow_partial_payments', $validated)) {
                $validated['allow_partial_payments'] = (bool) $validated['allow_partial_payments'];
            }

            if (array_key_exists('force_wallet_refunds', $validated)) {
                $validated['force_wallet_refunds'] = (bool) $validated['force_wallet_refunds'];
            }

            if (array_key_exists('normal_booking_limit', $validated)) {
                $validated['normal_booking_limit'] = min(4, max(1, (int) $validated['normal_booking_limit']));
            }

            if (array_key_exists('proxy_booking_limit', $validated)) {
                $validated['proxy_booking_limit'] = min(4, max(1, (int) $validated['proxy_booking_limit']));
            }

            if (array_key_exists('min_partial_payment_pct', $validated)) {
                $validated['min_partial_payment_pct'] = min(100, max(1, (int) $validated['min_partial_payment_pct']));
            }

            if (array_key_exists('require_reservation_fee', $validated)) {
                $validated['require_reservation_fee'] = (bool) $validated['require_reservation_fee'];
            }

            if (array_key_exists('reservation_fee_amount', $validated) && ! array_key_exists('reservation_fee', $validated)) {
                $validated['reservation_fee'] = (float) $validated['reservation_fee_amount'];
            } elseif (array_key_exists('reservation_fee', $validated)) {
                $validated['reservation_fee'] = (float) $validated['reservation_fee'];
            }

            if (array_key_exists('reservation_fee_gap_days', $validated)) {
                $validated['reservation_fee_gap_days'] = max(0, (int) $validated['reservation_fee_gap_days']);
            }

            $property->update($validated);

            if ($request->has('is_eligible')) {
                $property->is_eligible = (bool) $request->input('is_eligible');
                $property->save();
            }

            if (isset($validated['amenities'])) {
                $this->syncAmenities($property, $validated['amenities']);
            }

            $this->handleFileUploads($property, $request, true);

            return $property;
        });
    }

    public function getPublicProperties(Request $request)
    {
        $tenantId = Auth::id();
        $blockedStatuses = ['pending', 'confirmed', 'active', 'completed', 'partial-completed'];
        $excludeTenantBookedRooms = function ($roomQuery) use ($tenantId, $blockedStatuses) {
            if (! $tenantId) {
                return;
            }

            $roomQuery->whereDoesntHave('bookings', function ($bookingQuery) use ($tenantId, $blockedStatuses) {
                $bookingQuery->where('tenant_id', $tenantId)
                    ->whereIn('status', $blockedStatuses);
            });
        };

        $query = Property::where('is_published', true)->where('is_available', true);

        if ($request->has('search') && ! empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('street_address', 'like', "%{$search}%")
                    ->orWhere('barangay', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhere('province', 'like', "%{$search}%");
            });
        }

        if ($request->has('type') && ! empty($request->type) && $request->type !== 'All') {
            $type = trim((string) $request->type);
            $normalizedType = strtolower(preg_replace('/[\s_-]+/', '', $type) ?? $type);

            $query->where(function ($q) use ($type, $normalizedType) {
                $q->where('property_type', $type)
                    ->orWhereRaw(
                        "LOWER(REPLACE(REPLACE(REPLACE(property_type, ' ', ''), '_', ''), '-', '')) = ?",
                        [$normalizedType]
                    );
            });
        }

        if ($request->filled('sex_policy')) {
            $sexPolicy = strtolower(trim((string) $request->input('sex_policy')));

            if (in_array($sexPolicy, ['male', 'boys', 'boy'], true)) {
                $query->whereIn('sex_restriction', ['male', 'boys']);
            } elseif (in_array($sexPolicy, ['female', 'girls', 'girl'], true)) {
                $query->whereIn('sex_restriction', ['female', 'girls']);
            } elseif ($sexPolicy === 'mixed') {
                $query->where('sex_restriction', 'mixed');
            }
        }

        if ($request->has('min_price') || $request->has('max_price')) {
            $query->whereHas('rooms', function ($q) use ($request, $excludeTenantBookedRooms) {
                $excludeTenantBookedRooms($q);
                $q->where('status', 'available')
                    ->whereDoesntHave('evictionSchedules', function ($evictionQuery) {
                        $evictionQuery->where('status', 'scheduled');
                    });
                if ($request->has('min_price') && ! empty($request->min_price)) {
                    $q->where('monthly_rate', '>=', $request->min_price);
                }
                if ($request->has('max_price') && ! empty($request->max_price)) {
                    $q->where('monthly_rate', '<=', $request->max_price);
                }
            });
        }

        if ($request->boolean('availability')) {
            $query->whereHas('rooms', function ($q) use ($excludeTenantBookedRooms) {
                $excludeTenantBookedRooms($q);
                $q->where('status', 'available')
                    ->whereDoesntHave('evictionSchedules', function ($evictionQuery) {
                        $evictionQuery->where('status', 'scheduled');
                    });
            });
        }

        $amenities = $request->input('amenities', []);
        if (is_string($amenities)) {
            $amenities = array_filter(array_map('trim', explode(',', $amenities)));
        }
        if (is_array($amenities) && count($amenities) > 0) {
            $query->whereHas('amenities', function ($q) use ($amenities) {
                $q->whereIn('name', $amenities);
            });
        }

        if ($request->filled('min_rating')) {
            $minRating = (float) $request->input('min_rating');
            $query->whereRaw(
                '(select coalesce(avg(reviews.rating), 0) from reviews where reviews.property_id = properties.id and reviews.is_published = 1) >= ?',
                [$minRating]
            );
        }

        return $query->with([
            'rooms' => function ($q) use ($excludeTenantBookedRooms) {
                $excludeTenantBookedRooms($q);
                $q->with(['images', 'amenities']);
            },
            'images', 'landlord:id,first_name,last_name',
            'reviews' => function ($q) {
                $q->where('is_published', true);
            },
        ])
            ->when($tenantId, function ($q) use ($tenantId) {
                $q->withCount([
                    'bookings as normal_usage_count' => function ($sq) use ($tenantId) {
                        $sq->where('tenant_id', $tenantId)
                            ->whereIn('status', ['pending', 'confirmed', 'active'])
                            ->where(function($ssq) {
                                $ssq->where('booking_mode', '!=', 'proxy')->orWhereNull('booking_mode');
                            });
                    },
                    'bookings as proxy_usage_count' => function ($sq) use ($tenantId) {
                        $sq->where('tenant_id', $tenantId)
                            ->whereIn('status', ['pending', 'confirmed', 'active'])
                            ->where('booking_mode', 'proxy');
                    }
                ]);
            })
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getPublicPropertyTypes(): array
    {
        $types = Property::query()
            ->where('is_published', true)
            ->where('is_available', true)
            ->whereNotNull('property_type')
            ->where('property_type', '!=', '')
            ->select('property_type', DB::raw('count(*) as total'))
            ->groupBy('property_type')
            ->orderBy('property_type')
            ->get();

        $grouped = [];
        foreach ($types as $row) {
            $rawValue = trim((string) $row->property_type);
            if ($rawValue === '') {
                continue;
            }

            $normalizedKey = strtolower(str_replace([' ', '_', '-'], '', $rawValue));
            $canonicalValue = $this->normalizePropertyTypeValue($rawValue);
            $count = (int) $row->total;

            if (! isset($grouped[$normalizedKey])) {
                $grouped[$normalizedKey] = [
                    'value' => $canonicalValue,
                    'label' => $this->formatPropertyTypeLabel($canonicalValue),
                    'count' => 0,
                ];
            }

            $grouped[$normalizedKey]['count'] += $count;
        }

        return array_values($grouped);
    }

    private function formatPropertyTypeLabel(string $value): string
    {
        $normalized = strtolower(str_replace([' ', '_', '-'], '', $value));

        return match ($normalized) {
            'dormitory' => 'Dormitory',
            'apartment' => 'Apartment',
            'boardinghouse' => 'Boarding House',
            'bedspacer' => 'Bed Spacer',
            default => (function () use ($value) {
                $spacedByCase = preg_replace('/(?<!^)[A-Z]/', ' $0', $value);
                $spacedByCase = $spacedByCase ?? $value;
                $spaced = str_replace(['_', '-'], ' ', $spacedByCase);
                $spaced = preg_replace('/\s+/', ' ', $spaced);
                $spaced = $spaced ?? $value;

                return ucwords(strtolower(trim($spaced)));
            })(),
        };
    }

    private function normalizePropertyTypeValue(string $value): string
    {
        $trimmed = trim($value);
        $normalized = strtolower(str_replace([' ', '_', '-'], '', $trimmed));

        return match ($normalized) {
            'dormitory' => 'dormitory',
            'apartment' => 'apartment',
            'boardinghouse' => 'boardingHouse',
            'bedspacer' => 'bedSpacer',
            default => $trimmed,
        };
    }

    private function assertCanCreatePropertyUnderSubscription(User $landlord): void
    {
        if ($landlord->role !== 'landlord') {
            return;
        }

        $usage = $this->subscriptionResolverService->getUsageSummary($landlord);

        if ((bool) ($usage['can_create_property'] ?? true)) {
            return;
        }

        $limit = $usage['properties_limit'];
        $limitLabel = $limit === null ? 'plan limits' : sprintf('%d-property plan limit', (int) $limit);

        throw ValidationException::withMessages([
            'subscription' => sprintf(
                'Property limit reached (%d/%s). Upgrade your subscription or reduce properties before creating a new listing.',
                (int) ($usage['properties_count'] ?? 0),
                $limit === null ? $limitLabel : (string) $limit
            ),
        ]);
    }

    public function safeSoftDeleteProperty(Property $property, bool $isLandlord): void
    {
        DB::transaction(function () use ($property, $isLandlord) {
            if ($isLandlord) {
                $activeBookings = $property->bookings()->whereIn('status', ['pending', 'confirmed'])->count();
                if ($activeBookings > 0) {
                    throw new \Exception('Cannot delete property with active bookings. Please cancel or complete all bookings first.');
                }
            }

            $property->delete();
        });
    }

    public function forceDeleteProperty(Property $property): void
    {
        DB::transaction(function () use ($property) {
            foreach ($property->images as $image) {
                Storage::delete($image->image_url);
            }

            foreach ($property->rooms as $room) {
                foreach ($room->images as $roomImage) {
                    Storage::delete($roomImage->image_url);
                }
            }

            $property->forceDelete();
        });
    }

    private function syncAmenities(Property $property, array $amenityNames): void
    {
        $amenityIds = [];
        foreach ($amenityNames as $amenityName) {
            if (! empty($amenityName)) {
                $amenity = \App\Models\Amenity::firstOrCreate(['name' => $amenityName]);
                $amenityIds[] = $amenity->id;
            }
        }
        $property->amenities()->sync($amenityIds);
    }

    private function handleFileUploads(Property $property, Request $request, bool $isUpdate = false): void
    {
        if ($request->hasFile('images')) {
            $manager = new ImageManager(new Driver);
            foreach ($request->file('images') as $index => $file) {
                $image = $manager->read($file->getRealPath());
                $image->scaleDown(width: 1920);
                $encoded = $image->toWebp(80);
                $filename = 'property_'.time().'_'.uniqid().'.webp';
                $path = 'property_images/'.$filename;
                Storage::put($path, (string) $encoded);
                PropertyImage::create([
                    'property_id' => $property->id,
                    'image_url' => $path,
                    'is_primary' => $isUpdate ? ($index === 0 && $property->images()->where('is_primary', true)->doesntExist()) : ($index === 0),
                    'display_order' => $property->images()->count() + $index,
                    'media_type' => 'image',
                ]);
            }
        }

        if ($request->hasFile('video')) {
            $this->deleteExistingVideos($property);
            $this->uploadVideo($property, $request->file('video'));
        }

        if ($isUpdate && ! $request->hasFile('video') && $request->boolean('delete_video')) {
            $this->deleteExistingVideos($property);
        }

        if ($request->hasFile('credentials')) {
            foreach ($request->file('credentials') as $file) {
                $path = $file->store('property_credentials');
                \App\Models\PropertyCredential::create([
                    'property_id' => $property->id,
                    'file_path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime' => $file->getClientMimeType(),
                ]);
            }
        }

        if ($isUpdate) {
            $this->handleDeletions($property, $request);
            $this->handlePrimaryImageUpdate($property, $request);
            $this->handleImageReordering($property, $request);
        }
    }

    private function deleteExistingVideos(Property $property): void
    {
        $existingVideos = $property->images()->where('media_type', 'video')->get();
        foreach ($existingVideos as $ev) {
            Storage::delete($ev->image_url);
            $ev->delete();
        }
    }

    private function uploadVideo(Property $property, $videoFile): void
    {
        // Check duration locally first to avoid remote S3 read timeout
        try {
            $duration = FFMpeg::fromDisk('local')->open($videoFile->getRealPath())->getDurationInSeconds();
            if ($duration > 45) {
                throw new \Exception('Video duration must not exceed 45 seconds.');
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Video duration check failed', [
                'property_id' => $property->id,
                'error' => $e->getMessage(),
            ]);
            throw new \Exception('Could not process video file: ' . $e->getMessage());
        }

        $path = $videoFile->store('property_videos');

        PropertyImage::create([
            'property_id' => $property->id,
            'image_url' => $path,
            'is_primary' => false,
            'display_order' => 99,
            'media_type' => 'video',
        ]);
    }

    private function handleDeletions(Property $property, Request $request): void
    {
        if ($request->has('deleted_credentials')) {
            $deletedIds = is_array($request->input('deleted_credentials')) ? $request->input('deleted_credentials') : [$request->input('deleted_credentials')];
            $credentials = \App\Models\PropertyCredential::where('property_id', $property->id)->whereIn('id', $deletedIds)->get();
            foreach ($credentials as $cred) {
                Storage::delete($cred->file_path);
                $cred->delete();
            }
        }

        if ($request->has('deleted_images')) {
            $deletedImageIds = is_array($request->input('deleted_images')) ? $request->input('deleted_images') : [$request->input('deleted_images')];
            if ($property->images()->count() - count($deletedImageIds) >= 1) {
                $images = PropertyImage::where('property_id', $property->id)->whereIn('id', $deletedImageIds)->get();
                foreach ($images as $image) {
                    Storage::delete($image->image_url);
                    $image->delete();
                }
            }
        }
    }

    private function handlePrimaryImageUpdate(Property $property, Request $request): void
    {
        if ($request->has('primary_image_id')) {
            $property->images()->update(['is_primary' => false]);
            PropertyImage::where('id', $request->input('primary_image_id'))
                ->where('property_id', $property->id)
                ->update(['is_primary' => true]);
        }
    }

    private function handleImageReordering(Property $property, Request $request): void
    {
        if ($request->has('image_order')) {
            $imageOrder = is_string($request->input('image_order')) ? json_decode($request->input('image_order'), true) : $request->input('image_order');
            if (is_array($imageOrder)) {
                foreach ($imageOrder as $orderItem) {
                    if (isset($orderItem['id'], $orderItem['display_order'])) {
                        PropertyImage::where('id', $orderItem['id'])
                            ->where('property_id', $property->id)
                            ->update(['display_order' => $orderItem['display_order']]);
                    }
                }
            }
        }
    }
}
