<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Http\Requests\StorePropertyRequest;
use App\Http\Requests\UpdatePropertyRequest;
use App\Http\Resources\PropertyResource;
use App\Http\Resources\RoomResource;
use App\Models\Booking;
use App\Models\MaintenanceRequest;
use App\Models\Property;
use App\Models\Review;
use App\Models\Room;
use App\Services\PropertyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class PropertyController extends Controller
{
    use ResolvesLandlordAccess;

    protected PropertyService $propertyService;

    public function __construct(PropertyService $propertyService)
    {
        $this->propertyService = $propertyService;
    }

    public function getStats(Request $request, $propertyId)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'addons' => 0,
                'maintenance' => 0,
                'activity' => 0, // Placeholder
                'reviews' => Review::where('property_id', $propertyId)->where('is_published', true)->count(),
            ]);
        }

        // Find an active or recent booking for this tenant at this property
        $booking = Booking::where('tenant_id', $user->id)
            ->where('property_id', $propertyId)
            ->whereIn('status', ['confirmed', 'completed']) // Active or recently completed
            ->orderBy('start_date', 'desc')
            ->first();

        $stats = [
            'addons' => 0,
            'maintenance' => 0,
            'activity' => 0, // Placeholder as per analysis
            'reviews' => Review::where('property_id', $propertyId)->where('is_published', true)->count(),
        ];

        if ($booking) {
            // Count pending/active addon requests for this booking
            $stats['addons'] = $booking->addons()->wherePivotIn('status', ['pending', 'approved', 'active'])->count();

            // Count open maintenance requests for this property by this tenant
            $stats['maintenance'] = MaintenanceRequest::where('property_id', $propertyId)
                ->where('tenant_id', $user->id)
                ->whereIn('status', ['pending', 'in_progress'])
                ->count();
        }

        return response()->json($stats);
    }

    // ====================================================================
    // PUBLIC ROUTES
    // ====================================================================

    public function getAllProperties(Request $request)
    {
        try {
            $properties = $this->propertyService->getPublicProperties($request);

            return response()->json(PropertyResource::collection($properties)->resolve());
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch properties', 'error' => $e->getMessage()], 500);
        }
    }

    public function getPropertyDetails($id)
    {
        try {
            $tenantId = Auth::id();
            $blockedStatuses = ['pending', 'confirmed', 'active', 'completed', 'partial-completed'];
            $roomEagerLoads = ['amenities', 'images'];
            if ($tenantId) {
                $roomEagerLoads['bookings'] = function ($bq) use ($tenantId) {
                    $bq->where('tenant_id', $tenantId)
                        ->whereIn('status', ['pending', 'confirmed'])
                        ->select(['id', 'room_id', 'tenant_id', 'status', 'start_date', 'end_date']);
                };
            }

            $property = Property::where('is_published', true)
                ->where('is_available', true)
                ->with([
                    'amenities',
                    'rooms' => function ($q) use ($roomEagerLoads, $tenantId, $blockedStatuses) {
                        if ($tenantId) {
                            $q->whereDoesntHave('bookings', function ($bq) use ($tenantId, $blockedStatuses) {
                                $bq->where('tenant_id', $tenantId)
                                    ->whereIn('status', $blockedStatuses);
                            });
                        }

                        $q->with($roomEagerLoads);
                    },
                    'images', 'landlord:id,first_name,last_name,email,phone,payment_methods_settings',
                    'reviews' => function ($q) {
                        $q->where('is_published', true);
                    },
                ])
                ->findOrFail($id);

            return response()->json((new PropertyResource($property))->resolve());
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Property not found or not available'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    // ====================================================================
    // PROTECTED ROUTES
    // ====================================================================

    public function getAccessibleProperties(Request $request)
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_view_properties');

        if ($context['is_caretaker']) {
            $assignment = $context['assignment'];
            $propertyIds = $assignment->properties()->pluck('properties.id')->toArray();
            $properties = Property::whereIn('id', $propertyIds);
        } else {
            $properties = Property::where('landlord_id', $context['landlord_id']);
        }

        $data = $properties->withCount(['rooms', 'rooms as available_rooms_count' => fn ($q) => $q->where('status', 'available')])
            ->with(['images', 'amenities', 'credentials', 'rooms'])
            ->orderBy('created_at', 'desc')
            ->get();

        // Use the resource for consistent output, but manually map since it's a specific query
        $formattedData = $data->map(function ($property) {
            $propertyArray = (new PropertyResource($property))->resolve();
            // Add credentials back in for the landlord view
            if ($property->relationLoaded('credentials')) {
                $propertyArray['credentials'] = $property->credentials->map(function ($c) {
                    return ['id' => $c->id, 'file_url' => asset('storage/'.$c->file_path), 'original_name' => $c->original_name];
                })->toArray();
            }

            return $propertyArray;
        });

        return response()->json($formattedData, 200);
    }

    public function index(Request $request)
    {
        return $this->getAccessibleProperties($request);
    }

    public function store(StorePropertyRequest $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->assertNotCaretaker($context);

            if ($request->boolean('require_reservation_fee')) {
                $isPaymongoReady = $context['user']->paymongo_child_id && $context['user']->paymongo_verification_status === 'verified';
                if (! $isPaymongoReady) {
                    return response()->json(['message' => 'You must complete PayMongo onboarding to require reservation fees.', 'verification_required' => true], 403);
                }
            }

            $property = $this->propertyService->createProperty($request->validated(), $context['user']);

            return response()->json((new PropertyResource($property->load(['images', 'amenities', 'credentials', 'rooms'])))->resolve());
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create property', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_view_properties');
        $this->checkPropertyAccess($context, (int) $id);

        $property = Property::with(['rooms', 'images', 'amenities', 'credentials'])
            ->findOrFail($id);

        return response()->json((new PropertyResource($property))->resolve());
    }

    public function update(UpdatePropertyRequest $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->assertNotCaretaker($context);
            $property = Property::where('landlord_id', $context['landlord_id'])->findOrFail($id);

            if ($request->boolean('require_reservation_fee')) {
                $isPaymongoReady = $context['user']->paymongo_child_id && $context['user']->paymongo_verification_status === 'verified';
                if (! $isPaymongoReady) {
                    return response()->json(['message' => 'You must complete PayMongo onboarding to require reservation fees.', 'verification_required' => true], 403);
                }
            }

            if (! $context['user']->is_verified) {
                if ($request->has('current_status') && $request->current_status !== 'draft') {
                    return response()->json(['message' => 'Your account is pending verification. Properties can only be saved as drafts.', 'verification_required' => true], 403);
                }
                if ($request->has('is_published') && $request->boolean('is_published')) {
                    return response()->json(['message' => 'Your account is pending verification. You cannot publish properties.', 'verification_required' => true], 403);
                }
            }

            $property = $this->propertyService->updateProperty($property, $request->validated(), $request);

            return response()->json((new PropertyResource($property->load(['images', 'amenities', 'credentials', 'rooms'])))->resolve());
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update property', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->assertNotCaretaker($context);

            if ($request->has('password')) {
                if (! Hash::check($request->password, $context['user']->password)) {
                    return response()->json(['message' => 'Incorrect password.', 'error' => 'password_incorrect'], 422);
                }
            } else {
                return response()->json(['message' => 'Password is required for deletion.'], 422);
            }

            $property = Property::where('landlord_id', $context['landlord_id'])->findOrFail($id);
            $this->propertyService->deleteProperty($property);

            return response()->json(['message' => 'Property and all associated rooms deleted successfully'], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Property not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete property', 'error' => $e->getMessage()], 500);
        }
    }

    public function verifyPassword(Request $request)
    {
        $context = $this->resolveLandlordContext($request);
        $this->assertNotCaretaker($context);
        $request->validate(['password' => 'required|string']);
        if (! Hash::check($request->password, $context['user']->password)) {
            return response()->json(['message' => 'Incorrect password', 'verified' => false], 422);
        }

        return response()->json(['message' => 'Password verified', 'verified' => true], 200);
    }

    public function getRoomDetails($roomId)
    {
        $room = Room::with([
            'property' => function ($query) {
                $query->select('id', 'landlord_id', 'title', 'address', 'city')
                    ->with('landlord:id,first_name,last_name,email,phone,payment_methods_settings');
            }, 'images', 'amenities',
        ])->findOrFail($roomId);

        return new RoomResource($room);
    }

    public function addAmenity(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $this->assertNotCaretaker($context);
        $request->validate(['amenity' => 'required|string|max:255']);
        $property = Property::where('landlord_id', $context['landlord_id'])->findOrFail($id);
        $amenity = \App\Models\Amenity::firstOrCreate(['name' => trim($request->amenity)]);
        if (! $property->amenities->contains($amenity->id)) {
            $property->amenities()->attach($amenity->id);
        }

        return response()->json(['message' => 'Amenity added successfully', 'amenity' => $amenity->name], 200);
    }

    public function addRule(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $this->assertNotCaretaker($context);
        $request->validate(['rule' => 'required|string|max:255']);
        $property = Property::where('landlord_id', $context['landlord_id'])->findOrFail($id);
        $rules = $property->property_rules ?? [];
        $newRule = trim($request->rule);
        if (! in_array($newRule, $rules)) {
            $rules[] = $newRule;
            $property->property_rules = $rules;
            $property->save();
        }

        return response()->json(['message' => 'Rule added successfully', 'rule' => $newRule, 'rules' => $rules], 200);
    }
}
