<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Room;
use App\Models\Property;
use App\Models\Amenity;
use App\Models\RoomImage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class RoomController extends Controller
{
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

            // Verify property belongs to authenticated landlord
            $property = Property::where('landlord_id', Auth::id())
                ->findOrFail($propertyId);

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
                'monthly_rate' => 'required|numeric|min:0',
                'capacity' => 'required|integer|min:1',
                'pricing_model' => 'sometimes|in:full_room,per_bed',
                'status' => 'sometimes|in:available,occupied,maintenance',
                'current_tenant_id' => 'nullable|exists:users,id',
                'description' => 'nullable|string',
                'amenities' => 'nullable|array',
                'amenities.*' => 'string',
                'images' => 'nullable|array|max:10',
                'images.*' => 'image|mimes:jpeg,png,jpg|max:10240'
            ]);

            // Verify property belongs to authenticated landlord
            $property = Property::where('id', $validated['property_id'])
                ->where('landlord_id', Auth::id())
                ->firstOrFail();

            // Check if room number already exists for this property
            $existingRoom = Room::where('property_id', $validated['property_id'])
                ->where('room_number', $validated['room_number'])
                ->first();

            if ($existingRoom) {
                return response()->json([
                    'message' => 'Room number already exists for this property'
                ], 422);
            }

            $room = Room::create([
                'property_id' => $validated['property_id'],
                'room_number' => $validated['room_number'],
                'room_type' => $validated['room_type'],
                'floor' => $validated['floor'],
                'monthly_rate' => $validated['monthly_rate'],
                'capacity' => $validated['capacity'],
                'pricing_model' => $validated['pricing_model'] ?? 'full_room',
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
                'monthly_rate' => 'sometimes|numeric|min:0',
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

            $property = $room->property;

            // Delete related amenities and images
            $room->amenities()->detach();
            RoomImage::where('room_id', $room->id)->delete();

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
            $room = Room::findOrFail($id);

            // Verify room's property belongs to authenticated landlord
            if ($room->property->landlord_id !== Auth::id()) {
                return response()->json([
                    'message' => 'Unauthorized access'
                ], 403);
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
    public function getStats($propertyId)
    {
        try {
            // Verify property belongs to authenticated landlord
            $property = Property::where('landlord_id', Auth::id())
                ->findOrFail($propertyId);

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
            'images' => $room->images ? $room->images->pluck('image_url')->map(fn($url) => asset($url))->toArray() : [],
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
}
