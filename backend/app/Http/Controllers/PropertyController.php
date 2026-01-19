<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Property;
use App\Models\PropertyImage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Room;


class PropertyController extends Controller
{
    // ====================================================================
    // PUBLIC ROUTES (No auth needed - for tenants)
    // ====================================================================

    /**
     * Get all published & available properties (Tenant Homepage Cards)
     */
    public function getAllProperties(Request $request)
    {
        try {
            $query = Property::where('is_published', true)
                ->where('is_available', true);

            // 1. Search Filter
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('street_address', 'like', "%{$search}%")
                      ->orWhere('barangay', 'like', "%{$search}%")
                      ->orWhere('city', 'like', "%{$search}%")
                      ->orWhere('province', 'like', "%{$search}%");
                });
            }

            // 2. Type Filter
            if ($request->has('type') && !empty($request->type) && $request->type !== 'All') {
                // Convert "Boarding House" -> "boarding_house"
                $type = strtolower(str_replace(' ', '_', $request->type));
                $query->where('property_type', $type);
            }

            // 3. Price Filter
            if ($request->has('min_price') || $request->has('max_price')) {
                $query->whereHas('rooms', function($q) use ($request) {
                    $q->where('status', 'available');
                    if ($request->has('min_price') && !empty($request->min_price)) {
                        $q->where('monthly_rate', '>=', $request->min_price);
                    }
                    if ($request->has('max_price') && !empty($request->max_price)) {
                        $q->where('monthly_rate', '<=', $request->max_price);
                    }
                });
            }

            $properties = $query->with([
                    'rooms.images', // eager load images for rooms
                    'images',
                    'landlord:id,first_name,last_name'
                ])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($property) {
                    $availableRooms = $property->rooms->where('status', 'available');
                    $minPrice = $availableRooms->min('monthly_rate');
                    $maxPrice = $availableRooms->max('monthly_rate');

                    $primaryImage = $property->images->where('is_primary', true)->first();
                    $coverImage = $primaryImage ?? $property->images->first();

                    // Check if any room has bedSpacer type
                    $hasBedSpacerRoom = $availableRooms->contains('room_type', 'bedSpacer');

                    return [
                        'id' => $property->id,
                        'name' => $property->title,
                        'title' => $property->title,
                        'type' => ucwords(str_replace('_', ' ', $property->property_type)),
                        'property_type' => $property->property_type, // Raw property type
                        'has_bedspacer_room' => $hasBedSpacerRoom, // Flag for bedspacer filter
                        'street_address' => $property->street_address,
                        'barangay' => $property->barangay,
                        'city' => $property->city,
                        'province' => $property->province,
                        'postal_code' => $property->postal_code,
                        'full_address' => $property->full_address,
                        'location' => $property->full_address ?: $property->city,
                        'latitude' => $property->latitude,
                        'longitude' => $property->longitude,
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
                        'landlord_id' => $property->landlord_id,
                        'landlord_name' => $property->landlord
                            ? trim($property->landlord->first_name . ' ' . $property->landlord->last_name)
                            : 'Landlord',
                        'created_at' => $property->created_at,
                        'updated_at' => $property->updated_at,
                        // Add rooms array for frontend
                        'rooms' => $availableRooms->map(function ($room) {
                            return [
                                'id' => $room->id,
                                'room_type' => $room->room_type,
                                'monthly_rate' => $room->monthly_rate,
                                'status' => $room->status,
                                'capacity' => $room->capacity,
                                'description' => $room->description,
                                'images' => $room->images ? $room->images->pluck('image_url')->toArray() : [],
                            ];
                        })->values(),
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
                ->with([
                    'rooms' => function ($q) {
                        // Fetch all rooms regardless of status to show in UI with filters
                        $q->with('amenities', 'images');
                    },
                    'images',
                    'landlord:id,first_name,last_name,email,phone' // Added email and phone
                ])
                ->findOrFail($id);

            // Calculate price range only from AVAILABLE rooms
            $availableRoomsForPrice = $property->rooms->where('status', 'available');
            $minPrice = $availableRoomsForPrice->min('monthly_rate');
            $maxPrice = $availableRoomsForPrice->max('monthly_rate');

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
                'total_rooms' => $property->rooms->count(),
                'available_rooms' => $availableRoomsForPrice->count(),
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
                'images' => $property->images->sortBy('display_order')->map(function ($img) {
                    return str_starts_with($img->image_url, 'http')
                        ? $img->image_url
                        : asset('storage/' . ltrim($img->image_url, '/'));
                })->toArray(),

                // IMPORTANT: Add these landlord fields at root level
                'landlord_id' => $property->landlord_id,
                'user_id' => $property->landlord_id, // Alias for compatibility
                'landlord_name' => $property->landlord
                    ? trim($property->landlord->first_name . ' ' . $property->landlord->last_name)
                    : 'Landlord',
                'owner_name' => $property->landlord
                    ? trim($property->landlord->first_name . ' ' . $property->landlord->last_name)
                    : 'Landlord', // Alias for compatibility

                // Include full landlord object as well
                'landlord' => $property->landlord ? [
                    'id' => $property->landlord->id,
                    'first_name' => $property->landlord->first_name,
                    'last_name' => $property->landlord->last_name,
                    'email' => $property->landlord->email,
                    'phone' => $property->landlord->phone,
                ] : null,

                'rooms' => $property->rooms->map(function ($room) {
                    return [
                        'id' => $room->id,
                        'room_number' => $room->room_number,
                        'room_type' => $room->room_type,
                        'type_label' => $this->getRoomTypeLabel($room->room_type),
                        'monthly_rate' => (float) $room->monthly_rate,
                        'daily_rate' => isset($room->daily_rate) ? (float) $room->daily_rate : null,
                        'billing_policy' => $room->billing_policy ?? 'monthly',
                        'capacity' => $room->capacity,
                        'status' => $room->status,
                        'description' => $room->description,
                        'amenities' => $room->amenities?->pluck('name')->toArray() ?? [],
                        'images' => $room->images?->pluck('image_url')->map(function ($url) {
                            // If URL already starts with http, return as-is
                            if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
                                return $url;
                            }
                            // Otherwise, prepend storage path
                            return asset('storage/' . ltrim($url, '/'));
                        })->toArray() ?? [],
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

    /**
     * Get accessible properties for the current user
     * - Landlords get all their properties
     * - Caretakers get only their assigned properties
     */
    public function getAccessibleProperties(Request $request)
    {
        $user = $request->user();

        if ($user->role === 'caretaker') {
            // Get caretaker's assigned properties
            $assignment = $user->caretakerAssignment;
            if (!$assignment) {
                return response()->json([], 200);
            }

            $propertyIds = $assignment->properties()->pluck('properties.id')->toArray();

            $properties = Property::whereIn('id', $propertyIds)
                ->withCount(['rooms', 'rooms as available_rooms' => fn($q) => $q->where('status', 'available')])
                ->with(['images', 'amenities'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($property) {
                    $amenityNames = $property->amenities->pluck('name')->toArray();
                    $propertyArray = $property->toArray();
                    $propertyArray['amenities'] = $amenityNames;
                    return $propertyArray;
                });

            return response()->json($properties, 200);
        }

        // Landlord gets all their properties
        $properties = Property::where('landlord_id', $user->id)
            ->withCount(['rooms', 'rooms as available_rooms' => fn($q) => $q->where('status', 'available')])
            ->with(['images', 'amenities', 'credentials'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($property) {
                $amenityNames = $property->amenities->pluck('name')->toArray();
                $propertyArray = $property->toArray();
                $propertyArray['amenities'] = $amenityNames;
                        if (isset($propertyArray['credentials']) && is_array($propertyArray['credentials'])) {
                            $propertyArray['credentials'] = array_map(function ($c) {
                                return array_merge($c, ['file_url' => asset('storage/' . ($c['file_path'] ?? ''))]);
                            }, $propertyArray['credentials']);
                        }
                return $propertyArray;
            });

        return response()->json($properties, 200);
    }

    public function index(Request $request)
    {
        $properties = Property::where('landlord_id', Auth::id())
            ->withCount(['rooms', 'rooms as available_rooms' => fn($q) => $q->where('status', 'available')])
            ->with(['images', 'amenities', 'credentials'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($property) {
                // Convert amenities to array of names only
                $amenityNames = $property->amenities->pluck('name')->toArray();

                // Convert to array and add amenities as simple array
                $propertyArray = $property->toArray();
                $propertyArray['amenities'] = $amenityNames;

                        if (isset($propertyArray['credentials']) && is_array($propertyArray['credentials'])) {
                            $propertyArray['credentials'] = array_map(function ($c) {
                                return array_merge($c, ['file_url' => asset('storage/' . ($c['file_path'] ?? ''))]);
                            }, $propertyArray['credentials']);
                        }
                        return $propertyArray;
            });

        return response()->json($properties, 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'property_type' => 'required|in:apartment,dormitory,boardingHouse,bedSpacer',
            'current_status' => 'nullable|in:active,inactive,pending,maintenance,draft',
            'is_draft' => 'sometimes|boolean',
            'street_address' => 'required|string',
            'city' => 'required|string',
            'province' => 'required|string',
            'barangay' => 'nullable|string',
            'postal_code' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'nearby_landmarks' => 'nullable|string',
            'property_rules' => 'nullable|string',
            'is_published' => 'sometimes|boolean',
            'is_available' => 'sometimes|boolean',
            'amenities' => 'nullable|array',
            'amenities.*' => 'nullable|string',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
            'images' => 'nullable|array|max:10',
            'credentials' => 'nullable|array',
            'credentials.*' => 'nullable|file|mimes:pdf,jpeg,png,jpg|max:10240',
        ]);

        $property = Property::create([
            'landlord_id' => Auth::id(),
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'property_type' => $validated['property_type'],
            // Determine current status: explicit is_draft takes precedence
            'current_status' => ($request->has('is_draft') && $request->boolean('is_draft'))
                ? 'draft'
                : ($validated['current_status'] ?? 'pending'),
            'street_address' => $validated['street_address'],
            'city' => $validated['city'],
            'province' => $validated['province'],
            'barangay' => $validated['barangay'] ?? null,
            'postal_code' => $validated['postal_code'] ?? null,
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'nearby_landmarks' => $validated['nearby_landmarks'] ?? null,
            'property_rules' => $validated['property_rules'] ?? null,
            'total_rooms' => 0,
            'available_rooms' => 0,
            'is_published' => $validated['is_published'] ?? false,
            'is_available' => $validated['is_available'] ?? false,
            'is_eligible' => $request->has('is_eligible') ? (bool)$request->input('is_eligible') : false,
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
        // Handle credentials uploads (if any)
        if ($request->hasFile('credentials')) {
            foreach ($request->file('credentials') as $file) {
                $path = $file->store('property_credentials', 'public');
                \App\Models\PropertyCredential::create([
                    'property_id' => $property->id,
                    'file_path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime' => $file->getClientMimeType(),
                ]);
            }
        }
        $property->load(['credentials']);
        $property->images->transform(function ($image) {
            $image->image_url = asset('storage/' . $image->image_url);
            return $image;
        });
        // Expose credential URLs for landlord
        if ($property->relationLoaded('credentials')) {
            $property->credentials->transform(function ($c) {
                $c->file_url = asset('storage/' . $c->file_path);
                return $c;
            });
        }
        $property->amenities_list = $property->amenities->pluck('name')->toArray();

        return response()->json($property, 201);
    }

    /**
     * Show property details for tenants (public view)
     * This allows tenants to view any property and includes landlord info
     */
    public function showForTenant($id)
    {
        $property = Property::with([
            'rooms' => function ($query) {
                $query->select(
                    'id',
                    'property_id',
                    'room_number',
                    'room_type',
                    'capacity',
                    'monthly_rate',
                    'status',
                    'description'
                )
                    ->orderBy('room_number');
            },
            'images' => function ($query) {
                $query->select('id', 'property_id', 'image_url');
            },
            'amenities' => function ($query) {
                $query->select('amenities.id', 'amenities.name');
            },
            'landlord:id,first_name,last_name,email,phone'
        ])->findOrFail($id);

        // Format images with proper URLs
        $property->images->transform(function ($image) {
            $image->image_url = asset('storage/' . $image->image_url);
            return $image;
        });

        // Format amenities
        $property->amenities_list = $property->amenities->pluck('name')->toArray();

        // Add landlord_id and landlord_name to the root level for easier access
        $propertyArray = $property->toArray();
        $propertyArray['landlord_id'] = $property->landlord->id ?? null;
        $propertyArray['landlord_name'] = $property->landlord
            ? trim($property->landlord->first_name . ' ' . $property->landlord->last_name)
            : 'Unknown';

        return response()->json($propertyArray, 200);
    }

    /**
     * Show property details (for landlord - existing method)
     */
    public function show($id)
    {
        $property = Property::where('landlord_id', Auth::id())
            ->with(['rooms', 'images', 'amenities', 'credentials'])
            ->findOrFail($id);

        // Format images with proper URLs
        $property->images->transform(function ($image) {
            $image->image_url = asset('storage/' . $image->image_url);
            return $image;
        });

        if ($property->relationLoaded('credentials')) {
            $property->credentials->transform(function ($c) {
                $c->file_url = asset('storage/' . $c->file_path);
                return $c;
            });
        }

        // Format amenities
        $property->amenities_list = $property->amenities->pluck('name')->toArray();

        return response()->json($property, 200);
    }

    /**
     * Get room details with property and landlord info
     */
    public function getRoomDetails($roomId)
    {
        $room = Room::with([
            'property' => function ($query) {
                $query->select('id', 'landlord_id', 'title', 'name', 'address', 'city')
                    ->with('landlord:id,first_name,last_name,email,phone');
            },
            'images'
        ])->findOrFail($roomId);

        // Format room images
        $room->images = $room->images->map(function ($image) {
            return asset('storage/' . $image);
        });

        // Add landlord info to root level of property
        if ($room->property && $room->property->landlord) {
            $room->property->landlord_id = $room->property->landlord->id;
            $room->property->landlord_name = trim(
                $room->property->landlord->first_name . ' ' .
                    $room->property->landlord->last_name
            );
        }

        return response()->json($room, 200);
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
            'total_rooms' => 'nullable|integer',
            'current_status' => 'nullable|string',
            'is_draft' => 'sometimes|boolean',
            'is_published' => 'sometimes|boolean',
            'is_available' => 'sometimes|boolean',
            'amenities' => 'nullable|array',
            'amenities.*' => 'nullable|string',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
            'images' => 'nullable|array|max:10',
            'credentials' => 'nullable|array',
            'credentials.*' => 'nullable|file|mimes:pdf,jpeg,png,jpg|max:10240',
        ]);

        // If is_draft present, map to current_status to ensure consistent handling
        if ($request->has('is_draft') && $request->boolean('is_draft')) {
            $validated['current_status'] = 'draft';
        }

        $property->update($validated);

        // Update eligibility flag if present
        if ($request->has('is_eligible')) {
            $property->is_eligible = (bool)$request->input('is_eligible');
            $property->save();
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

        // Handle credential uploads for updates
        if ($request->hasFile('credentials')) {
            foreach ($request->file('credentials') as $file) {
                $path = $file->store('property_credentials', 'public');
                \App\Models\PropertyCredential::create([
                    'property_id' => $property->id,
                    'file_path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime' => $file->getClientMimeType(),
                ]);
            }
        }

        // Handle deletion of credentials requested by client
        if ($request->has('deleted_credentials')) {
            $deleted = $request->input('deleted_credentials');
            if (!is_array($deleted)) {
                $deleted = [$deleted];
            }
            foreach ($deleted as $credId) {
                try {
                    $cred = \App\Models\PropertyCredential::where('property_id', $property->id)
                        ->where('id', $credId)
                        ->first();
                    if ($cred) {
                        // Remove file from storage if exists
                        $filePath = storage_path('app/public/' . $cred->file_path);
                        if (file_exists($filePath)) {
                            @unlink($filePath);
                        }
                        $cred->delete();
                    }
                } catch (\Exception $e) {
                    // Log and continue; do not fail the whole update for a file deletion error
                    // You can replace with logger()->error(...) if needed
                }
            }
        }

        $property->load(['images', 'amenities', 'credentials']);

        // Format images with proper URLs
        $property->load(['images', 'amenities']);
        $property->images->transform(function ($image) {
            $image->image_url = asset('storage/' . $image->image_url);
            return $image;
        });
        if ($property->relationLoaded('credentials')) {
            $property->credentials->transform(function ($c) {
                $c->file_url = asset('storage/' . $c->file_path);
                return $c;
            });
        }
        $property->amenities_list = $property->amenities->pluck('name')->toArray();

        return response()->json($property, 200);
    }

    /**
     * Verify password before deletion
     */
    public function verifyPassword(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        $user = User::findOrFail(Auth::id());

        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Incorrect password',
                'verified' => false
            ], 422);
        }

        return response()->json([
            'message' => 'Password verified',
            'verified' => true
        ], 200);
    }

    /**
     * Add a new amenity to a property
     */
    public function addAmenity(Request $request, $id)
    {
        $request->validate([
            'amenity' => 'required|string|max:255'
        ]);

        $property = Property::where('landlord_id', Auth::id())->findOrFail($id);

        // Find or create the amenity
        $amenity = \App\Models\Amenity::firstOrCreate([
            'name' => trim($request->amenity)
        ]);

        // Attach amenity to property if not already attached
        if (!$property->amenities->contains($amenity->id)) {
            $property->amenities()->attach($amenity->id);
        }

        return response()->json([
            'message' => 'Amenity added successfully',
            'amenity' => $amenity->name
        ], 200);
    }

    public function destroy($id, Request $request)
    {
        // Verify password if provided
        if ($request->has('password')) {
            $user = User::findOrFail(Auth::id());
            if (!Hash::check($request->password, $user->password)) {
                return response()->json([
                    'message' => 'Incorrect password. Please try again.',
                    'error' => 'password_incorrect'
                ], 422);
            }
        }

        DB::beginTransaction();

        try {
            $property = Property::where('landlord_id', Auth::id())
                ->with(['rooms', 'bookings', 'images'])
                ->findOrFail($id);

            // Check if property has active bookings
            $activeBookings = $property->bookings()
                ->whereIn('status', ['pending', 'confirmed'])
                ->count();

            if ($activeBookings > 0) {
                return response()->json([
                    'message' => 'Cannot delete property with active bookings. Please cancel or complete all bookings first.',
                    'error' => 'active_bookings_exist'
                ], 400);
            }

            // Delete property images from storage
            foreach ($property->images as $image) {
                $imagePath = storage_path('app/public/' . $image->image_url);
                if (file_exists($imagePath)) {
                    unlink($imagePath);
                }
            }

            // Delete room images
            foreach ($property->rooms as $room) {
                $roomImages = \App\Models\RoomImage::where('room_id', $room->id)->get();
                foreach ($roomImages as $roomImage) {
                    $roomImagePath = storage_path('app/public/' . $roomImage->image_url);
                    if (file_exists($roomImagePath)) {
                        unlink($roomImagePath);
                    }
                }
            }

            // Delete the property (rooms will be cascade deleted due to foreign key)
            $property->delete();

            DB::commit();

            return response()->json([
                'message' => 'Property and all associated rooms deleted successfully'
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Property not found'
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to delete property',
                'error' => $e->getMessage()
            ], 500);
        }
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
}
