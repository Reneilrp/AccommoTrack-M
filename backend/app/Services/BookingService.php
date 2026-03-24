<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Room;
use App\Models\TenantProfile;
use App\Models\User;
use App\Notifications\NewBookingNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class BookingService
{
    /**
     * Create a new booking
     */
    public function createBooking(array $data, ?int $tenantId = null): Booking
    {
        return DB::transaction(function () use ($data, $tenantId) {
            $room = Room::with('property')->lockForUpdate()->findOrFail($data['room_id']);
            $requestedBeds = (int) ($data['bed_count'] ?? 1);

            // If pricing model is 'full_room', force requestedBeds to room capacity
            // This ensures the whole room is reserved/occupied
            if (($room->pricing_model ?? 'full_room') === 'full_room') {
                $requestedBeds = $room->capacity;
            }

            // Calculate effective occupancy (confirmed beds + pending beds)
            $pendingBeds = (int) Booking::where('room_id', $room->id)
                ->where('status', 'pending')
                ->sum('bed_count');

            $effectiveOccupancy = $room->occupied + $pendingBeds;

            // Check if room has available slots
            if ($effectiveOccupancy + $requestedBeds > $room->capacity) {
                throw new \Exception('Room does not have enough available beds for this request.');
            }

            if ($room->status === 'maintenance') {
                throw new \Exception('Room is currently under maintenance');
            }

            // Check Gender Compatibility
            $tenant = $tenantId ? User::find($tenantId) : null;
            if ($tenant && $tenant->role === 'tenant') {
                $property = $room->property;
                // Normalize property type: lowercase + remove spaces for robust comparison
                // DB may store camelCase ('boardingHouse', 'bedSpacer') or lowercase ('dormitory')
                $rawPropertyType = $property->property_type ?? '';
                $propertyType = strtolower(str_replace([' ', '_'], '', $rawPropertyType));
                $targetTypes = ['dormitory', 'boardinghouse', 'bedspacer'];

                // Only enforce for specific property types
                if ($propertyType !== 'apartment' && in_array($propertyType, $targetTypes)) {
                    $tenantGender = $this->normalizeGender($tenant->gender);
                    $roomRestriction = strtolower((string) ($room->gender_restriction ?? 'mixed'));

                    if ($roomRestriction !== 'mixed') {
                        if (! $tenantGender) {
                            throw new \Exception('Please complete your profile gender (male/female) before booking this room type.');
                        }
                        if ($roomRestriction !== $tenantGender) {
                            throw new \Exception("Sorry, this room is only for specifically {$roomRestriction} only");
                        }
                    }
                }
            }

            $startDate = Carbon::parse($data['start_date']);
            $endDate = Carbon::parse($data['end_date']);
            $days = $startDate->diffInDays($endDate);

            $today = Carbon::today();

            if ($room->billing_policy === 'daily') {
                // For daily rooms, check-in must be today or later
                if ($startDate->lessThan($today)) {
                    throw new \Exception('Check-in date cannot be in the past.');
                }
            } else {
                // For monthly/others, check-in can be today
                if ($startDate->lessThan($today)) {
                    throw new \Exception('Check-in date cannot be in the past.');
                }
            }

            // Prevent bookings more than 3 months in advance
            if ($startDate->greaterThan(now()->addMonths(3))) {
                throw new \Exception('You cannot book a room more than 3 months in advance.');
            }

            // Enforce minimum stay if configured
            $minStay = $room->min_stay_days ?? null;

            // If billing policy is monthly, the implicit minimum stay is 30 days
            if (($room->billing_policy === 'monthly' || $room->billing_policy === 'monthly_with_daily') && ($minStay === null || $minStay < 30)) {
                $minStay = 30;
            }

            if ($minStay && $days < $minStay) {
                throw new \Exception("Minimum stay for this room is {$minStay} days.");
            }

            // Calculate pricing (use calendar-period-aware calculation)
            $priceResult = $room->calculatePriceForPeriod($startDate, $endDate);

            // If per_bed, price is per bed; if full_room, price is for the whole unit
            if (($room->pricing_model ?? 'full_room') === 'per_bed') {
                $totalAmount = $priceResult['total'] * $requestedBeds;
            } else {
                $totalAmount = $priceResult['total'];
            }

            $totalMonths = $priceResult['breakdown']['months'] ?? intdiv($days, 30);

            $bookingReference = 'BK-'.strtoupper(Str::random(8));

            $booking = Booking::create([
                'property_id' => $room->property_id,
                'tenant_id' => $tenantId,
                'landlord_id' => $room->property->landlord_id,
                'guest_name' => $data['guest_name'] ?? null,
                'room_id' => $room->id,
                'bed_count' => $requestedBeds,
                'booking_reference' => $bookingReference,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'total_months' => $totalMonths,
                'monthly_rent' => $room->monthly_rate ?? 0.00,
                'total_amount' => $totalAmount,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'payment_plan' => $data['payment_plan'] ?? 'full',
                'notes' => $data['notes'] ?? null,
            ]);

            // GENERATE RESERVATION FEE INVOICE IF REQUIRED
            if ($room->property->require_reservation_fee && $room->property->reservation_fee_amount > 0) {
                $reference = 'RES-'.date('Ymd').'-'.strtoupper(Str::random(6));

                \App\Models\Invoice::create([
                    'reference' => $reference,
                    'landlord_id' => $room->property->landlord_id,
                    'property_id' => $room->property->id,
                    'booking_id' => $booking->id,
                    'tenant_id' => $tenantId,
                    'description' => 'Reservation Fee for booking '.$bookingReference,
                    'amount_cents' => (int) round($room->property->reservation_fee_amount * 100),
                    'currency' => 'PHP',
                    'status' => 'pending',
                    'issued_at' => now(),
                    'due_date' => now()->addHours(24), // Pay within 24 hours
                ]);
            }

            // Update room status to occupied if it's now full (confirmed + pending)
            if ($effectiveOccupancy + $requestedBeds >= $room->capacity) {
                $room->update(['status' => 'occupied']);
            }

            // Update property stats
            $room->property->updateAvailableRooms();

            // Notify landlord of the new booking request
            $landlord = User::find($room->property->landlord_id);
            if ($landlord) {
                $landlord->notify(new NewBookingNotification($booking));
            }

            return $booking;
        });
    }

    /**
     * Update booking status with all business logic
     *
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
            if (! $tenantName && $booking->tenant) {
                $tenantName = $booking->tenant->first_name.' '.$booking->tenant->last_name;
            }

            return [
                'booking' => $booking,
                'room_updated' => true,
                'tenant_name' => $tenantName ?: 'Guest',
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update booking status', [
                'error' => $e->getMessage(),
                'booking_id' => $booking->id,
            ]);
            throw $e;
        }
    }

    /**
     * Handle booking confirmation
     */
    protected function handleConfirmation(Booking $booking): void
    {
        // Check if room has physical space for more active tenants
        if ($booking->room->tenants()->count() >= $booking->room->capacity) {
            throw new \Exception('Room is fully occupied by active tenants');
        }

        $booking->confirmed_at = now();

        // Assign tenant to room only if we have a tenant_id
        if ($booking->tenant_id) {
            $booking->room->assignTenant($booking->tenant_id, $booking->start_date, $booking->bed_count);

            // Create or update tenant profile - check if tenant exists first to avoid 500
            if ($booking->tenant) {
                $booking->tenant->tenantProfile()->updateOrCreate(
                    ['user_id' => $booking->tenant_id],
                    [
                        'move_in_date' => $booking->start_date,
                        'status' => 'active',
                        'booking_id' => $booking->id,
                    ]
                );
            } else {
                Log::warning('Booking confirmed but tenant user record not found', ['tenant_id' => $booking->tenant_id, 'booking_id' => $booking->id]);
            }
        }

        // Auto-generate initial invoice if it doesn't exist
        $existingInvoice = \App\Models\Invoice::where('booking_id', $booking->id)->first();
        if (! $existingInvoice) {
            $reference = 'INV-'.date('Ymd').'-'.strtoupper(Str::random(6));

            // Default amount is total
            $amount = $booking->total_amount;
            $description = 'Initial invoice for booking '.$booking->booking_reference;

            // If monthly plan and more than 1 month, first invoice is just first month's rent
            if ($booking->payment_plan === 'monthly' && $booking->total_months > 1) {
                $amount = $booking->monthly_rent;
                $description = 'First month rent for booking '.$booking->booking_reference;

                // Add recurring addons to first invoice if any
                $recurringAddonAmount = $booking->addons()
                    ->where('booking_addons.status', 'active')
                    ->where('price_type', 'monthly')
                    ->sum(DB::raw('booking_addons.price_at_booking * booking_addons.quantity'));

                $amount += $recurringAddonAmount;
            }

            // Handle 1 month advance if room or property requires it
            // Skip for daily-rate rooms: "1 month advance" has no meaning for per-day billing
            if ($booking->room->billing_policy !== 'daily' && $booking->room->requiresAdvance()) {
                $advanceAmount = $booking->monthly_rent;
                $amount += $advanceAmount;
                $description .= ' (includes 1 month advance)';
            }

            \App\Models\Invoice::create([
                'reference' => $reference,
                'landlord_id' => $booking->landlord_id,
                'property_id' => $booking->property_id,
                'booking_id' => $booking->id,
                'tenant_id' => $booking->tenant_id, // can be null for walk-ins
                'description' => $description,
                'amount_cents' => (int) round($amount * 100),
                'currency' => 'PHP',
                'status' => 'pending',
                'issued_at' => now(),
                'due_date' => Carbon::parse($booking->start_date)->addDays(3), // Due shortly after move-in
            ]);

            Log::info('Auto-generated invoice for confirmed booking', [
                'booking_id' => $booking->id,
                'reference' => $reference,
                'plan' => $booking->payment_plan,
            ]);
        }

        Log::info('Booking confirmed', [
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'room_id' => $booking->room_id,
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
            'room_still_occupied' => true,
        ]);

        // If the landlord skipped "confirmed" and jumped straight to "completed" or "partial-completed",
        // we MUST still execute the underlying assignment logic to place the tenant securely
        // into the room so its occupancy status correctly flips to 'occupied'.
        if (empty($booking->confirmed_at)) {
            Log::info('Completed booking lacked confirmation. Firing handleConfirmation.', ['booking_id' => $booking->id]);
            $this->handleConfirmation($booking);
        }
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
                'refund_amount' => $booking->refund_amount,
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
                    'move_out_date' => now()->format('Y-m-d'),
                ]);
            }
        }

        Log::info('Booking cancelled', [
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
        ]);

        $booking->room->property->updateAvailableRooms();
    }

    /**
     * Update payment status with auto-upgrade logic
     *
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
                'booking_id' => $booking->id,
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
            'status_upgraded' => $statusUpgraded,
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
            'completed' => (clone $baseQuery)->whereIn('status', ['completed', 'partial-completed'])->count(),
        ];
    }

    protected function normalizeGender(?string $gender): ?string
    {
        if (! $gender) {
            return null;
        }

        $normalized = strtolower(trim($gender));

        return match ($normalized) {
            'male', 'boy', 'boys' => 'male',
            'female', 'girl', 'girls' => 'female',
            default => null,
        };
    }
}
