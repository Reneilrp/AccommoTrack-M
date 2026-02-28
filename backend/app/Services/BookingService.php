<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Room;
use App\Models\TenantProfile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;

class BookingService
{
    /**
     * Create a new booking
     */
    public function createBooking(array $data, ?int $tenantId = null): Booking
    {
        return DB::transaction(function() use ($data, $tenantId) {
            $room = Room::with('property')->lockForUpdate()->findOrFail($data['room_id']);

            // Check if there are any pending bookings for this room
            $hasPending = Booking::where('room_id', $room->id)
                ->where('status', 'pending')
                ->exists();

            if ($hasPending) {
                throw new \Exception('Room is currently pending confirmation for another user.');
            }

            // Check if room has available slots
            if (!$room->isAvailable() || $room->available_slots <= 0) {
                throw new \Exception('Room is not available for booking');
            }

            $startDate = Carbon::parse($data['start_date']);
            $endDate = Carbon::parse($data['end_date']);
            $days = $startDate->diffInDays($endDate) + 1;

            // Enforce minimum stay if configured
            $minStay = $room->min_stay_days ?? null;
            if ($minStay && $days < $minStay) {
                throw new \Exception("Minimum stay is {$minStay} days");
            }

            // Calculate pricing (use calendar-period-aware calculation)
            $priceResult = $room->calculatePriceForPeriod($startDate, $endDate);
            $totalAmount = $priceResult['total'];
            $totalMonths = $priceResult['breakdown']['months'] ?? intdiv($days, 30);

            $bookingReference = 'BK-' . strtoupper(Str::random(8));

            $booking = Booking::create([
                'property_id' => $room->property_id,
                'tenant_id' => $tenantId,
                'landlord_id' => $room->property->landlord_id,
                'guest_name' => $data['guest_name'] ?? null,
                'room_id' => $room->id,
                'booking_reference' => $bookingReference,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'total_months' => $totalMonths,
                'monthly_rent' => $room->monthly_rate,
                'total_amount' => $totalAmount,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'notes' => $data['notes'] ?? null
            ]);

            // Mark room as occupied immediately to prevent double booking
            $room->update(['status' => 'occupied']);

            return $booking;
        });
    }

