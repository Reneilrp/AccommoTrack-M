<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesLandlordAccess;
use Illuminate\Http\Request;
use App\Models\Room;
use App\Models\Property;
use App\Models\Amenity;
use App\Models\RoomImage;
use App\Models\Booking;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class RoomController extends Controller
{
    use ResolvesLandlordAccess;

    /**
     * Get all rooms for a specific property
     */
    public function index(Request $request, $propertyId = null)
    {
        try {
            // Handle both route parameter and query parameter
            $propertyId = $propertyId ?? $request->query('property_id');

            if (!$propertyId) {
                return response()->json([
                    'message' => 'Property ID is required'
                ], 400);
            }

            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_rooms');

            // Verify property belongs to landlord (or caretaker has access)
            $propertyQuery = Property::where('landlord_id', $context['landlord_id'])
                ->where('id', $propertyId);

            // If caretaker, also verify they have access to this property
            if ($context['is_caretaker'] && $context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
                $propertyQuery->whereIn('id', $assignedPropertyIds);
            }

            $property = $propertyQuery->firstOrFail();

            $rooms = Room::where('property_id', $propertyId)
                ->with('currentTenant:id,first_name,last_name', 'amenities', 'images')
                ->orderBy('room_number')
                ->get()
                ->map(function ($room) {
                    return $this->formatRoomResponse($room);
                });

            return response()->json($rooms, 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Property not found or access denied'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch rooms',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new room
     */
    public function store(Request $request)
    {
        DB::beginTransaction();

        try {
            $validated = $request->validate([
                'property_id' => 'required|exists:properties,id',
                'room_number' => 'required|string|max:50',
                'room_type' => 'required|in:single,double,quad,bedSpacer',
                'floor' => 'required|integer|min:1',
                'monthly_rate' => 'required_if:billing_policy,monthly,monthly_with_daily|numeric|min:0',
                'daily_rate' => 'required_if:billing_policy,daily,monthly_with_daily|numeric|min:0',
                'billing_policy' => 'nullable|string|in:monthly,monthly_with_daily,daily',
                'min_stay_days' => 'nullable|integer|min:1',
                'prorate_base' => 'nullable|integer|min:1',
                // Capacity is required only for bedSpacer rooms
                'capacity' => 'required_if:room_type,bedSpacer|integer|min:1',
                'pricing_model' => 'sometimes|in:full_room,per_bed',
                'status' => 'sometimes|in:available,occupied,maintenance',
                'current_tenant_id' => 'nullable|exists:users,id',
                'description' => 'nullable|string',
                'amenities' => 'nullable|array',
                'amenities.*' => 'string',
                'images' => 'nullable|array|max:10',
                'images.*' => 'image|mimes:jpeg,png,jpg|max:10240'
            ]);

            // Verify property belongs to authenticated landlord and fetch property
            $property = Property::where('id', $validated['property_id'])
                ->where('landlord_id', Auth::id())
                ->firstOrFail();

            $ptype = strtolower($property->property_type ?? '');

            // Apartments must not use bedSpacer room type
            if (str_contains($ptype, 'apartment') && isset($validated['room_type']) && $validated['room_type'] === 'bedSpacer') {
                return response()->json([
                    'message' => 'Invalid room type for apartment properties',
                    'errors' => ['room_type' => ['Apartment properties cannot have Bed Spacer room type']]
                ], 422);
            }

            // property already fetched above

            // Check if room number already exists for this property
            $existingRoom = Room::where('property_id', $validated['property_id'])
                ->where('room_number', $validated['room_number'])
                ->first();

            if ($existingRoom) {
                return response()->json([
                    'message' => 'Room number already exists for this property'
                ], 422);
            }

            // Ensure capacity has a sensible default when not provided (e.g., apartments)
            $capacityValue = $validated['capacity'] ?? 1;
            // Enforce per_bed pricing model for bedSpacer rooms
            $pricingModelValue = $validated['pricing_model'] ?? (($validated['room_type'] === 'bedSpacer') ? 'per_bed' : 'full_room');

            $room = Room::create([
                'property_id' => $validated['property_id'],
                'room_number' => $validated['room_number'],
                'room_type' => $validated['room_type'],
                'floor' => $validated['floor'],
                'monthly_rate' => $validated['monthly_rate'] ?? null,
                'daily_rate' => $validated['daily_rate'] ?? null,
                'billing_policy' => $validated['billing_policy'] ?? 'monthly',
                'min_stay_days' => $validated['min_stay_days'] ?? null,
                'prorate_base' => $validated['prorate_base'] ?? null,
                'capacity' => $capacityValue,
                'pricing_model' => $pricingModelValue,
                'status' => $validated['status'] ?? 'available',
                'current_tenant_id' => $validated['current_tenant_id'] ?? null,
                'description' => $validated['description'] ?? null
            ]);

            // Handle amenities if provided
            if (!empty($validated['amenities']) && is_array($validated['amenities'])) {
                $amenityIds = [];
                foreach ($validated['amenities'] as $amenityName) {
                    $amenity = Amenity::firstOrCreate(['name' => $amenityName]);
                    $amenityIds[] = $amenity->id;
                }
                $room->amenities()->attach($amenityIds);
            }

            // Handle image uploads if provided
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $file) {
                    $path = $file->store('room_images', 'public');  // Store in public disk
                    RoomImage::create([
                        'room_id' => $room->id,
                        'image_url' => Storage::url($path),  // Get public URL
                    ]);
                }
            }

            // Update property room counts
            $property->updateTotalRooms();
            $property->updateAvailableRooms();

            DB::commit();

            return response()->json($this->formatRoomResponse($room->fresh()), 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Property not found or unauthorized'
            ], 404);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Failed to create room',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a room
     */
    public function update(Request $request, $id)
    {
        DB::beginTransaction();

        try {
            $room = Room::findOrFail($id);

            // Verify room's property belongs to authenticated landlord
            if ($room->property->landlord_id !== Auth::id()) {
                return response()->json([
                    'message' => 'Unauthorized access'
                ], 403);
            }

            $validated = $request->validate([
                'room_number' => 'sometimes|string|max:50',
                'room_type' => 'sometimes|in:single,double,quad,bedSpacer',
                'floor' => 'sometimes|integer|min:1',
                'monthly_rate' => 'sometimes|required_if:billing_policy,monthly,monthly_with_daily|numeric|min:0',
                'daily_rate' => 'sometimes|required_if:billing_policy,daily,monthly_with_daily|numeric|min:0',
                'billing_policy' => 'nullable|string|in:monthly,monthly_with_daily,daily',
                'min_stay_days' => 'nullable|integer|min:1',
                'prorate_base' => 'nullable|integer|min:1',
                'capacity' => 'sometimes|integer|min:1',
                'pricing_model' => 'sometimes|in:full_room,per_bed',
                'status' => 'sometimes|in:available,occupied,maintenance',
                'current_tenant_id' => 'nullable|exists:users,id',
                'description' => 'nullable|string',
                'amenities' => 'nullable|array',
                'amenities.*' => 'string',
                'images' => 'nullable|array',
                'images.*' => 'string|url',
            ]);

            // If room number is being changed, check uniqueness
            if (isset($validated['room_number']) && $validated['room_number'] !== $room->room_number) {
                $existingRoom = Room::where('property_id', $room->property_id)
                    ->where('room_number', $validated['room_number'])
                    ->where('id', '!=', $id)
                    ->first();

                if ($existingRoom) {
                    return response()->json([
                        'message' => 'Room number already exists for this property'
                    ], 422);
                }
            }

            $oldStatus = $room->status;
            // Additional checks based on property type and room_type changes
            $ptype = strtolower($room->property->property_type ?? '');
            if (isset($validated['room_type']) && $validated['room_type'] === 'bedSpacer') {
                // Ensure property is allowed to have bedSpacer
                if (str_contains($ptype, 'apartment')) {
                    return response()->json([
                        'message' => 'Invalid room type for apartment properties'
                    ], 422);
                }
                // Ensure capacity is provided either in update payload or existing room has capacity
                if (!isset($validated['capacity']) && (!$room->capacity || $room->capacity < 1)) {
                    return response()->json([
                        'message' => 'Validation failed',
                        'errors' => ['capacity' => ['Capacity is required when room_type is bedSpacer']]
                    ], 422);
                }
            }

            $room->update($validated);

            // Handle amenities if provided
            if (array_key_exists('amenities', $validated)) {
                $room->amenities()->detach();

                if (!empty($validated['amenities']) && is_array($validated['amenities'])) {
                    $amenityIds = [];
                    foreach ($validated['amenities'] as $amenityName) {
                        $amenity = Amenity::firstOrCreate(['name' => $amenityName]);
                        $amenityIds[] = $amenity->id;
                    }
                    $room->amenities()->attach($amenityIds);
                }
            }

            // Handle images if provided
            if (isset($validated['images'])) {
                // Delete existing images
                RoomImage::where('room_id', $room->id)->delete();

                // Add new images
                foreach ($validated['images'] as $imageUrl) {
                    RoomImage::create([
                        'room_id' => $room->id,
                        'image_url' => $imageUrl,
                    ]);
                }
            }

            // Update property room counts if status changed
            if (isset($validated['status']) && $validated['status'] !== $oldStatus) {
                $room->property->updateAvailableRooms();
            }

            DB::commit();

            $room->load('currentTenant:id,first_name,last_name', 'amenities', 'images');

            return response()->json($this->formatRoomResponse($room), 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Room not found'
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update room',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a room
     */
    public function destroy($id)
    {
        DB::beginTransaction();

        try {
            $room = Room::findOrFail($id);

            // Verify room's property belongs to authenticated landlord
            if ($room->property->landlord_id !== Auth::id()) {
                return response()->json([
                    'message' => 'Unauthorized access'
                ], 403);
            }

            // Check if room has any bookings
            $hasBookings = Booking::where('room_id', $id)->exists();
            if ($hasBookings) {
                return response()->json([
                    'message' => 'Cannot delete room with existing bookings. Please cancel or complete all bookings first.'
                ], 422);
            }

            // Check if room has active tenants
            if ($room->occupied > 0) {
                return response()->json([
                    'message' => 'Cannot delete room with active tenants. Please remove all tenants first.'
                ], 422);
            }

            $property = $room->property;

            // Delete related amenities and images
            $room->amenities()->detach();
            RoomImage::where('room_id', $room->id)->delete();

            // Delete tenant assignments
            DB::table('room_tenant_assignments')->where('room_id', $room->id)->delete();

            $room->delete();

            // Update property room counts
            $property->updateTotalRooms();
            $property->updateAvailableRooms();

            DB::commit();

            return response()->json([
                'message' => 'Room deleted successfully'
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Room not found'
            ], 404);
        } catch (\Illuminate\Database\QueryException $e) {
            DB::rollBack();
            // Check for foreign key constraint violation
            if (str_contains($e->getMessage(), 'foreign key constraint')) {
                return response()->json([
                    'message' => 'Cannot delete room. It has related records (bookings, payments, etc.) that must be removed first.'
                ], 422);
            }
            return response()->json([
                'message' => 'Failed to delete room',
                'error' => $e->getMessage()
            ], 500);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to delete room',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update room status
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_rooms');

            $room = Room::findOrFail($id);

            // Verify room's property belongs to landlord
            if ($room->property->landlord_id !== $context['landlord_id']) {
                return response()->json([
                    'message' => 'Unauthorized access'
                ], 403);
            }

            // If caretaker, verify they have access to this property
            if ($context['is_caretaker'] && $context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
                if (!in_array($room->property_id, $assignedPropertyIds)) {
                    return response()->json([
                        'message' => 'Unauthorized access to this property'
                    ], 403);
                }
            }

            $validated = $request->validate([
                'status' => 'required|in:available,occupied,maintenance'
            ]);

            // Handle status changes
            if ($validated['status'] === 'available') {
                // Remove all tenants from room
                $room->removeTenant();
            } elseif ($validated['status'] === 'maintenance') {
                // Set to maintenance (tenants can stay but no new bookings)
                $room->update(['status' => 'maintenance']);
            } else {
                // For 'occupied', just update status (tenants managed separately)
                $room->update(['status' => $validated['status']]);
            }

            // Update property available rooms count
            $room->property->updateAvailableRooms();

            $room->load('currentTenant:id,first_name,last_name');

            return response()->json([
                'id' => $room->id,
                'room_number' => $room->room_number,
                'status' => $room->status,
                'tenant' => $room->currentTenant
                    ? $room->currentTenant->first_name . ' ' . $room->currentTenant->last_name
                    : null
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Room not found'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update room status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get room statistics for a property
     */
    public function getStats(Request $request, $propertyId)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_rooms');

            // Verify property belongs to landlord (or caretaker has access)
            $propertyQuery = Property::where('landlord_id', $context['landlord_id'])
                ->where('id', $propertyId);

            // If caretaker, also verify they have access to this property
            if ($context['is_caretaker'] && $context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
                $propertyQuery->whereIn('id', $assignedPropertyIds);
            }

            $property = $propertyQuery->firstOrFail();

            $total = Room::where('property_id', $propertyId)->count();
            $occupied = Room::where('property_id', $propertyId)->where('status', 'occupied')->count();
            $maintenance = Room::where('property_id', $propertyId)->where('status', 'maintenance')->count();
            $available = Room::where('property_id', $propertyId)->where('status', 'available')->count();

            return response()->json([
                'total' => $total,
                'occupied' => $occupied,
                'available' => $available,
                'maintenance' => $maintenance
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Property not found or access denied'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch room stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Format room response for consistency
     * Single source of truth for room data structure
     */
    private function formatRoomResponse($room)
    {
        return [
            'id' => $room->id,
            'room_number' => $room->room_number,
            'room_type' => $room->room_type,
            'type_label' => $this->getRoomTypeLabel($room->room_type),
            'floor' => $room->floor,
            'floor_label' => $this->formatFloor($room->floor),
            'monthly_rate' => (float) $room->monthly_rate,
            'daily_rate' => isset($room->daily_rate) ? (float) $room->daily_rate : null,
            'billing_policy' => $room->billing_policy ?? 'monthly',
            'min_stay_days' => isset($room->min_stay_days) ? (int) $room->min_stay_days : null,
            'prorate_base' => isset($room->prorate_base) ? (int) $room->prorate_base : 30,
            'capacity' => $room->capacity,
                'pricing_model' => $room->pricing_model ?? 'full_room',
                'payment' => method_exists($room, 'getPaymentDisplay') ? $room->getPaymentDisplay() : null,
            'occupied' => $room->occupied,
            'status' => $room->status,
            'current_tenant_id' => $room->current_tenant_id,
            'tenant' => $room->tenant,
            'available_slots' => $room->available_slots,
            'description' => $room->description,
            'amenities' => $room->amenities ? $room->amenities->pluck('name')->toArray() : [],
            'images' => $room->images ? $room->images->pluck('image_url')->toArray() : [],
            'created_at' => $room->created_at,
            'updated_at' => $room->updated_at
        ];
    }

    /**
     * Helper function to format floor number
     */
    private function formatFloor($floor)
    {
        $suffix = 'th';
        if ($floor == 1) $suffix = 'st';
        else if ($floor == 2) $suffix = 'nd';
        else if ($floor == 3) $suffix = 'rd';

        return $floor . $suffix . ' Floor';
    }

    /**
     * Helper function to get room type label
     */
    private function getRoomTypeLabel($roomType)
    {
        $labels = [
            'single' => 'Single Room',
            'double' => 'Double Room',
            'quad' => 'Quad Room',
            'bedSpacer' => 'Bed Spacer'
        ];

        return $labels[$roomType] ?? $roomType;
    }

    /**
     * Get available rooms for a property (PUBLIC - no auth required)
     */
    public function publicRooms($propertyId)
    {
        try {
            $property = Property::where('is_published', true)
                ->where('is_available', true)
                ->findOrFail($propertyId);

            $rooms = Room::where('property_id', $propertyId)
                ->where('status', 'available')
                ->with('amenities', 'images')
                ->orderBy('room_number')
                ->get()
                ->map(function ($room) {
                    return [
                        'id' => $room->id,
                        'room_number' => $room->room_number,
                        'room_type' => $room->room_type,
                        'type_label' => $this->getRoomTypeLabel($room->room_type),
                        'floor' => $room->floor,
                        'floor_label' => $this->formatFloor($room->floor),
                        'monthly_rate' => (float) $room->monthly_rate,
                        'daily_rate' => isset($room->daily_rate) ? (float) $room->daily_rate : null,
                        'billing_policy' => $room->billing_policy ?? 'monthly',
                        'min_stay_days' => isset($room->min_stay_days) ? (int) $room->min_stay_days : null,
                        'prorate_base' => isset($room->prorate_base) ? (int) $room->prorate_base : 30,
                        'capacity' => $room->capacity,
                        'status' => $room->status,
                        'description' => $room->description,
                        'amenities' => $room->amenities ? $room->amenities->pluck('name')->toArray() : [],
                        'images' => $room->images ? $room->images->pluck('image_url')->map(fn($url) => asset($url))->toArray() : [],
                    ];
                });

            return response()->json($rooms, 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Property not found or not available'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch rooms',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Pricing preview for a room. Accepts either `days=N` or `start`/`end` dates (YYYY-MM-DD).
     * Public endpoint used for price previews.
     */
    public function pricing(Request $request, $id)
    {
        try {
            $room = Room::findOrFail($id);

            // Determine days from query params
            $days = null;
            if ($request->has('days')) {
                $days = (int) $request->query('days');
            } elseif ($request->has('start') && $request->has('end')) {
                $start = new \DateTime($request->query('start'));
                $end = new \DateTime($request->query('end'));
                // inclusive days
                $interval = $start->diff($end);
                $days = (int) $interval->format('%a') + 1;
            }

            if (!$days || $days < 1) {
                return response()->json(['message' => 'days parameter or start/end required'], 400);
            }

            $result = $room->calculatePriceForDays($days);

            return response()->json([
                'room_id' => $room->id,
                'days' => $days,
                'policy' => $room->billing_policy ?? 'monthly',
                'monthly_rate' => (float) $room->monthly_rate,
                'daily_rate' => isset($room->daily_rate) ? (float) $room->daily_rate : null,
                'breakdown' => $result['breakdown'],
                'total' => $result['total'],
                'method' => $result['method']
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Room not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to calculate pricing', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Extend active tenant assignment(s) for a room by days or months.
     * Expects either `days` (integer) or `months` (integer) in the request body.
     */
    public function extendStay(Request $request, $id)
    {
        DB::beginTransaction();
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_rooms');

            $validated = $request->validate([
                'days' => 'nullable|integer|min:1',
                'months' => 'nullable|integer|min:1',
            ]);

            if (empty($validated['days']) && empty($validated['months'])) {
                return response()->json(['message' => 'Either days or months is required'], 422);
            }

            $room = Room::findOrFail($id);

            // Verify room's property belongs to landlord
            if ($room->property->landlord_id !== $context['landlord_id']) {
                return response()->json(['message' => 'Unauthorized access'], 403);
            }

            // If caretaker, verify they have access to this property
            if ($context['is_caretaker'] && $context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
                if (!in_array($room->property_id, $assignedPropertyIds)) {
                    return response()->json(['message' => 'Unauthorized access to this property'], 403);
                }
            }

            // Fetch active tenant assignments for this room
            $assignments = DB::table('room_tenant_assignments')
                ->where('room_id', $room->id)
                ->where('status', 'active')
                ->get();

            if ($assignments->isEmpty()) {
                return response()->json(['message' => 'No active tenant assignment found for this room'], 404);
            }

            $updated = [];
            foreach ($assignments as $a) {
                // determine base date (existing end_date or today)
                if ($a->end_date) {
                    $base = new \DateTime($a->end_date);
                } else {
                    // if no end_date, use today
                    $base = new \DateTime();
                }

                if (!empty($validated['days'])) {
                    $base->modify('+' . intval($validated['days']) . ' days');
                }
                if (!empty($validated['months'])) {
                    $base->modify('+' . intval($validated['months']) . ' months');
                }

                $newEnd = $base->format('Y-m-d');

                DB::table('room_tenant_assignments')
                    ->where('id', $a->id)
                    ->update(['end_date' => $newEnd, 'updated_at' => now()]);

                $updated[] = ['assignment_id' => $a->id, 'tenant_id' => $a->tenant_id, 'end_date' => $newEnd];
            }

            DB::commit();

            return response()->json([
                'message' => 'Successfully extended tenant assignment(s)',
                'updated' => $updated
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json(['message' => 'Room not found'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json(['message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to extend stay', 'error' => $e->getMessage()], 500);
        }
    }
}
