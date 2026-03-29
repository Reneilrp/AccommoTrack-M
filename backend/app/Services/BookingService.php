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

            if ($tenantId) {
                // 1. High-Priority Fix: Overdue Invoice Check
                $hasOverdue = \App\Models\Invoice::where('tenant_id', $tenantId)
                    ->where('status', 'overdue')
                    ->exists();

                if ($hasOverdue) {
                    throw new \Exception('You cannot create a new booking while you have overdue invoices. Please settle your outstanding balance first.');
                }

                // 2. High-Priority Fix: Unconditional Double-Booking Guard
                // Check for any booking for this room by this tenant that isn't cancelled or completed
                $hasExistingBooking = Booking::where('room_id', $room->id)
                    ->where('tenant_id', $tenantId)
                    ->whereIn('status', ['pending', 'confirmed', 'active'])
                    ->exists();

                if ($hasExistingBooking) {
                    throw new \Exception('You already have an active or pending booking for this room.');
                }

                // Also prevent booking multiple rooms in the same property if not allowed (default: restricted)
                // This can be expanded later into a property setting
                $hasStayInProperty = Booking::where('property_id', $room->property_id)
                    ->where('tenant_id', $tenantId)
                    ->whereIn('status', ['pending', 'confirmed', 'active'])
                    ->exists();

                if ($hasStayInProperty) {
                    throw new \Exception('You already have an active or pending booking in this property.');
                }
            }

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

            if ($room->is_booking_locked) {
                throw new \Exception('Room is temporarily locked for new bookings due to a pending eviction process.');
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
            $billingPolicy = strtolower((string) ($room->billing_policy ?? 'monthly'));
            $requestedContractMode = strtolower((string) ($data['contract_mode'] ?? ''));
            $endDate = ! empty($data['end_date']) ? Carbon::parse($data['end_date']) : null;

            if ($billingPolicy === 'daily') {
                $contractMode = 'daily';
            } elseif ($billingPolicy === 'monthly') {
                $contractMode = 'monthly';
            } else {
                $contractMode = in_array($requestedContractMode, ['daily', 'monthly'], true)
                    ? $requestedContractMode
                    : 'monthly';
            }

            $today = Carbon::today();

            if ($startDate->lessThan($today)) {
                throw new \Exception('Check-in date cannot be in the past.');
            }

            if ($contractMode === 'daily' && ! $endDate) {
                throw new \Exception('Check-out date is required for daily bookings.');
            }

            if ($endDate && $endDate->lessThanOrEqualTo($startDate)) {
                throw new \Exception('Check-out date must be after check-in date.');
            }

            $days = $endDate ? max(1, $startDate->diffInDays($endDate)) : 30;

            // Prevent bookings more than 3 months in advance
            if ($startDate->greaterThan(now()->addMonths(3))) {
                throw new \Exception('You cannot book a room more than 3 months in advance.');
            }

            // Enforce minimum stay if configured
            $minStay = $room->min_stay_days ?? null;

            // Monthly contract bookings should always observe at least a 30-day minimum stay.
            if ($contractMode === 'monthly' && ($minStay === null || $minStay < 30)) {
                $minStay = 30;
            }

            if ($minStay && $endDate && $days < $minStay) {
                throw new \Exception("Minimum stay for this room is {$minStay} days.");
            }

            // Calculate pricing (use calendar-period-aware calculation when a move-out date exists).
            // For open-ended monthly stays, default preview/pricing base is first 30 days.
            if ($endDate) {
                $priceResult = $contractMode === 'daily'
                    ? $room->calculatePriceForDays($days)
                    : $room->calculatePriceForPeriod($startDate, $endDate);
            } else {
                $priceResult = $room->calculatePriceForDays(30);
            }

            // If per_bed, price is per bed; if full_room, price is for the whole unit
            if (($room->pricing_model ?? 'full_room') === 'per_bed') {
                $totalAmount = $priceResult['total'] * $requestedBeds;
            } else {
                $totalAmount = $priceResult['total'];
            }

            $totalMonths = $endDate
                ? ($priceResult['breakdown']['months'] ?? intdiv($days, 30))
                : 1;

            $requestedPaymentPlan = $data['payment_plan'] ?? 'full';
            if ($contractMode === 'daily') {
                $requestedPaymentPlan = 'full';
            }
            if (! $endDate && $contractMode === 'monthly') {
                $requestedPaymentPlan = 'monthly';
            }

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
                'end_date' => $endDate?->format('Y-m-d'),
                'total_months' => max(1, $totalMonths),
                'monthly_rent' => $room->monthly_rate ?? 0.00,
                'total_amount' => $totalAmount,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'payment_plan' => $requestedPaymentPlan,
                'contract_mode' => $contractMode,
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
                    'invoice_type' => 'reservation_fee',
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

            $billingPolicy = $booking->room->billing_policy ?? 'monthly';

            // For monthly-billed rooms, the first invoice always covers 1 full month's rent.
            // This is critical for transfer bookings where start_date = today and the period
            // may be < 30 days, which would cause total_amount to be a tiny prorated figure.
            if ($billingPolicy !== 'daily') {
                $amount = $booking->monthly_rent;
                $description = 'Monthly rent for booking '.$booking->booking_reference;

                // Add recurring monthly addons to first invoice if any
                $recurringAddonAmount = $booking->addons()
                    ->where('booking_addons.status', 'active')
                    ->where('price_type', 'monthly')
                    ->sum(DB::raw('booking_addons.price_at_booking * booking_addons.quantity'));

                $amount += $recurringAddonAmount;
            } else {
                // For daily-rate rooms, use the exact period total
                $amount = $booking->total_amount;
                $description = 'Initial invoice for booking '.$booking->booking_reference;
            }

            // Handle 1 month advance if room or property requires it
            // Skip for daily-rate rooms: "1 month advance" has no meaning for per-day billing
            if ($billingPolicy !== 'daily' && $booking->room->requiresAdvance()) {
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
                'invoice_type' => 'rent',
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

        // Initialize state-driven recurring billing fields for monthly plans.
        if ($booking->payment_plan === 'monthly') {
            $startDate = Carbon::parse($booking->start_date);

            if (! $booking->billing_day) {
                $booking->billing_day = (int) $startDate->day;
            }

            if (! $booking->next_billing_date) {
                $nextBillingDate = $startDate->copy()->addMonthNoOverflow();

                if (($booking->room->billing_policy ?? 'monthly') !== 'daily' && $booking->room->requiresAdvance()) {
                    $nextBillingDate = $nextBillingDate->addMonthNoOverflow();
                }

                $booking->next_billing_date = $nextBillingDate->toDateString();
            }
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
        if ($status === 'completed' && (float) ($booking->deposit_balance ?? 0) > 0) {
            throw new \DomainException('Deposit balance must be settled before marking this booking as completed.');
        }

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
        $completionBlocked = false;
        $booking->payment_status = $paymentStatus;

        // Auto-upgrade: If booking is 'partial-completed' and payment becomes 'paid', upgrade to 'completed'
        if ($booking->status === 'partial-completed' && $paymentStatus === 'paid') {
            if ((float) ($booking->deposit_balance ?? 0) > 0) {
                $completionBlocked = true;
            } else {
                $booking->status = 'completed';
                $statusUpgraded = true;

                Log::info('Booking auto-upgraded from partial-completed to completed', [
                    'booking_id' => $booking->id,
                ]);
            }
        }

        if ($completionBlocked) {
            Log::info('Booking completion blocked due to unsettled deposit', [
                'booking_id' => $booking->id,
                'deposit_balance' => $booking->deposit_balance,
            ]);
        }

        $booking->save();

        // Synchronize only rent invoices to avoid mutating add-on and other special invoices.
        $this->rentInvoicesForPaymentSync($booking)->update(['status' => $paymentStatus]);
        if ($paymentStatus === 'paid') {
            $this->rentInvoicesForPaymentSync($booking)->update(['paid_at' => now()]);
        }

        return [
            'booking' => $booking,
            'status_upgraded' => $statusUpgraded,
            'completion_blocked' => $completionBlocked,
        ];
    }

    protected function rentInvoicesForPaymentSync(Booking $booking)
    {
        return $booking->invoices()
            ->where(function ($query) {
                $query->whereNull('invoice_type')
                    ->orWhere('invoice_type', 'rent');
            })
            ->where(function ($query) {
                $query->whereNull('reference')
                    ->orWhere(function ($referenceQuery) {
                        $referenceQuery->where('reference', 'not like', 'INV-ADD-%')
                            ->where('reference', 'not like', 'INV-EXT-%')
                            ->where('reference', 'not like', 'RES-%')
                            ->where('reference', 'not like', 'DMG-%')
                            ->where('reference', 'not like', 'ADJ-%')
                            ->where('reference', 'not like', 'CASH-%');
                    });
            })
            ->where(function ($query) {
                $query->whereNull('description')
                    ->orWhere('description', 'not like', 'Add-on:%');
            });
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
