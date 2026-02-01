<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PropertyResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        // Get available rooms - handle when rooms relation is not loaded
        $availableRooms = $this->relationLoaded('rooms') 
            ? $this->rooms->where('status', 'available') 
            : collect();
        $minPrice = $availableRooms->isNotEmpty() ? $availableRooms->min('monthly_rate') : null;
        $maxPrice = $availableRooms->isNotEmpty() ? $availableRooms->max('monthly_rate') : null;

        // Get cover image - handle when images relation is not loaded
        $primaryImage = $this->relationLoaded('images') 
            ? $this->images->where('is_primary', true)->first() 
            : null;
        $coverImage = $primaryImage ?? ($this->relationLoaded('images') ? $this->images->first() : null);

        return [
            'id' => $this->id,
            'title' => $this->title,
            'name' => $this->title,
            'description' => $this->description,
            'property_type' => $this->property_type,
            'type' => ucwords(str_replace('_', ' ', $this->property_type)),
            'current_status' => $this->current_status,

            // Address fields
            'street_address' => $this->street_address,
            'barangay' => $this->barangay,
            'city' => $this->city,
            'province' => $this->province,
            'postal_code' => $this->postal_code,
            'full_address' => $this->full_address,
            'location' => $this->full_address ?: $this->city,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'nearby_landmarks' => $this->nearby_landmarks,

            // Property info
            'property_rules' => $this->property_rules ?? [],
            'total_rooms' => $this->total_rooms,
            'available_rooms' => $availableRooms->count(),
            'rooms_count' => $this->rooms_count ?? $this->total_rooms,
            'available_rooms_count' => $this->available_rooms_count ?? $availableRooms->count(),

            // Pricing
            'min_price' => $minPrice,
            'max_price' => $maxPrice,
            'minPrice' => $minPrice,
            'priceRange' => $this->formatPriceRange($minPrice, $maxPrice),

            // Status flags
            'is_published' => $this->is_published,
            'is_available' => $this->is_available,
            'is_eligible' => $this->is_eligible,

            // Images
            'image' => $this->getImageUrl($coverImage),
            'images' => $this->whenLoaded('images', fn() => 
                $this->images->sortBy('display_order')->map(fn($img) => $this->getImageUrl($img))->values()
            ),

            // Ratings
            'rating' => $this->whenLoaded('reviews', fn() => 
                $this->reviews->count() > 0 ? round($this->reviews->avg('rating'), 1) : null
            ),
            'reviews_count' => $this->whenLoaded('reviews', fn() => $this->reviews->count(), 0),

            // Landlord
            'landlord_id' => $this->landlord_id,
            'user_id' => $this->landlord_id,
            'landlord_name' => $this->whenLoaded('landlord', fn() => 
                trim($this->landlord->first_name . ' ' . $this->landlord->last_name)
            ),
            'owner_name' => $this->whenLoaded('landlord', fn() => 
                trim($this->landlord->first_name . ' ' . $this->landlord->last_name)
            ),
            'landlord' => $this->whenLoaded('landlord', fn() => [
                'id' => $this->landlord->id,
                'first_name' => $this->landlord->first_name,
                'last_name' => $this->landlord->last_name,
                'email' => $this->landlord->email,
                'phone' => $this->landlord->phone,
                'payment_methods_settings' => $this->landlord->payment_methods_settings,
            ]),

            // Rooms
            'rooms' => $this->whenLoaded('rooms', fn() => 
                $this->rooms->map(fn($room) => new RoomResource($room))
            ),

            // Amenities
            'amenities' => $this->whenLoaded('amenities', fn() => 
                $this->amenities->pluck('name')->toArray()
            ),

            // Credentials (for landlord view)
            'credentials' => $this->whenLoaded('credentials', fn() => 
                $this->credentials->map(fn($c) => [
                    'id' => $c->id,
                    'file_path' => $c->file_path,
                    'file_url' => asset('storage/' . $c->file_path),
                    'original_name' => $c->original_name,
                    'mime' => $c->mime,
                ])
            ),

            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
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
}
