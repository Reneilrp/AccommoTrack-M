<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PropertyResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Calculations for price and ratings
        $availableRooms = $this->relationLoaded('rooms') ? $this->rooms->filter(function ($room) {
            return $room->isAvailable();
        }) : collect();
        $minPrice = $availableRooms->min('monthly_rate');
        $maxPrice = $availableRooms->max('monthly_rate');
        $avgRating = $this->whenLoaded('reviews', fn () => $this->reviews->count() > 0 ? round($this->reviews->avg('rating'), 1) : null);

        // Image and Video logic
        $coverImage = null;
        $video = null;

        if ($this->relationLoaded('images')) {
            $imageMedia = $this->images->where('media_type', 'image');
            $primary = $imageMedia->where('is_primary', true)->first();
            $coverImage = $primary ?? $imageMedia->sortBy('display_order')->first();

            $video = $this->images->where('media_type', 'video')->first();
        }

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'property_type' => $this->property_type,
            'sex_restriction' => $this->sex_restriction,
            'type' => $this->formatPropertyTypeLabel($this->property_type),
            'has_bedspacer_room' => $availableRooms->contains(function ($room) {
                $roomType = strtolower(str_replace([' ', '_', '-'], '', (string) ($room->room_type ?? '')));

                return $roomType === 'bedspacer';
            }),
            'full_address' => $this->full_address,
            'street_address' => $this->street_address,
            'city' => $this->city,
            'province' => $this->province,
            'barangay' => $this->barangay,
            'postal_code' => $this->postal_code,
            'location' => $this->full_address ?: $this->city,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'nearby_landmarks' => $this->nearby_landmarks,
            'max_occupants' => (int) $this->max_occupants,
            'number_of_bedrooms' => (int) $this->number_of_bedrooms,
            'number_of_bathrooms' => (int) $this->number_of_bathrooms,
            'floor_area' => (float) $this->floor_area,
            'floor_level' => $this->floor_level,
            'total_floors' => (int) $this->total_floors,
            'property_rules' => $this->property_rules ?? [],
            'curfew_time' => $this->curfew_time,
            'curfew_policy' => $this->curfew_policy,
            'total_rooms' => $this->rooms_count ?? ($this->relationLoaded('rooms') ? $this->rooms->count() : 0),
            'available_rooms' => $this->available_rooms_count ?? (
                $this->relationLoaded('rooms')
                ? $this->rooms->filter(fn ($room) => $room->isAvailable())->count()
                : 0
            ),
            'minPrice' => $minPrice,
            'maxPrice' => $maxPrice,
            'lowest_price' => $minPrice,
            'price' => $minPrice,
            'priceRange' => $minPrice && $maxPrice
                ? ($minPrice == $maxPrice ? '₱'.number_format($minPrice, 0) : '₱'.number_format($minPrice, 0).' - ₱'.number_format($maxPrice, 0))
                : 'Price on request',
            'rating' => $avgRating,
            'reviews_count' => $this->whenLoaded('reviews', fn () => $this->reviews->count()),
            'amenities_list' => $this->whenLoaded('amenities', fn () => $this->amenities->pluck('name')->toArray(), []),
            'image' => $coverImage ? (str_starts_with($coverImage->image_url, 'http') ? $coverImage->image_url : \Illuminate\Support\Facades\Storage::url($coverImage->image_url)) : 'https://via.placeholder.com/400x200?text=No+Image',
            'video_url' => $video ? (str_starts_with($video->image_url, 'http') ? $video->image_url : \Illuminate\Support\Facades\Storage::url($video->image_url)) : null,
            'images' => $this->whenLoaded('images', fn () => $this->images->where('media_type', 'image')->sortBy('display_order')->map(fn ($img) => [
                'id' => $img->id,
                'image_url' => str_starts_with($img->image_url, 'http') ? $img->image_url : \Illuminate\Support\Facades\Storage::url($img->image_url),
                'is_primary' => (bool) $img->is_primary,
                'display_order' => $img->display_order,
            ])->values()->toArray()),
            'landlord_id' => $this->landlord_id,
            'landlord' => $this->whenLoaded('landlord', fn () => [
                'id' => $this->landlord->id,
                'name' => $this->landlord->full_name,
                'first_name' => $this->landlord->first_name,
                'last_name' => $this->landlord->last_name,
                'email' => $this->landlord->email,
                'phone' => $this->landlord->phone,
                'payment_methods_settings' => $this->landlord->payment_methods_settings,
            ]),
            'rooms' => RoomResource::collection($this->whenLoaded('rooms')),
            'current_status' => $this->current_status,
            'require_1month_advance' => (bool) $this->require_1month_advance,
            'allow_partial_payments' => (bool) $this->allow_partial_payments,
            'force_wallet_refunds' => (bool) ($this->force_wallet_refunds ?? true),
            'normal_booking_limit' => (int) $this->normal_booking_limit,
            'proxy_booking_limit' => (int) $this->proxy_booking_limit,
            'min_partial_payment_pct' => (int) $this->min_partial_payment_pct,
            'require_reservation_fee' => (bool) $this->require_reservation_fee,
            'reservation_fee_amount' => (float) $this->reservation_fee,
            'reservation_fee_gap_days' => (int) ($this->reservation_fee_gap_days ?? 3),
            'gcash_name' => $this->gcash_name,
            'gcash_number' => $this->gcash_number,
            'gcash_qr_path' => $this->gcash_qr_path ? (str_starts_with($this->gcash_qr_path, 'http') ? $this->gcash_qr_path : \Illuminate\Support\Facades\Storage::url($this->gcash_qr_path)) : null,
            'is_published' => (bool) $this->is_published,
            'is_available' => (bool) $this->is_available,
            'is_eligible' => (bool) $this->is_eligible,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function formatPropertyTypeLabel(?string $value): string
    {
        $raw = trim((string) $value);
        if ($raw === '') {
            return 'Property';
        }

        $normalized = strtolower(str_replace([' ', '_', '-'], '', $raw));

        return match ($normalized) {
            'dormitory' => 'Dormitory',
            'apartment' => 'Apartment',
            'boardinghouse' => 'Boarding House',
            'bedspacer' => 'Bed Spacer',
            default => (function () use ($raw) {
                $spacedByCase = preg_replace('/(?<!^)[A-Z]/', ' $0', $raw);
                $spacedByCase = $spacedByCase ?? $raw;
                $spaced = str_replace(['_', '-'], ' ', $spacedByCase);
                $spaced = preg_replace('/\s+/', ' ', $spaced);
                $spaced = $spaced ?? $raw;

                return ucwords(strtolower(trim($spaced)));
            })(),
        };
    }
}
