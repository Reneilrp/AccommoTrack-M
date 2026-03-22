<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'room_number' => $this->room_number,
            'floor' => $this->floor,
            'room_type' => $this->room_type,
            'gender_restriction' => $this->gender_restriction,
            'type_label' => $this->getRoomTypeLabel($this->room_type),
            'monthly_rate' => (string) $this->monthly_rate,
            'daily_rate' => isset($this->daily_rate) ? (string) $this->daily_rate : null,
            'unit_price' => (float) ($this->billing_policy === 'daily' ? ($this->daily_rate ?? ($this->monthly_rate / 30)) : $this->monthly_rate),
            'billing_policy' => $this->billing_policy ?? 'monthly',
            'pricing_model' => $this->pricing_model ?? 'full_room',
            'capacity' => $this->capacity,
            'occupied' => (int) $this->occupied,
            'occupied_count' => (int) $this->occupied,
            'available_slots' => (int) $this->available_slots,
            'tenant' => $this->tenant,
            'tenants' => $this->whenLoaded('tenants', function () {
                $list = $this->tenants->map(function ($t) {
                    return [
                        'id' => $t->id,
                        'name' => $t->first_name.' '.$t->last_name,
                        'email' => $t->email,
                        'phone' => $t->phone,
                        'is_user' => true,
                    ];
                })->toArray();

                // Add confirmed walk-in guests
                $walkins = \App\Models\Booking::where('room_id', $this->id)
                    ->whereIn('status', ['confirmed', 'completed', 'partial-completed'])
                    ->whereNull('tenant_id')
                    ->where('start_date', '<=', now())
                    ->where('end_date', '>=', now())
                    ->get()
                    ->map(function ($b) {
                        return [
                            'id' => null,
                            'booking_id' => $b->id,
                            'name' => $b->guest_name,
                            'email' => null,
                            'phone' => null,
                            'is_user' => false,
                        ];
                    })->toArray();

                return array_merge($list, $walkins);
            }),
            'status' => $this->status,
            'require_1month_advance' => (bool) $this->require_1month_advance,
            'requires_advance' => (bool) $this->requiresAdvance(),
            'description' => $this->description,
            'rules' => $this->rules ?? [],
            'amenities' => $this->whenLoaded('amenities', fn () => $this->amenities->pluck('name')->toArray(), []),
            'images' => $this->whenLoaded('images', fn () => $this->images->pluck('image_url')->map(function ($url) {
                return str_starts_with($url, 'http') ? $url : asset('storage/'.ltrim($url, '/'));
            })->toArray(), []),
            'landlord' => $this->whenLoaded('property', fn () => $this->property->landlord ? [
                'id' => $this->property->landlord->id,
                'first_name' => $this->property->landlord->first_name,
                'last_name' => $this->property->landlord->last_name,
                'payment_methods_settings' => $this->property->landlord->payment_methods_settings,
            ] : null),
            'reserved_by_me' => $this->whenLoaded('bookings', fn () => $this->bookings->isNotEmpty(), false),
            'reservation' => $this->whenLoaded('bookings', fn () => $this->bookings->first()
                ? $this->bookings->first()->only(['id', 'status', 'start_date', 'end_date'])
                : null, null),
        ];
    }

    private function getRoomTypeLabel($roomType)
    {
        return [
            'single' => 'Single Room',
            'double' => 'Double Room',
            'quad' => 'Quad Room',
            'bedSpacer' => 'Bed Spacer',
        ][$roomType] ?? ucfirst($roomType);
    }
}
