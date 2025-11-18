<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Property;
use App\Models\PropertyImage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class PropertyController extends Controller
{
    // ====================================================================
    // PUBLIC ROUTES (No auth needed - for tenants)
    // ====================================================================

    /**
     * Get all published & available properties (Tenant Homepage Cards)
     */
    public function getAllProperties()
    {
        try {
            $properties = Property::where('is_published', true)
                ->where('is_available', true)
                ->with(['rooms' => function ($q) {
                    $q->where('status', 'available')
                      ->select('id', 'property_id', 'monthly_rate');
                }, 'images'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($property) {
                    $availableRooms = $property->rooms;
                    $minPrice = $availableRooms->min('monthly_rate');
                    $maxPrice = $availableRooms->max('monthly_rate');

                    $primaryImage = $property->images->where('is_primary', true)->first();
                    $coverImage = $primaryImage ?? $property->images->first();

                    return [
                        'id' => $property->id,
                        'name' => $property->title,
                        'title' => $property->title,
                        'type' => ucwords(str_replace('_', ' ', $property->property_type)),
                        'city' => $property->city,
                        'location' => $property->city,
                        'availableRooms' => $availableRooms->count(),
                        'available_rooms' => $availableRooms->count(),
                        'minPrice' => $minPrice,
                        'priceRange' => $minPrice && $maxPrice
                            ? ($minPrice == $maxPrice
                                ? '₱' . number_format($minPrice, 0)
                                : '₱' . number_format($minPrice, 0) . ' - ₱' . number_format($maxPrice, 0))
                            : 'Price on request',
                        'image' => $coverImage
                            ? (str_starts_with($coverImage->image_url, 'http') 
                                ? $coverImage->image_url 
                                : asset('storage/' . ltrim($coverImage->image_url, '/')))
                            : 'https://via.placeholder.com/400x200?text=No+Image',
                        'created_at' => $property->created_at,
                        'updated_at' => $property->updated_at,
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
     * Get single property details (Property Detail Page)
     */
    public function getPropertyDetails($id)
    {
        try {
            $property = Property::where('is_published', true)
                ->where('is_available', true)
                ->with(['rooms' => function ($q) {
                    $q->where('status', 'available')
                      ->with('amenities', 'images');
                }, 'images'])
                ->findOrFail($id);

            $availableRooms = $property->rooms;
            $minPrice = $availableRooms->min('monthly_rate');
            $maxPrice = $availableRooms->max('monthly_rate');

            $primaryImage = $property->images->where('is_primary', true)->first();
            $coverImage = $primaryImage ?? $property->images->first();

            return response()->json([
                'id' => $property->id,
                'title' => $property->title,
                'description' => $property->description,
                'property_type' => $property->property_type,
                'full_address' => $property->full_address,
                'street_address' => $property->street_address,
                'city' => $property->city,
                'province' => $property->province,
                'barangay' => $property->barangay,
                'postal_code' => $property->postal_code,
                'latitude' => $property->latitude,
                'longitude' => $property->longitude,
                'nearby_landmarks' => $property->nearby_landmarks,
                'property_rules' => $property->property_rules ?? [],
                'number_of_bedrooms' => $property->number_of_bedrooms,
                'number_of_bathrooms' => $property->number_of_bathrooms,
                'floor_area' => $property->floor_area,
                'max_occupants' => $property->max_occupants,
                'total_rooms' => $property->rooms->count(),
                'available_rooms' => $availableRooms->count(),
                'min_price' => $minPrice,
                'max_price' => $maxPrice,
                'price_range' => $minPrice && $maxPrice
                    ? ($minPrice == $maxPrice
                        ? '₱' . number_format($minPrice, 0)
                        : '₱' . number_format($minPrice, 0) . ' - ₱' . number_format($maxPrice, 0))
                    : 'Contact for price',
                'image' => $coverImage 
                    ? (str_starts_with($coverImage->image_url, 'http') 
                        ? $coverImage->image_url 
                        : asset('storage/' . ltrim($coverImage->image_url, '/')))
                    : null,
                'images' => $property->images->sortBy('display_order')->map(function($img) {
                    return str_starts_with($img->image_url, 'http') 
                        ? $img->image_url 
                        : asset('storage/' . ltrim($img->image_url, '/'));
                })->toArray(),
                'rooms' => $availableRooms->map(function ($room) {
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
                        'amenities' => $room->amenities?->pluck('name')->toArray() ?? [],
                        'images' => $room->images?->pluck('image_url')->map(fn($url) => asset('storage/' . $url))->toArray() ?? [],
                    ];
                })->values()
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Property not found or not available'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Server error', 'error' => $e->getMessage()], 500);
        }
    }

    // ====================================================================
    // PROTECTED ROUTES (Landlord only)
    // ====================================================================

    public function index(Request $request)
    {
        $properties = Property::where('landlord_id', Auth::id())
            ->withCount(['rooms', 'rooms as available_rooms' => fn($q) => $q->where('status', 'available')])
            ->with('images')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($properties, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'property_type' => 'required|in:apartment,dormitory,boardingHouse,bedSpacer',
            'street_address' => 'required|string',
            'city' => 'required|string',
            'province' => 'required|string',
            'barangay' => 'nullable|string',
            'postal_code' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'nearby_landmarks' => 'nullable|string',
            'property_rules' => 'nullable|string',
            'number_of_bedrooms' => 'nullable|integer',
            'number_of_bathrooms' => 'nullable|integer',
            'floor_area' => 'nullable|numeric',
            'floor_level' => 'nullable|string',
            'max_occupants' => 'required|integer|min:1',
            'is_published' => 'sometimes|boolean',
            'is_available' => 'sometimes|boolean',
            'amenities' => 'nullable|array',
            'amenities.*' => 'nullable|string',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
            'images' => 'nullable|array|max:10',
        ]);

        $property = Property::create([
            'landlord_id' => Auth::id(),
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'property_type' => $validated['property_type'],
            'street_address' => $validated['street_address'],
            'city' => $validated['city'],
            'province' => $validated['province'],
            'barangay' => $validated['barangay'] ?? null,
            'postal_code' => $validated['postal_code'] ?? null,
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'nearby_landmarks' => $validated['nearby_landmarks'] ?? null,
            'property_rules' => $validated['property_rules'] ?? null,
            'number_of_bedrooms' => $validated['number_of_bedrooms'] ?? null,
            'number_of_bathrooms' => $validated['number_of_bathrooms'] ?? null,
            'floor_area' => $validated['floor_area'] ?? null,
            'max_occupants' => $validated['max_occupants'],
            'total_rooms' => 0,
            'available_rooms' => 0,
            'is_published' => $validated['is_published'] ?? false,
            'is_available' => $validated['is_available'] ?? true,
        ]);

        // Handle image uploads
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $index => $file) {
                $path = $file->store('property_images', 'public');
                $filename = basename($path);
                
                PropertyImage::create([
                    'property_id' => $property->id,
                    'image_url' => 'property_images/' . $filename,
                    'is_primary' => $index === 0,
                    'display_order' => $index,
                ]);
            }
        }

        // Handle amenities sync
        if ($request->has('amenities') && is_array($request->amenities)) {
            $amenityIds = [];
            foreach ($request->amenities as $amenityName) {
                if (!empty($amenityName)) {
                    $amenity = \App\Models\Amenity::firstOrCreate(['name' => $amenityName]);
                    $amenityIds[] = $amenity->id;
                }
            }
            $property->amenities()->sync($amenityIds);
        }

        // Format images with proper URLs
        $property->load(['images', 'amenities']);
        $property->images->transform(function ($image) {
            $image->image_url = asset('storage/' . $image->image_url);
            return $image;
        });
        $property->amenities_list = $property->amenities->pluck('name')->toArray();

        return response()->json($property, 201);
    }

    public function show($id)
    {
        $property = Property::where('landlord_id', Auth::id())
            ->with(['rooms', 'images', 'amenities'])
            ->findOrFail($id);

        // Format images with proper URLs
        $property->images->transform(function ($image) {
            $image->image_url = asset('storage/' . $image->image_url);
            return $image;
        });

        // Format amenities
        $property->amenities_list = $property->amenities->pluck('name')->toArray();

        return response()->json($property, 200);
    }

    public function update(Request $request, $id)
    {
        $property = Property::where('landlord_id', Auth::id())->findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'property_type' => 'sometimes|required|in:apartment,dormitory,boardingHouse,bedSpacer',
            'street_address' => 'sometimes|required|string',
            'city' => 'sometimes|required|string',
            'province' => 'sometimes|required|string',
            'barangay' => 'nullable|string',
            'postal_code' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'nearby_landmarks' => 'nullable|string',
            'property_rules' => 'nullable|string',
            'number_of_bedrooms' => 'nullable|integer',
            'number_of_bathrooms' => 'nullable|integer',
            'floor_area' => 'nullable|numeric',
            'floor_level' => 'nullable|string',
            'max_occupants' => 'nullable|integer',
            'total_rooms' => 'nullable|integer',
            'current_status' => 'nullable|string',
            'is_published' => 'sometimes|boolean',
            'is_available' => 'sometimes|boolean',
            'amenities' => 'nullable|array',
            'amenities.*' => 'nullable|string',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
            'images' => 'nullable|array|max:10',
        ]);

        $property->update($validated);

        // Handle amenities sync
        if ($request->has('amenities') && is_array($request->amenities)) {
            $amenityIds = [];
            foreach ($request->amenities as $amenityName) {
                if (!empty($amenityName)) {
                    $amenity = \App\Models\Amenity::firstOrCreate(['name' => $amenityName]);
                    $amenityIds[] = $amenity->id;
                }
            }
            $property->amenities()->sync($amenityIds);
        }

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $index => $file) {
                $path = $file->store('property_images', 'public');
                $filename = basename($path);
                PropertyImage::create([
                    'property_id' => $property->id,
                    'image_url' => 'property_images/' . $filename,
                    'is_primary' => $index === 0 && $property->images->where('is_primary', true)->count() === 0,
                    'display_order' => $property->images->count() + $index,
                ]);
            }
        }

        // Format images with proper URLs
        $property->load(['images', 'amenities']);
        $property->images->transform(function ($image) {
            $image->image_url = asset('storage/' . $image->image_url);
            return $image;
        });
        $property->amenities_list = $property->amenities->pluck('name')->toArray();

        return response()->json($property, 200);
    }

    public function destroy($id)
    {
        $property = Property::where('landlord_id', Auth::id())->findOrFail($id);
        $property->delete();

        return response()->json(['message' => 'Property deleted successfully'], 200);
    }

    // ====================================================================
    // Helper Methods
    // ====================================================================

    private function getRoomTypeLabel($roomType)
    {
        return [
            'single' => 'Single Room',
            'double' => 'Double Room',
            'quad' => 'Quad Room',
            'bedSpacer' => 'Bed Spacer'
        ][$roomType] ?? ucfirst($roomType);
    }

    private function formatFloor($floor)
    {
        if ($floor > 10 && $floor < 20) return $floor . 'th Floor';
        return $floor . match($floor % 10) {
            1 => 'st', 2 => 'nd', 3 => 'rd',
            default => 'th'
        } . ' Floor';
    }
}