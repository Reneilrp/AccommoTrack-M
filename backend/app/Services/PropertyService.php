<?php

namespace App\Services;

use App\Models\Property;
use App\Models\PropertyImage;
use App\Models\PropertyCredential;
use App\Models\Amenity;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;

class PropertyService
{
    /**
     * Get all published properties with filters for tenant browsing
     */
    public function getPublishedProperties(array $filters = []): array
    {
        $query = Property::query()
            ->published()
            ->available();

        // Apply search filter
        if (!empty($filters['search'])) {
            $query->search($filters['search']);
        }

        // Apply type filter
        if (!empty($filters['type']) && $filters['type'] !== 'All') {
            $type = strtolower(str_replace(' ', '_', $filters['type']));
            $query->where('property_type', $type);
        }

        // Apply price filter
        if (!empty($filters['min_price']) || !empty($filters['max_price'])) {
            $query->whereHas('rooms', function ($q) use ($filters) {
                $q->where('status', 'available');
                if (!empty($filters['min_price'])) {
                    $q->where('monthly_rate', '>=', $filters['min_price']);
                }
                if (!empty($filters['max_price'])) {
                    $q->where('monthly_rate', '<=', $filters['max_price']);
                }
            });
        }

        /** @var \Illuminate\Database\Eloquent\Collection<int, Property> $properties */
        $properties = $query->with([
            'rooms.images',
            'rooms.amenities',
            'images',
            'landlord:id,first_name,last_name',
            'reviews' => fn($q) => $q->where('is_published', true)
        ])
            ->orderBy('created_at', 'desc')
            ->get();

        return $properties->map(fn(Property $property) => $this->transformForList($property))->toArray();
    }

    /**
     * Get property details for tenant viewing
     */
    public function getPropertyDetails(int $propertyId): ?array
    {
        $property = Property::query()
            ->published()
            ->available()
            ->with([
                'rooms' => fn($q) => $q->with('amenities', 'images'),
                'images',
                'landlord:id,first_name,last_name,email,phone,payment_methods_settings'
            ])
            ->find($propertyId);

        if (!$property) {
            return null;
        }

        return $this->transformForDetails($property);
    }

    /**
     * Get landlord's properties
     */
    public function getLandlordProperties(int $landlordId): array
    {
        /** @var \Illuminate\Database\Eloquent\Collection<int, Property> $properties */
        $properties = Property::where('landlord_id', $landlordId)
            ->withCount(['rooms', 'rooms as available_rooms' => fn($q) => $q->where('status', 'available')])
            ->with(['images', 'amenities', 'credentials'])
            ->orderBy('created_at', 'desc')
            ->get();

        return $properties->map(fn(Property $property) => $this->transformForLandlord($property))
            ->toArray();
    }

    /**
     * Create a new property
     */
    public function createProperty(array $data, int $landlordId): Property
    {
        $currentStatus = ($data['is_draft'] ?? false) ? 'draft' : ($data['current_status'] ?? 'pending');

        $property = Property::create([
            'landlord_id' => $landlordId,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'property_type' => $data['property_type'],
            'current_status' => $currentStatus,
            'street_address' => $data['street_address'],
            'city' => $data['city'],
            'province' => $data['province'],
            'barangay' => $data['barangay'] ?? null,
            'postal_code' => $data['postal_code'] ?? null,
            'latitude' => $data['latitude'] ?? null,
            'longitude' => $data['longitude'] ?? null,
            'nearby_landmarks' => $data['nearby_landmarks'] ?? null,
            'property_rules' => $data['property_rules'] ?? null,
            'total_rooms' => 0,
            'available_rooms' => 0,
            'is_published' => $data['is_published'] ?? false,
            'is_available' => $data['is_available'] ?? false,
            'is_eligible' => $data['is_eligible'] ?? false,
        ]);

        return $property;
    }

