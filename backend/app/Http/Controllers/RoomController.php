<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Room;
use App\Models\Property;
use Illuminate\Support\Facades\Auth;

class RoomController extends Controller
{
    /**
     * Get all rooms for a specific property
     */
    public function index($propertyId)
    {
        try {
            // Verify property belongs to authenticated landlord
            $property = Property::where('landlord_id', Auth::id())
                ->findOrFail($propertyId);

            $rooms = Room::where('property_id', $propertyId)
                ->with('currentTenant:id,first_name,last_name')
                ->orderBy('room_number')
                ->get()
                ->map(function ($room) {
                    return [
                        'id' => $room->id,
                        'roomNumber' => $room->room_number,
                        'room_number' => $room->room_number,
                        'type' => $room->type,
                        'room_type' => $room->room_type,
                        'price' => $room->monthly_rate,
                        'monthly_rate' => $room->monthly_rate,
                        'floor' => $room->floor . ($room->floor == 1 ? 'st' : ($room->floor == 2 ? 'nd' : ($room->floor == 3 ? 'rd' : 'th'))) . ' Floor',
                        'capacity' => $room->capacity,
                        'occupied' => $room->status === 'occupied' ? $room->capacity : 0,
                        'status' => $room->status,
                        'tenant' => $room->tenant, 
                        'current_tenant_id' => $room->current_tenant_id,
                        'description' => $room->description,
                        'amenities' => $room->amenities,
                        'images' => $room->images,
                        'created_at' => $room->created_at,
                        'updated_at' => $room->updated_at
                    ];
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
        try {
            $validated = $request->validate([
                'property_id' => 'required|exists:properties,id',
                'room_number' => 'required|string|max:50',
                'room_type' => 'required|in:single,double,quad,suite',
                'floor' => 'required|integer|min:1',
                'monthly_rate' => 'required|numeric|min:0',
                'capacity' => 'required|integer|min:1',
                'status' => 'sometimes|in:available,occupied,maintenance',
                'current_tenant_id' => 'nullable|exists:users,id',
                'description' => 'nullable|string'
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
                'status' => $validated['status'] ?? 'available',
                'current_tenant_id' => $validated['current_tenant_id'] ?? null,
                'description' => $validated['description'] ?? null
            ]);

            // Update property room counts
            $property->updateTotalRooms();
            $property->updateAvailableRooms();

            // Load tenant relationship for response
            $room->load('currentTenant:id,first_name,last_name');

            return response()->json([
                'id' => $room->id,
                'roomNumber' => $room->room_number,
                'room_number' => $room->room_number,
                'type' => $room->type,
                'room_type' => $room->room_type,
                'price' => $room->monthly_rate,
                'monthly_rate' => $room->monthly_rate,
                'floor' => $room->floor . ($room->floor == 1 ? 'st' : ($room->floor == 2 ? 'nd' : ($room->floor == 3 ? 'rd' : 'th'))) . ' Floor',
                'capacity' => $room->capacity,
                'occupied' => $room->status === 'occupied' ? $room->capacity : 0,
                'status' => $room->status,
                'tenant' => $room->tenant,
                'current_tenant_id' => $room->current_tenant_id,
                'description' => $room->description,
                'amenities' => [],
                'images' => ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400'],
                'created_at' => $room->created_at,
                'updated_at' => $room->updated_at
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
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
                'room_type' => 'sometimes|in:single,double,quad,suite',
                'floor' => 'sometimes|integer|min:1',
                'monthly_rate' => 'sometimes|numeric|min:0',
                'capacity' => 'sometimes|integer|min:1',
                'status' => 'sometimes|in:available,occupied,maintenance',
                'current_tenant_id' => 'nullable|exists:users,id',
                'description' => 'nullable|string'
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

            $room->update($validated);

            // Update property room counts if status changed
            if (isset($validated['status'])) {
                $room->property->updateAvailableRooms();
            }

            $room->load('currentTenant:id,first_name,last_name');

            return response()->json([
                'id' => $room->id,
                'roomNumber' => $room->room_number,
                'room_number' => $room->room_number,
                'type' => $room->type,
                'room_type' => $room->room_type,
                'price' => $room->monthly_rate,
                'monthly_rate' => $room->monthly_rate,
                'floor' => $room->floor . ($room->floor == 1 ? 'st' : ($room->floor == 2 ? 'nd' : ($room->floor == 3 ? 'rd' : 'th'))) . ' Floor',
                'capacity' => $room->capacity,
                'occupied' => $room->status === 'occupied' ? $room->capacity : 0,
                'status' => $room->status,
                'tenant' => $room->tenant,
                'current_tenant_id' => $room->current_tenant_id,
                'description' => $room->description,
                'amenities' => [],
                'images' => ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400'],
                'created_at' => $room->created_at,
                'updated_at' => $room->updated_at
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Room not found'
            ], 404);
        } catch (\Exception $e) {
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
        try {
            $room = Room::findOrFail($id);

            // Verify room's property belongs to authenticated landlord
            if ($room->property->landlord_id !== Auth::id()) {
                return response()->json([
                    'message' => 'Unauthorized access'
                ], 403);
            }

            $property = $room->property;
            $room->delete();

            // Update property room counts
            $property->updateTotalRooms();
            $property->updateAvailableRooms();

            return response()->json([
                'message' => 'Room deleted successfully'
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Room not found'
            ], 404);
        } catch (\Exception $e) {
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

            $room->update(['status' => $validated['status']]);

            // Update property available rooms count
            $room->property->updateAvailableRooms();

            $room->load('currentTenant:id,first_name,last_name');

            return response()->json([
                'id' => $room->id,
                'roomNumber' => $room->room_number,
                'status' => $room->status,
                'tenant' => $room->tenant
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
}