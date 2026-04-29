<?php

namespace App\Services;

use App\Models\Amenity;
use App\Models\Booking;
use App\Models\Property;
use App\Models\Room;
use App\Models\RoomImage;
use App\Models\User;
use App\Services\Subscription\SubscriptionResolverService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class RoomService
{
    public function __construct(private readonly SubscriptionResolverService $subscriptionResolverService) {}

    /**
     * Create a new room.
     */
    public function createRoom(array $validatedData, Property $property): Room
    {
        return DB::transaction(function () use ($validatedData, $property) {
            $this->assertCanCreateRoomUnderSubscription($property);

            $this->validateRoomTypeForProperty($property, $validatedData['room_type'] ?? null);

            if ($this->isRoomNumberDuplicate($validatedData['room_number'], $property->id)) {
                throw ValidationException::withMessages(['room_number' => 'Room number already exists for this property.']);
            }

            $capacity = $validatedData['capacity'] ?? 1;
            $pricingModel = $validatedData['pricing_model'] ?? (($validatedData['room_type'] === 'bedSpacer') ? 'per_bed' : 'full_room');
            $durationPricing = array_key_exists('duration_pricing', $validatedData)
                ? Room::sanitizeDurationPricing($validatedData['duration_pricing'])
                : [];

            $propertySex = strtolower($property->sex_restriction ?? 'mixed');
            $defaultSex = in_array($propertySex, ['male', 'female', 'boys', 'girls'])
                ? (in_array($propertySex, ['male', 'boys']) ? 'male' : 'female')
                : 'mixed';

            $room = Room::create([
                'property_id' => $property->id,
                'room_number' => $validatedData['room_number'],
                'room_type' => $validatedData['room_type'],
                'sex_restriction' => $validatedData['sex_restriction'] ?? $defaultSex,
                'floor' => $validatedData['floor'],
                'monthly_rate' => $validatedData['monthly_rate'] ?? null,
                'daily_rate' => $validatedData['daily_rate'] ?? null,
                'billing_policy' => $validatedData['billing_policy'] ?? 'monthly',
                'min_stay_days' => $validatedData['min_stay_days'] ?? 1,
                'capacity' => $capacity,
                'pricing_model' => $pricingModel,
                'status' => $validatedData['status'] ?? 'available',
                'require_1month_advance' => $validatedData['require_1month_advance'] ?? false,
                'description' => $validatedData['description'] ?? null,
                'rules' => $validatedData['rules'] ?? [],
                'duration_pricing' => $durationPricing,
            ]);

            $this->syncAmenities($room, $validatedData['amenities'] ?? []);
            $this->handleImageUploads(app('request'), $room);

            $property->updateTotalRooms();
            $property->updateAvailableRooms();

            return $room;
        });
    }

    /**
     * Update an existing room.
     */
    public function updateRoom(Room $room, array $validatedData): Room
    {
        return DB::transaction(function () use ($room, $validatedData) {
            if (isset($validatedData['room_type'])) {
                $this->validateRoomTypeForProperty($room->property, $validatedData['room_type']);
            }

            if (isset($validatedData['room_number']) && $validatedData['room_number'] !== $room->room_number) {
                if ($this->isRoomNumberDuplicate($validatedData['room_number'], $room->property_id, $room->id)) {
                    throw ValidationException::withMessages(['room_number' => 'Room number already exists for this property.']);
                }
            }

            if (array_key_exists('duration_pricing', $validatedData)) {
                $validatedData['duration_pricing'] = Room::sanitizeDurationPricing($validatedData['duration_pricing']);
            }

            $oldStatus = $room->status;
            $room->update($validatedData);

            if (array_key_exists('rules', $validatedData)) {
                $room->update(['rules' => $validatedData['rules']]);
            }

            if (array_key_exists('amenities', $validatedData)) {
                $this->syncAmenities($room, $validatedData['amenities']);
            }

            if (!empty($validatedData['delete_images'])) {
                foreach ($validatedData['delete_images'] as $imageId) {
                    $image = $room->images()->find($imageId);
                    if ($image) {
                        $filename = basename($image->image_url);
                        Storage::delete('room_images/'.$filename);
                        $image->delete();
                    }
                }
            }

            if (isset($validatedData['images'])) {
                $this->handleImageUploads(app('request'), $room);
            }

            if (isset($validatedData['status']) && $validatedData['status'] !== $oldStatus) {
                $room->property->updateAvailableRooms();
            }

            return $room;
        });
    }

    /**
     * Delete a room.
     */
    public function deleteRoom(Room $room): void
    {
        if (Booking::where('room_id', $room->id)->exists()) {
            throw new \Exception('Cannot delete room with existing bookings. Please cancel or complete all bookings first.');
        }

        if ($room->occupied > 0) {
            throw new \Exception('Cannot delete room with active tenants. Please remove all tenants first.');
        }

        DB::transaction(function () use ($room) {
            $property = $room->property;

            $room->amenities()->detach();
            foreach ($room->images as $image) {
                $filename = basename($image->image_url);
                Storage::delete('room_images/'.$filename);
                $image->delete();
            }
            DB::table('room_tenant_assignments')->where('room_id', $room->id)->delete();

            $room->delete();

            $property->updateTotalRooms();
            $property->updateAvailableRooms();
        });
    }

    /**
     * Update a room's status.
     */
    public function updateStatus(Room $room, string $status): Room
    {
        // Room status updates should not mutate tenant assignments.
        // Previous behavior called removeTenant() when setting available,
        // which could trigger unintended side effects and 500 errors.
        $updatePayload = ['status' => $status];

        if ($status === 'available') {
            $hasActiveTenants = $room->tenants()
                ->wherePivot('status', 'active')
                ->exists();

            if (! $hasActiveTenants) {
                $updatePayload['current_tenant_id'] = null;
            }
        }

        $room->update($updatePayload);

        $room->property->updateAvailableRooms();
        broadcast(new \App\Events\RoomAvailabilityUpdated($room))->toOthers();

        return $room->load('tenants');
    }

    /**
     * Assign a tenant to a room.
     */
    public function assignTenant(Room $room, int $tenantId, ?string $startDate = null, $bedCount = 1, ?string $bedNumbers = null): Room
    {
        return DB::transaction(function () use ($room, $tenantId, $startDate, $bedCount, $bedNumbers) {
            $room->assignTenant($tenantId, $startDate, $bedCount, $bedNumbers);

            return $room->load('tenants');
        });
    }

    /**
     * Remove a tenant from a room.
     */
    public function removeTenant(Room $room, ?int $tenantId = null): Room
    {
        return DB::transaction(function () use ($room, $tenantId) {
            $room->removeTenant($tenantId);

            return $room->load('tenants');
        });
    }

    /**
     * Extend a tenant's stay manually.
     */
    public function extendStay(Room $room, int $tenantId, string $type, int $value): array
    {
        return DB::transaction(function () use ($room, $tenantId, $type, $value) {
            // 1. Find active booking
            $booking = Booking::where('room_id', $room->id)
                ->where('tenant_id', $tenantId)
                ->whereIn('status', ['confirmed', 'active'])
                ->orderBy('end_date', 'desc')
                ->first();

            if (! $booking) {
                throw new \Exception('No active booking found for this tenant in this room.');
            }

            if (($booking->contract_mode ?? 'monthly') === 'monthly' && ! $booking->end_date) {
                throw new \Exception('Open-ended monthly stay does not need extension. Ask the tenant to submit a move-out notice when needed.');
            }

            if (! $booking->end_date) {
                throw new \Exception('Cannot extend a stay without an existing move-out date.');
            }

            $currentEnd = \Carbon\Carbon::parse($booking->end_date);
            $newEnd = $currentEnd->copy();

            if ($type === 'monthly') {
                $newEnd->addMonths($value);
                $priceResult = $room->calculatePriceForPeriod($currentEnd, $newEnd);
            } else {
                $newEnd->addDays($value);
                $priceResult = $room->calculatePriceForDays($value);
            }

            // 1.5. OVERLAP GUARD: Check for future bookings that might conflict with this extension
            $conflict = Booking::where('room_id', $room->id)
                ->where('id', '!=', $booking->id) // Not this booking
                ->whereIn('status', ['reserved', 'confirmed', 'active'])
                ->where('start_date', '<', $newEnd->format('Y-m-d'))
                ->where('start_date', '>=', $currentEnd->format('Y-m-d'))
                ->with('tenant')
                ->first();

            if ($conflict) {
                $conflictingTenant = $conflict->tenant ? ($conflict->tenant->first_name . ' ' . $conflict->tenant->last_name) : 'another tenant';
                throw new \Exception("Cannot extend stay. Room {$room->room_number} is already reserved by {$conflictingTenant} starting on " . \Carbon\Carbon::parse($conflict->start_date)->format('M d, Y') . ".");
            }

            $extensionAmount = $priceResult['total'] * ($booking->bed_count ?? 1);

            // 2. Update Booking
            $booking->end_date = $newEnd->format('Y-m-d');
            if ($type === 'monthly') {
                $booking->total_months += $value;
            }
            $booking->total_amount += $extensionAmount;
            $booking->save();

            // 3. Create Invoice for the extension
            $reference = 'INV-EXT-MAN-'.date('Ymd').'-'.strtoupper(\Illuminate\Support\Str::random(6));
            $invoice = \App\Models\Invoice::create([
                'reference' => $reference,
                'landlord_id' => $room->property->landlord_id,
                'property_id' => $room->property_id,
                'booking_id' => $booking->id,
                'tenant_id' => $tenantId,
                'description' => "Stay Extension (+{$value} ".($type === 'monthly' ? 'month' : 'day')."(s)) for Room {$room->room_number}",
                'amount_cents' => (int) round($extensionAmount * 100),
                'currency' => 'PHP',
                'status' => 'pending',
                'issued_at' => now(),
                'due_date' => now()->addDays(3),
                'metadata' => [
                    'extension_type' => $type,
                    'extension_value' => $value,
                    'previous_end_date' => $currentEnd->format('Y-m-d'),
                    'new_end_date' => $newEnd->format('Y-m-d'),
                ],
            ]);

            return [
                'booking' => $booking,
                'invoice' => $invoice,
                'new_end_date' => $booking->end_date,
                'extension_amount' => $extensionAmount,
            ];
        });
    }

    // --- Private Helper Methods ---

    private function validateRoomTypeForProperty(Property $property, ?string $roomType): void
    {
        $propertyType = $this->normalizePropertyTypeToken($property->property_type ?? '');

        if ($roomType === 'bedSpacer' && $propertyType === 'apartment') {
            throw ValidationException::withMessages(['room_type' => 'Apartment properties cannot have Bed Spacer room type.']);
        }
    }

    private function normalizePropertyTypeToken(?string $propertyType): string
    {
        return strtolower(str_replace([' ', '_', '-'], '', (string) $propertyType));
    }

    private function assertCanCreateRoomUnderSubscription(Property $property): void
    {
        /** @var User|null $landlord */
        $landlord = $property->relationLoaded('landlord')
            ? $property->landlord
            : $property->landlord()->first();

        if (! $landlord) {
            throw ValidationException::withMessages([
                'subscription' => 'Unable to resolve landlord subscription context for this property.',
            ]);
        }

        $usage = $this->subscriptionResolverService->getUsageSummary($landlord);

        if ((bool) ($usage['can_create_room'] ?? true)) {
            return;
        }

        $limit = $usage['rooms_limit'];

        throw ValidationException::withMessages([
            'subscription' => sprintf(
                'Room limit reached (%d/%s). Upgrade your subscription or remove rooms before adding another one.',
                (int) ($usage['rooms_count'] ?? 0),
                $limit === null ? 'plan limits' : (string) $limit
            ),
        ]);
    }

    private function isRoomNumberDuplicate(string $roomNumber, int $propertyId, ?int $excludeRoomId = null): bool
    {
        $query = Room::where('property_id', $propertyId)->where('room_number', $roomNumber);
        if ($excludeRoomId) {
            $query->where('id', '!=', $excludeRoomId);
        }

        return $query->exists();
    }

    private function syncAmenities(Room $room, array $amenityNames): void
    {
        $amenityIds = [];
        foreach ($amenityNames as $amenityName) {
            $amenity = Amenity::firstOrCreate(['name' => trim($amenityName)]);
            $amenityIds[] = $amenity->id;
        }
        $room->amenities()->sync($amenityIds);
    }

    private function handleImageUploads(Request $request, Room $room): void
    {
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                // Store image directly without processing to save CPU
                $path = $file->store('room_images');
                
                RoomImage::create([
                    'room_id' => $room->id,
                    'image_url' => Storage::url($path),
                ]);
            }
        }
    }

    private function syncImagesFromUrls(Room $room, array $imageUrls): void
    {
        $room->images()->delete();
        foreach ($imageUrls as $imageUrl) {
            RoomImage::create([
                'room_id' => $room->id,
                'image_url' => $imageUrl,
            ]);
        }
    }
}
