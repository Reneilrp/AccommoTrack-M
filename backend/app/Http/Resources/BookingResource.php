<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'booking_reference' => $this->booking_reference,
            'guestName' => $this->tenant ? $this->tenant->first_name . ' ' . $this->tenant->last_name : 'N/A',
            'email' => $this->tenant?->email,
            'phone' => $this->tenant?->phone ?? 'N/A',
            'roomType' => $this->room?->room_type ?? 'N/A',
            'roomNumber' => $this->room?->room_number ?? 'N/A',
            'propertyTitle' => $this->property?->title,
            'property_id' => $this->property_id,
            'room_id' => $this->room_id,
            'tenant_id' => $this->tenant_id,
            'landlord_id' => $this->landlord_id,
            'checkIn' => $this->start_date,
            'checkOut' => $this->end_date,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'duration' => $this->total_months . ' month' . ($this->total_months > 1 ? 's' : ''),
            'total_months' => $this->total_months,
            'amount' => (float) $this->total_amount,
            'total_amount' => (float) $this->total_amount,
            'monthlyRent' => (float) $this->monthly_rent,
            'monthly_rent' => (float) $this->monthly_rent,
            'status' => $this->status,
            'paymentStatus' => $this->payment_status,
            'payment_status' => $this->payment_status,
            'notes' => $this->notes,
            'cancellation_reason' => $this->cancellation_reason,
            'cancelled_at' => $this->cancelled_at,
            'refund_amount' => $this->refund_amount,
            'refund_processed_at' => $this->refund_processed_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,

            // Relationships (when loaded)
            'property' => $this->whenLoaded('property', fn() => [
                'id' => $this->property->id,
                'title' => $this->property->title,
                'full_address' => $this->property->full_address,
            ]),
            'tenant' => $this->whenLoaded('tenant', fn() => [
                'id' => $this->tenant->id,
                'first_name' => $this->tenant->first_name,
                'last_name' => $this->tenant->last_name,
                'email' => $this->tenant->email,
                'phone' => $this->tenant->phone,
                'tenantProfile' => $this->tenant->tenantProfile ? [
                    'status' => $this->tenant->tenantProfile->status,
                    'move_in_date' => $this->tenant->tenantProfile->move_in_date,
                    'move_out_date' => $this->tenant->tenantProfile->move_out_date,
                ] : null,
            ]),
            'room' => $this->whenLoaded('room', fn() => [
                'id' => $this->room->id,
                'room_number' => $this->room->room_number,
                'room_type' => $this->room->room_type,
                'floor' => $this->room->floor,
                'status' => $this->room->status,
                'monthly_rate' => (float) $this->room->monthly_rate,
                'currentTenant' => $this->room->currentTenant ? [
                    'id' => $this->room->currentTenant->id,
                    'first_name' => $this->room->currentTenant->first_name,
                    'last_name' => $this->room->currentTenant->last_name,
                ] : null,
            ]),
            'landlord' => $this->whenLoaded('landlord', fn() => [
                'id' => $this->landlord->id,
                'first_name' => $this->landlord->first_name,
                'last_name' => $this->landlord->last_name,
            ]),
        ];
    }
}
