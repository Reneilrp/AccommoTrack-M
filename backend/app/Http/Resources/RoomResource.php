<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'room_number' => $this->room_number,
            'room_type' => $this->room_type,
            'type_label' => $this->getRoomTypeLabel($this->room_type),
            'floor' => $this->floor,

            // Pricing
            'monthly_rate' => (float) $this->monthly_rate,
            'daily_rate' => $this->daily_rate ? (float) $this->daily_rate : null,
            'billing_policy' => $this->billing_policy ?? 'monthly',
            'min_stay_days' => $this->min_stay_days,
            'pricing_model' => $this->pricing_model ?? 'full_room',

            // Capacity
            'capacity' => $this->capacity,
            'occupied' => $this->occupied ?? 0,
            'available_slots' => $this->available_slots ?? $this->capacity,

            // Status
            'status' => $this->status,
            'description' => $this->description,

            // Tenant info
            'current_tenant_id' => $this->current_tenant_id,
            'currentTenant' => $this->whenLoaded('currentTenant', fn() => [
                'id' => $this->currentTenant->id,
                'first_name' => $this->currentTenant->first_name,
                'last_name' => $this->currentTenant->last_name,
                'full_name' => $this->currentTenant->first_name . ' ' . $this->currentTenant->last_name,
            ]),

            // Amenities
            'amenities' => $this->whenLoaded('amenities', fn() => 
                $this->amenities->pluck('name')->toArray()
            ),

            // Images
            'images' => $this->whenLoaded('images', fn() => 
                $this->images->pluck('image_url')->map(fn($url) => $this->normalizeImageUrl($url))->toArray()
            ),

            // Property info (when loaded)
            'property' => $this->whenLoaded('property', fn() => [
                'id' => $this->property->id,
                'title' => $this->property->title,
                'landlord_id' => $this->property->landlord_id,
            ]),

            // Landlord info (for booking context)
            'landlord' => $this->when($this->relationLoaded('property') && $this->property?->landlord, fn() => [
                'id' => $this->property->landlord->id,
                'first_name' => $this->property->landlord->first_name,
                'last_name' => $this->property->landlord->last_name,
                'payment_methods_settings' => $this->property->landlord->payment_methods_settings,
            ]),

            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
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
}