    /**
     * Update a property
     */
    public function updateProperty(Property $property, array $data): Property
    {
        $updateData = array_filter([
            'title' => $data['title'] ?? null,
            'description' => $data['description'] ?? null,
            'property_type' => $data['property_type'] ?? null,
            'current_status' => $data['current_status'] ?? null,
            'street_address' => $data['street_address'] ?? null,
            'city' => $data['city'] ?? null,
            'province' => $data['province'] ?? null,
            'barangay' => $data['barangay'] ?? null,
            'postal_code' => $data['postal_code'] ?? null,
            'latitude' => $data['latitude'] ?? null,
            'longitude' => $data['longitude'] ?? null,
            'nearby_landmarks' => $data['nearby_landmarks'] ?? null,
            'property_rules' => $data['property_rules'] ?? null,
            'is_published' => $data['is_published'] ?? null,
            'is_available' => $data['is_available'] ?? null,
        ], fn($value) => $value !== null);

        $property->update($updateData);

        return $property->fresh();
    }

    /**
     * Handle image uploads for a property
     */
    public function handleImageUploads(Property $property, array $images): void
    {
        foreach ($images as $index => $file) {
            $path = $file->store('property_images', 'public');
            $filename = basename($path);

            PropertyImage::create([
                'property_id' => $property->id,
                'image_url' => 'property_images/' . $filename,
                'is_primary' => $index === 0 && $property->images()->count() === 0,
                'display_order' => $property->images()->count() + $index,
            ]);
        }
    }

    /**
     * Handle credential uploads for a property
     */
    public function handleCredentialUploads(Property $property, array $files): void
    {
        foreach ($files as $file) {
            $path = $file->store('property_credentials', 'public');

            PropertyCredential::create([
                'property_id' => $property->id,
                'file_path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime' => $file->getClientMimeType(),
            ]);
        }
    }

    /**
     * Sync amenities for a property
     */
    public function syncAmenities(Property $property, array $amenityNames): void
    {
        $amenityIds = [];

        foreach ($amenityNames as $amenityName) {
            if (!empty($amenityName)) {
                $amenity = Amenity::firstOrCreate(['name' => $amenityName]);
                $amenityIds[] = $amenity->id;
            }
        }

        $property->amenities()->sync($amenityIds);
    }

    /**
     * Transform property for list view (tenant browsing)
     */
    public function transformForList(Property $property): array
    {
        $availableRooms = $property->rooms->where('status', 'available');
        $minPrice = $availableRooms->min('monthly_rate');
        $maxPrice = $availableRooms->max('monthly_rate');

        $primaryImage = $property->images->where('is_primary', true)->first();
        $coverImage = $primaryImage ?? $property->images->first();

        $hasBedSpacerRoom = $availableRooms->contains('room_type', 'bedSpacer');
        $avgRating = $property->reviews->count() > 0
            ? round($property->reviews->avg('rating'), 1)
            : null;

        return [
            'id' => $property->id,
            'name' => $property->title,
            'title' => $property->title,
            'type' => ucwords(str_replace('_', ' ', $property->property_type)),
            'property_type' => $property->property_type,
            'has_bedspacer_room' => $hasBedSpacerRoom,
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
            'priceRange' => $this->formatPriceRange($minPrice, $maxPrice),
            'image' => $this->getImageUrl($coverImage),
            'rating' => $avgRating,
            'reviews_count' => $property->reviews->count(),
            'landlord_id' => $property->landlord_id,
            'landlord_name' => $property->landlord
                ? trim($property->landlord->first_name . ' ' . $property->landlord->last_name)
                : 'Landlord',
            'created_at' => $property->created_at,
            'updated_at' => $property->updated_at,
            'property_rules' => $property->property_rules ?? [],
            'rooms' => $availableRooms->map(fn($room) => $this->transformRoomForList($room))->values(),
        ];
    }

    /**
     * Transform property for detail view
     */
    public function transformForDetails(Property $property): array
    {
        $availableRoomsForPrice = $property->rooms->where('status', 'available');
        $minPrice = $availableRoomsForPrice->min('monthly_rate');
        $maxPrice = $availableRoomsForPrice->max('monthly_rate');

        $primaryImage = $property->images->where('is_primary', true)->first();
        $coverImage = $primaryImage ?? $property->images->first();

        return [
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
            'price_range' => $this->formatPriceRange($minPrice, $maxPrice),
            'image' => $this->getImageUrl($coverImage),
            'images' => $property->images->sortBy('display_order')->map(fn($img) => $this->getImageUrl($img))->values()->toArray(),
            'landlord_id' => $property->landlord_id,
            'user_id' => $property->landlord_id,
            'landlord_name' => $property->landlord
                ? trim($property->landlord->first_name . ' ' . $property->landlord->last_name)
                : 'Landlord',
            'owner_name' => $property->landlord
                ? trim($property->landlord->first_name . ' ' . $property->landlord->last_name)
                : 'Landlord',
            'landlord' => $property->landlord ? [
                'id' => $property->landlord->id,
                'first_name' => $property->landlord->first_name,
                'last_name' => $property->landlord->last_name,
                'email' => $property->landlord->email,
                'phone' => $property->landlord->phone,
                'payment_methods_settings' => $property->landlord->payment_methods_settings,
            ] : null,
            'rooms' => $property->rooms->map(fn($room) => $this->transformRoomForDetails($room, $property))->values(),
        ];
    }