    /**
     * Update booking status with all business logic
     * 
     * @param Booking $booking
     * @param array $data
     * @return array{booking: Booking, room_updated: bool, tenant_name: string}
     */
    public function updateStatus(Booking $booking, array $data): array
    {
        DB::beginTransaction();

        try {
            $newStatus = $data['status'];
            $booking->status = $newStatus;

            switch ($newStatus) {
                case 'confirmed':
                    $this->handleConfirmation($booking);
                    break;

                case 'completed':
                case 'partial-completed':
                    $this->handleCompletion($booking, $newStatus);
                    break;

                case 'cancelled':
                    $this->handleCancellation($booking, $data);
                    break;
            }

            $booking->save();
            DB::commit();

            // Load fresh data with tenant name for room card
            $booking->load(['property', 'tenant.tenantProfile', 'room.currentTenant']);

            $tenantName = $booking->guest_name;
            if (!$tenantName && $booking->tenant) {
                $tenantName = $booking->tenant->first_name . ' ' . $booking->tenant->last_name;
            }

            return [
                'booking' => $booking,
                'room_updated' => true,
                'tenant_name' => $tenantName ?: 'Guest'
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update booking status', [
                'error' => $e->getMessage(),
                'booking_id' => $booking->id
            ]);
            throw $e;
        }
    }

    /**
     * Handle booking confirmation
     */
    protected function handleConfirmation(Booking $booking): void
    {
        if ($booking->room->available_slots <= 0) {
            throw new \Exception('Room is fully occupied and cannot accommodate more tenants');
        }

        // Assign tenant to room only if we have a tenant_id
        if ($booking->tenant_id) {
            $booking->room->assignTenant($booking->tenant_id, $booking->start_date);

            // Create or update tenant profile
            $booking->tenant->tenantProfile()->updateOrCreate(
                ['user_id' => $booking->tenant_id],
                [
                    'move_in_date' => $booking->start_date,
                    'status' => 'active',
                    'booking_id' => $booking->id
                ]
            );
        }

        // Auto-generate initial invoice if it doesn't exist
        $existingInvoice = \App\Models\Invoice::where('booking_id', $booking->id)->first();
        if (!$existingInvoice) {
            $reference = 'INV-' . date('Ymd') . '-' . strtoupper(Str::random(6));
            \App\Models\Invoice::create([
                'reference' => $reference,
                'landlord_id' => $booking->landlord_id,
                'property_id' => $booking->property_id,
                'booking_id' => $booking->id,
                'tenant_id' => $booking->tenant_id, // can be null for walk-ins
                'description' => 'Initial invoice for booking ' . $booking->booking_reference,
                'amount_cents' => (int) round($booking->total_amount * 100),
                'currency' => 'PHP',
                'status' => 'pending',
                'issued_at' => now(),
                'due_date' => Carbon::parse($booking->start_date)->addDays(3), // Due shortly after move-in
            ]);

            Log::info('Auto-generated invoice for confirmed booking', [
                'booking_id' => $booking->id,
                'reference' => $reference
            ]);
        }

        Log::info('Booking confirmed', [
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'room_id' => $booking->room_id
        ]);

        $booking->room->property->updateAvailableRooms();
    }

    /**
     * Handle booking completion
     */
    protected function handleCompletion(Booking $booking, string $status): void
    {
        Log::info('Booking marked as completed', [
            'booking_id' => $booking->id,
            'status' => $status,
            'room_still_occupied' => true
        ]);
        // Room stays occupied - no changes needed
    }

    /**
     * Handle booking cancellation with optional refund
     */
    protected function handleCancellation(Booking $booking, array $data): void
    {
        $booking->cancelled_at = now();
        $booking->cancellation_reason = $data['cancellation_reason'] ?? null;

        // Handle refund if requested
        if ($data['should_refund'] ?? false) {
            $booking->refund_amount = $data['refund_amount'] ?? 0;
            $booking->refund_processed_at = now();
            $booking->payment_status = 'refunded';

            Log::info('Refund processed for cancelled booking', [
                'booking_id' => $booking->id,
                'refund_amount' => $booking->refund_amount
            ]);
        }

        // Remove tenant from room only if we had a tenant_id
        if ($booking->tenant_id) {
            $booking->room->removeTenant($booking->tenant_id);

            // Update tenant profile
            $tenantProfile = TenantProfile::where('user_id', $booking->tenant_id)
                ->where('booking_id', $booking->id)
                ->first();

            if ($tenantProfile) {
                $tenantProfile->update([
                    'status' => 'inactive',
                    'move_out_date' => now()->format('Y-m-d')
                ]);
            }
        }

        Log::info('Booking cancelled', [
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id
        ]);

        $booking->room->property->updateAvailableRooms();
    }

    /**
     * Update payment status with auto-upgrade logic
     * 
     * @param Booking $booking
     * @param string $paymentStatus
     * @return array{booking: Booking, status_upgraded: bool}
     */
    public function updatePaymentStatus(Booking $booking, string $paymentStatus): array
    {
        $statusUpgraded = false;
        $booking->payment_status = $paymentStatus;

        // Auto-upgrade: If booking is 'partial-completed' and payment becomes 'paid', upgrade to 'completed'
        if ($booking->status === 'partial-completed' && $paymentStatus === 'paid') {
            $booking->status = 'completed';
            $statusUpgraded = true;

            Log::info('Booking auto-upgraded from partial-completed to completed', [
                'booking_id' => $booking->id
            ]);
        }

        $booking->save();

        // Synchronize with invoices
        $booking->invoices()->update(['status' => $paymentStatus]);
        if ($paymentStatus === 'paid') {
            $booking->invoices()->update(['paid_at' => now()]);
        }

        return [
            'booking' => $booking,
            'status_upgraded' => $statusUpgraded
        ];
    }

    /**
     * Get booking statistics for a landlord
     */
    public function getStats(int $landlordId, ?array $propertyIds = null): array
    {
        $baseQuery = Booking::where('landlord_id', $landlordId);

        if ($propertyIds) {
            $baseQuery->whereIn('property_id', $propertyIds);
        }

        return [
            'total' => (clone $baseQuery)->count(),
            'confirmed' => (clone $baseQuery)->where('status', 'confirmed')->count(),
            'pending' => (clone $baseQuery)->where('status', 'pending')->count(),
            'completed' => (clone $baseQuery)->whereIn('status', ['completed', 'partial-completed'])->count()
        ];
    }
}
