<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        $reservationPolicy = $this->buildReservationPolicy();
        $resolvedBedCount = max(1, (int) ($this->bed_count ?? 1));
        $resolvedOccupantCount = (int) ($this->occupants_count ?? 0);

        if ($resolvedOccupantCount <= 0 && $this->relationLoaded('occupants')) {
            $resolvedOccupantCount = (int) $this->occupants->count();
        }

        if ($resolvedOccupantCount <= 0 && $this->booking_mode === 'proxy') {
            $resolvedOccupantCount = $resolvedBedCount;
        }

        $resolvedOccupiedSlots = $this->resource->resolveOccupiedSlots($resolvedOccupantCount);
        $effectiveMonthlyRent = $this->resource->resolveEffectiveMonthlyRent($resolvedOccupiedSlots);
        $resolvedUnitPrice = (float) ($this->room?->billing_policy === 'daily'
            ? ($this->room->daily_rate ?? ($effectiveMonthlyRent / 30))
            : $effectiveMonthlyRent);

        return [
            'id' => $this->id,
            'booking_reference' => $this->booking_reference,
            'bookingReference' => $this->booking_reference,
            'guestName' => $this->guest_name ?: ($this->tenant ? $this->tenant->first_name.' '.$this->tenant->last_name : 'N/A'),
            'guest_name' => $this->guest_name ?: ($this->tenant ? $this->tenant->first_name.' '.$this->tenant->last_name : 'N/A'),
            'email' => $this->tenant?->email,
            'phone' => $this->tenant?->phone ?? 'N/A',
            'roomType' => $this->room?->room_type ?? 'N/A',
            'room_type' => $this->room?->room_type ?? 'N/A',
            'roomNumber' => $this->room?->room_number ?? 'N/A',
            'room_number' => $this->room?->room_number ?? 'N/A',
            'propertyTitle' => $this->property?->title,
            'property_title' => $this->property?->title,
            'property_id' => $this->property_id,
            'room_id' => $this->room_id,
            'tenant_id' => $this->tenant_id,
            'bookingMode' => $this->booking_mode,
            'booking_mode' => $this->booking_mode,
            'bedCount' => $resolvedBedCount,
            'bed_count' => $resolvedBedCount,
            'occupantCount' => $resolvedOccupantCount,
            'occupant_count' => $resolvedOccupantCount,
            'bookingGroupReference' => $this->booking_group_reference,
            'booking_group_reference' => $this->booking_group_reference,
            'landlord_id' => $this->landlord_id,
            'checkIn' => $this->start_date,
            'checkOut' => $this->end_date,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'next_billing_date' => $this->next_billing_date,
            'billing_day' => $this->billing_day,
            'deposit_balance' => (float) ($this->deposit_balance ?? 0),
            'notice_given_at' => $this->notice_given_at,
            'duration' => $this->total_months.' month'.($this->total_months > 1 ? 's' : ''),
            'total_months' => $this->total_months,
            'amount' => (float) $this->total_amount,
            'total_amount' => (float) $this->total_amount,
            'monthlyRent' => (float) $effectiveMonthlyRent,
            'monthly_rent' => (float) $effectiveMonthlyRent,
            'unit_price' => $resolvedUnitPrice,
            'billing_policy' => $this->room?->billing_policy ?? 'monthly',
            'status' => $this->status,
            'is_overdue' => $this->end_date
                ? now()->gt($this->end_date) && ! in_array($this->status, ['completed', 'cancelled'])
                : false,
            'paymentStatus' => $this->payment_status,
            'payment_status' => $this->payment_status,
            'paymentPlan' => $this->payment_plan,
            'payment_plan' => $this->payment_plan,
            'contractMode' => $this->contract_mode,
            'contract_mode' => $this->contract_mode,
            'receipt_image_path' => $this->receipt_image_path ? (str_starts_with($this->receipt_image_path, 'http') ? $this->receipt_image_path : \Illuminate\Support\Facades\Storage::url($this->receipt_image_path)) : null,
            'reference_number' => $this->reference_number,
            'move_in_date' => $this->move_in_date,
            'reservation_policy' => $reservationPolicy,
            'can_request_addon' => $this->payment_status !== 'refunded' && ! in_array($this->status, ['cancelled', 'rejected']),
            'notes' => $this->notes,
            'cancellation_reason' => $this->cancellation_reason,
            'cancelled_at' => $this->cancelled_at,
            'confirmed_at' => $this->confirmed_at,
            'refund_amount' => $this->refund_amount,
            'refund_processed_at' => $this->refund_processed_at,
            'has_review' => $this->resource->review_exists ?? $this->review()->exists(),
            'review' => $this->whenLoaded('review', fn () => [
                'id' => $this->review->id,
                'rating' => $this->review->rating,
                'comment' => $this->review->comment,
            ]) ?: (($this->resource->review_exists ?? $this->review()->exists()) && $this->review ? [
                'id' => $this->review->id,
                'rating' => $this->review->rating,
                'comment' => $this->review->comment,
            ] : null),
            'occupants' => $this->whenLoaded('occupants', fn () => $this->occupants->map(fn ($occupant) => [
                'id' => $occupant->id,
                'first_name' => $occupant->first_name,
                'middle_name' => $occupant->middle_name,
                'last_name' => $occupant->last_name,
                'date_of_birth' => $occupant->date_of_birth,
                'sex' => $occupant->sex,
                'relationship_to_booker' => $occupant->relationship_to_booker,
                'phone' => $occupant->phone,
                'email' => $occupant->email,
                'notes' => $occupant->notes,
            ])->values()),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,

            // Relationships (when loaded)
            'property' => $this->whenLoaded('property', fn () => [
                'id' => $this->property->id,
                'title' => $this->property->title,
                'name' => $this->property->title,
                'full_address' => $this->property->full_address,
                'address' => $this->property->full_address,
                'image' => $this->property->image_url,
            ]),
            'tenant' => $this->whenLoaded('tenant', fn () => [
                'id' => $this->tenant->id,
                'first_name' => $this->tenant->first_name,
                'last_name' => $this->tenant->last_name,
                'name' => $this->tenant->first_name.' '.$this->tenant->last_name,
                'email' => $this->tenant->email,
                'phone' => $this->tenant->phone,
                'tenantProfile' => $this->tenant->tenantProfile ? [
                    'status' => $this->tenant->tenantProfile->status,
                    'move_in_date' => $this->tenant->tenantProfile->move_in_date,
                    'move_out_date' => $this->tenant->tenantProfile->move_out_date,
                ] : null,
            ]),
            'room' => $this->whenLoaded('room', fn () => [
                'id' => $this->room->id,
                'room_number' => $this->room->room_number,
                'name' => $this->room->room_number,
                'room_type' => $this->room->room_type,
                'capacity' => (int) ($this->room->capacity ?? 0),
                'floor' => $this->room->floor,
                'status' => $this->room->status,
                'billing_policy' => $this->room->billing_policy ?? 'monthly',
                'pricing_model' => $this->room->pricing_model ?? 'full_room',
                'monthly_rate' => (float) $this->room->monthly_rate,
                'daily_rate' => (float) $this->room->daily_rate,
                'currentTenant' => $this->room->currentTenant ? [
                    'id' => $this->room->currentTenant->id,
                    'first_name' => $this->room->currentTenant->first_name,
                    'last_name' => $this->room->currentTenant->last_name,
                ] : null,
            ]),
            'landlord' => $this->whenLoaded('landlord', fn () => [
                'id' => $this->landlord->id,
                'first_name' => $this->landlord->first_name,
                'last_name' => $this->landlord->last_name,
                'name' => $this->landlord->first_name.' '.$this->landlord->last_name,
                'email' => $this->landlord->email,
                'phone' => $this->landlord->phone,
            ]),
        ];
    }

    private function buildReservationPolicy(): ?array
    {
        if (! $this->relationLoaded('property') || ! $this->property) {
            return null;
        }

        $thresholdDays = max(0, (int) ($this->property->reservation_fee_gap_days ?? 3));
        $issuedDate = ($this->created_at ?? now())->copy()->startOfDay();
        $moveInDate = $this->start_date
            ? Carbon::parse($this->start_date)->startOfDay()
            : null;
        $daysGap = $moveInDate
            ? max(0, $issuedDate->diffInDays($moveInDate, false))
            : 0;

        $reservationFeeEnabled = (bool) ($this->property->require_reservation_fee ?? false);
        $reservationFeeAmount = (float) ($this->property->reservation_fee ?? 0);
        $reservationFeeConfigured = $reservationFeeEnabled && $reservationFeeAmount > 0;
        $feeRequired = $reservationFeeConfigured && $daysGap > $thresholdDays;

        if (! $reservationFeeConfigured) {
            $message = 'No reservation fee is configured for this property.';
        } elseif ($feeRequired) {
            $message = "Reservation fee is required because move-in is {$daysGap} days after booking date.";
        } else {
            $message = "No reservation fee is required because move-in is within {$thresholdDays} days from booking date.";
        }

        return [
            'fee_required' => $feeRequired,
            'fee_amount' => $reservationFeeAmount,
            'days_gap' => $daysGap,
            'threshold_days' => $thresholdDays,
            'comparator' => 'days_gap > threshold_days',
            'booking_issued_date' => $issuedDate->toDateString(),
            'move_in_date' => $moveInDate?->toDateString(),
            'message' => $message,
        ];
    }
}