    /**
     * Transform property for landlord dashboard
     */
    protected function transformForLandlord(Property $property): array
    {
        $propertyArray = $property->toArray();
        $propertyArray['amenities'] = $property->amenities->pluck('name')->toArray();

        if (isset($propertyArray['credentials']) && is_array($propertyArray['credentials'])) {
            $propertyArray['credentials'] = array_map(function ($c) {
                return array_merge($c, ['file_url' => asset('storage/' . ($c['file_path'] ?? ''))]);
            }, $propertyArray['credentials']);
        }

        return $propertyArray;
    }

    /**
     * Transform room for list view
     */
    protected function transformRoomForList($room): array
    {
        return [
            'id' => $room->id,
            'room_number' => $room->room_number,
            'floor' => $room->floor,
            'room_type' => $room->room_type,
            'monthly_rate' => $room->monthly_rate,
            'billing_policy' => $room->billing_policy,
            'status' => $room->status,
            'capacity' => $room->capacity,
            'description' => $room->description,
            'amenities' => $room->amenities ? $room->amenities->pluck('name')->toArray() : [],
            'images' => $room->images ? $room->images->pluck('image_url')->toArray() : [],
        ];
    }

    /**
     * Transform room for detail view
     */
    protected function transformRoomForDetails($room, Property $property): array
    {
        return [
            'id' => $room->id,
            'room_number' => $room->room_number,
            'floor' => $room->floor,
            'room_type' => $room->room_type,
            'type_label' => $this->getRoomTypeLabel($room->room_type),
            'monthly_rate' => (float) $room->monthly_rate,
            'daily_rate' => isset($room->daily_rate) ? (float) $room->daily_rate : null,
            'billing_policy' => $room->billing_policy ?? 'monthly',
            'capacity' => $room->capacity,
            'status' => $room->status,
            'description' => $room->description,
            'amenities' => $room->amenities?->pluck('name')->toArray() ?? [],
            'images' => $room->images?->pluck('image_url')->map(fn($url) => $this->normalizeImageUrl($url))->toArray() ?? [],
            'landlord' => $property->landlord ? [
                'id' => $property->landlord->id,
                'first_name' => $property->landlord->first_name,
                'last_name' => $property->landlord->last_name,
                'payment_methods_settings' => $property->landlord->payment_methods_settings,
            ] : null,
        ];
    }

    /**
     * Helper: Format price range string
     */
    protected function formatPriceRange($minPrice, $maxPrice): string
    {
        if (!$minPrice && !$maxPrice) {
            return 'Contact for price';
        }

        if ($minPrice == $maxPrice) {
            return '₱' . number_format($minPrice, 0);
        }

        return '₱' . number_format($minPrice, 0) . ' - ₱' . number_format($maxPrice, 0);
    }

    /**
     * Helper: Get full image URL
     */
    protected function getImageUrl($image): ?string
    {
        if (!$image) {
            return 'https://via.placeholder.com/400x200?text=No+Image';
        }

        $url = is_string($image) ? $image : $image->image_url;

        if (str_starts_with($url, 'http')) {
            return $url;
        }

        return asset('storage/' . ltrim($url, '/'));
    }

    /**
     * Helper: Normalize image URL
     */
    protected function normalizeImageUrl(string $url): string
    {
        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }

        return asset('storage/' . ltrim($url, '/'));
    }

    /**
     * Helper: Get room type label
     */
    protected function getRoomTypeLabel(string $type): string
    {
        return match ($type) {
            'single' => 'Single Room',
            'double' => 'Double Room',
            'quad' => 'Quad Room',
            'bedSpacer' => 'Bed Spacer',
            default => ucfirst($type),
        };
    }
}
