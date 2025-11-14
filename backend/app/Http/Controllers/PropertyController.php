<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Property;
use Illuminate\Support\Facades\Auth;

class PropertyController extends Controller
{
    /**
     * Get all properties for the authenticated landlord
     */
    public function index(Request $request)
    {
        try {
            $properties = Property::where('landlord_id', Auth::id())
                ->with(['rooms' => function ($query) {
                    $query->select('id', 'property_id', 'status');
                }])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($property) {
                    return [
                        'id' => $property->id,
                        'title' => $property->title,
                        'description' => $property->description,
                        'property_type' => $property->property_type,
                        'current_status' => $property->current_status,
                        'full_address' => $property->full_address,
                        'street_address' => $property->street_address,
                        'city' => $property->city,
                        'province' => $property->province,
                        'barangay' => $property->barangay,
                        'property_rules' => $property->property_rules ?? [],
                        'total_rooms' => $property->rooms->count(),
                        'available_rooms' => $property->rooms->where('status', 'available')->count(),
                        'occupied_rooms' => $property->rooms->where('status', 'occupied')->count(),
                        'maintenance_rooms' => $property->rooms->where('status', 'maintenance')->count(),
                        'is_published' => $property->is_published,
                        'is_available' => $property->is_available,
                        'created_at' => $property->created_at,
                        'updated_at' => $property->updated_at
                    ];
                });

            return response()->json($properties, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch properties',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new property
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                // Basic Information
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'property_type' => 'required|in:apartment,dormitory,boardingHouse,bedSpacer',
                'current_status' => 'sometimes|in:active,inactive,pending,maintenance',
                
                // Location Details
                'street_address' => 'required|string',
                'city' => 'required|string|max:100',
                'province' => 'required|string|max:100',
                'postal_code' => 'nullable|string|max:20',
                'country' => 'sometimes|string|max:100',
                'barangay' => 'nullable|string|max:100',
                
                // Property Coordinates
                'latitude' => 'nullable|numeric',
                'longitude' => 'nullable|numeric',
                'nearby_landmarks' => 'nullable|string',
                
                // Property Rules
                'property_rules' => 'nullable|string',
                
                // Property Specifications
                'number_of_bedrooms' => 'nullable|integer|min:0',
                'number_of_bathrooms' => 'nullable|integer|min:0',
                'floor_area' => 'nullable|numeric|min:0',
                'parking_spaces' => 'nullable|integer|min:0',
                'floor_level' => 'nullable|string|max:50',
                'max_occupants' => 'required|integer|min:1',
                
                // Room Management
                'total_rooms' => 'required|integer|min:1',
                'available_rooms' => 'required|integer|min:0',
                                
                // Status
                'is_published' => 'sometimes|boolean',
                'is_available' => 'sometimes|boolean'
            ]);

            // Handle property_rules - convert JSON string to array if needed
            if (isset($validated['property_rules'])) {
                $validated['property_rules'] = json_decode($validated['property_rules'], true);
            }

            $property = Property::create([
                'landlord_id' => Auth::id(),
                ...$validated,
                'current_status' => $validated['current_status'] ?? 'active',
                'country' => $validated['country'] ?? 'Philippines',
                'is_published' => $validated['is_published'] ?? false,
                'is_available' => $validated['is_available'] ?? true
            ]);

            return response()->json($property, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create property',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a single property
     */
    public function show($id)
    {
        try {
            $property = Property::where('landlord_id', Auth::id())
                ->with('rooms')
                ->findOrFail($id);

            return response()->json($property, 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Property not found'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch property',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a property
     */
    public function update(Request $request, $id)
    {
        try {
            $property = Property::where('landlord_id', Auth::id())->findOrFail($id);

            $validated = $request->validate([
                'title' => 'sometimes|string|max:255',
                'description' => 'nullable|string',
                'property_type' => 'sometimes|in:apartment,house,room,studio,dormitory,condo,boarding_house',
                'current_status' => 'sometimes|in:active,inactive,pending,maintenance',
                'street_address' => 'sometimes|string',
                'city' => 'sometimes|string|max:100',
                'province' => 'sometimes|string|max:100',
                'postal_code' => 'nullable|string|max:20',
                'barangay' => 'nullable|string|max:100',
                'latitude' => 'nullable|numeric',
                'longitude' => 'nullable|numeric',
                'nearby_landmarks' => 'nullable|string',
                'property_rules' => 'nullable|string',
                'number_of_bedrooms' => 'nullable|integer|min:0',
                'number_of_bathrooms' => 'nullable|integer|min:0',
                'floor_area' => 'nullable|numeric|min:0',
                'parking_spaces' => 'nullable|integer|min:0',
                'floor_level' => 'nullable|string|max:50',
                'max_occupants' => 'sometimes|integer|min:1',
                'total_rooms' => 'sometimes|integer|min:1',
                'available_rooms' => 'sometimes|integer|min:0',
                'is_published' => 'sometimes|boolean',
                'is_available' => 'sometimes|boolean'
            ]);

            // Handle property_rules - convert JSON string to array if needed
            if (isset($validated['property_rules'])) {
                $validated['property_rules'] = json_decode($validated['property_rules'], true);
            }

            $property->update($validated);

            return response()->json($property, 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Property not found'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update property',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a property
     */
    public function destroy($id)
    {
        try {
            $property = Property::where('landlord_id', Auth::id())->findOrFail($id);
            $property->delete();

            return response()->json([
                'message' => 'Property deleted successfully'
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Property not found'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete property',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}