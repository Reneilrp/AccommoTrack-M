<?php

namespace App\Http\Resources;

use App\Models\Room as RoomModel;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Auth;

class RoomResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $lock = $this->active_eviction_lock;
        $durationPricing = $this->normalizedDurationPricing();
        $resolvedStatus = $this->resolveStatus();

        return [
            'id' => $this->id,
            'room_number' => $this->room_number,
            'floor' => $this->floor,
            'room_type' => $this->room_type,
            'sex_restriction' => $this->sex_restriction,
            'type_label' => $this->getRoomTypeLabel($this->room_type),
            'monthly_rate' => (string) $this->monthly_rate,
            'daily_rate' => isset($this->daily_rate) ? (string) $this->daily_rate : null,
            'unit_price' => (float) ($this->billing_policy === 'daily' ? ($this->daily_rate ?? ($this->monthly_rate / 30)) : $this->monthly_rate),
            'billing_policy' => $this->billing_policy ?? 'monthly',
            'pricing_model' => $this->pricing_model ?? 'full_room',
            'duration_pricing' => $durationPricing,
            'long_term_promos' => $this->formatLongTermPromos($durationPricing),
            'capacity' => $this->capacity,
            'occupied' => (int) $this->occupied,
            'occupied_count' => (int) $this->occupied,
            'available_slots' => (int) $this->available_slots,
            'is_available' => $this->isAvailable(),
            'is_booking_locked' => (bool) $this->is_booking_locked,
            'booking_lock' => $lock ? [
                'id' => $lock->id,
                'tenant_id' => $lock->tenant_id,
                'reason' => $lock->reason,
                'scheduled_for' => optional($lock->scheduled_for)->toISOString(),
            ] : null,
            'is_sex_compatible' => $this->when(Auth::check(), function () {
                $tenant = Auth::user();
                $property = $this->property;
                $propertyType = $this->normalizePropertyTypeToken($property?->property_type);
                $targetTypes = ['dormitory', 'boardinghouse', 'bedspacer'];

                if ($propertyType === 'apartment' || ! in_array($propertyType, $targetTypes)) {
                    return true;
                }

                $roomRestriction = strtolower((string) ($this->sex_restriction ?? 'mixed'));
                if ($roomRestriction === 'mixed') {
                    return true;
                }

                $tenantSex = null;
                $g = strtolower(trim($tenant->sex ?? ''));
                if (in_array($g, ['male', 'boy', 'boys'])) {
                    $tenantSex = 'male';
                }
                if (in_array($g, ['female', 'girl', 'girls'])) {
                    $tenantSex = 'female';
                }

                return $roomRestriction === $tenantSex;
            }),
            'tenant' => $this->tenant,
            'tenants' => $this->whenLoaded('tenants', function () {
                $latestBookingByTenantId = collect($this->whenLoaded('bookings', function () {
                    return $this->bookings;
                }, collect()))
                    ->filter(fn ($booking) => ! is_null($booking->tenant_id))
                    ->sortByDesc(fn ($booking) => optional($booking->start_date)->timestamp ?? 0)
                    ->groupBy('tenant_id')
                    ->map(fn ($tenantBookings) => $tenantBookings->first());

                $list = $this->tenants->map(function ($t) use ($latestBookingByTenantId) {
                    $tenantBooking = $latestBookingByTenantId->get($t->id);
                    $bookingMode = $tenantBooking?->booking_mode;
                    $bedCount = max(1, (int) ($tenantBooking?->bed_count ?? 1));
                    $occupants = collect($tenantBooking?->occupants ?? [])->map(function ($occupant) {
                        return [
                            'id' => $occupant->id,
                            'first_name' => $occupant->first_name,
                            'middle_name' => $occupant->middle_name,
                            'last_name' => $occupant->last_name,
                            'sex' => $occupant->sex,
                            'date_of_birth' => $occupant->date_of_birth,
                            'relationship_to_booker' => $occupant->relationship_to_booker,
                            'email' => $occupant->email,
                            'phone' => $occupant->phone,
                        ];
                    })->values()->toArray();

                    $occupantCount = count($occupants);
                    if ($occupantCount <= 0 && $bookingMode === 'proxy') {
                        $occupantCount = $bedCount;
                    }

                    return [
                        'id' => $t->id,
                        'name' => $t->first_name.' '.$t->last_name,
                        'email' => $t->email,
                        'phone' => $t->phone,
                        'is_user' => true,
                        'booking_id' => $tenantBooking?->id,
                        'booking_mode' => $bookingMode,
                        'bed_count' => $bedCount,
                        'occupant_count' => max(1, $occupantCount),
                        'is_proxy_account' => $bookingMode === 'proxy',
                        'occupants' => $occupants,
                    ];
                })->toArray();

                // Add confirmed walk-in guests
                $walkins = \App\Models\Booking::where('room_id', $this->id)
                    ->whereIn('status', ['confirmed', 'completed', 'partial-completed'])
                    ->whereNull('tenant_id')
                    ->where('start_date', '<=', now())
                    ->where(function ($query) {
                        $query->whereNull('end_date')
                            ->orWhere('end_date', '>=', now());
                    })
                    ->with('occupants')
                    ->get()
                    ->map(function ($b) {
                        $occupants = $b->occupants->map(function ($occupant) {
                            return [
                                'id' => $occupant->id,
                                'first_name' => $occupant->first_name,
                                'middle_name' => $occupant->middle_name,
                                'last_name' => $occupant->last_name,
                                'sex' => $occupant->sex,                                'date_of_birth' => $occupant->date_of_birth,
                                'relationship_to_booker' => $occupant->relationship_to_booker,
                                'email' => $occupant->email,
                                'phone' => $occupant->phone,
                            ];
                        })->values()->toArray();

                        $occupantCount = count($occupants);
                        if ($occupantCount <= 0 && $b->booking_mode === 'proxy') {
                            $occupantCount = max(1, (int) $b->bed_count);
                        }

                        return [
                            'id' => null,
                            'booking_id' => $b->id,
                            'name' => $b->guest_name,
                            'email' => null,
                            'phone' => null,
                            'is_user' => false,
                            'booking_mode' => $b->booking_mode,
                            'bed_count' => max(1, (int) ($b->bed_count ?? 1)),
                            'occupant_count' => max(1, $occupantCount),
                            'is_proxy_account' => $b->booking_mode === 'proxy',
                            'occupants' => $occupants,
                        ];
                    })->toArray();

                return array_merge($list, $walkins);
            }),
            'status' => $resolvedStatus,
            'display_status' => $this->display_status,
            'display_status_label' => ucfirst((string) $this->display_status),
            'require_1month_advance' => (bool) $this->require_1month_advance,
            'requires_advance' => (bool) $this->requiresAdvance(),
            'description' => $this->description,
            'rules' => $this->rules ?? [],
            'amenities' => $this->whenLoaded('amenities', fn () => $this->amenities->pluck('name')->toArray(), []),
            'images' => $this->whenLoaded('images', fn () => $this->images->pluck('image_url')->map(function ($url) {
                return str_starts_with($url, 'http') ? $url : \Illuminate\Support\Facades\Storage::url($url);
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

    /**
     * @return array<string, array{discount_type: string, discount_value: float}>
     */
    private function normalizedDurationPricing(): array
    {
        return RoomModel::sanitizeDurationPricing($this->duration_pricing);
    }

    /**
     * @param  array<string, array{discount_type: string, discount_value: float}>  $durationPricing
     * @return array<int, array{months: int, discount_type: string, discount_value: float, label: string}>
     */
    private function formatLongTermPromos(array $durationPricing): array
    {
        return collect($durationPricing)
            ->map(function (array $promo, string $months): array {
                $termMonths = (int) $months;

                return [
                    'months' => $termMonths,
                    'discount_type' => $promo['discount_type'],
                    'discount_value' => (float) $promo['discount_value'],
                    'label' => $this->buildPromoLabel($termMonths, $promo),
                ];
            })
            ->sortBy('months')
            ->values()
            ->all();
    }

    /**
     * @param  array{discount_type: string, discount_value: float}  $promo
     */
    private function buildPromoLabel(int $months, array $promo): string
    {
        $discountLabel = $promo['discount_type'] === 'percent'
            ? rtrim(rtrim(number_format((float) $promo['discount_value'], 2), '0'), '.').'% off'
            : 'PHP '.number_format((float) $promo['discount_value'], 2).' off';

        return $months.'-month promo: '.$discountLabel;
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

    private function normalizePropertyTypeToken(?string $propertyType): string
    {
        return strtolower(str_replace([' ', '_', '-'], '', (string) $propertyType));
    }

    private function resolveStatus(): string
    {
        if ($this->status === 'maintenance') {
            return 'maintenance';
        }

        $capacity = max(1, (int) ($this->capacity ?? 1));
        $occupiedCount = (int) $this->occupied;

        return $occupiedCount >= $capacity ? 'occupied' : 'available';
    }
}
