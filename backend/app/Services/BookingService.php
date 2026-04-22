<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\PaymentTransaction;
use App\Models\Room;
use App\Models\TenantProfile;
use App\Models\User;
use App\Notifications\NewBookingNotification;
use App\Notifications\RentPaidSuccess;
use App\Support\SystemToggle;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class BookingService
{
    public function __construct(
        protected AuditLogService $auditLogService,
        private readonly PaymentLedgerService $paymentLedgerService,
    ) {}

    private const BOOKING_LIMIT_STATUSES = [
        'pending',
        'pending_reservation',
        'reserved',
        'confirmed',
        'active',
    ];

    /**
     * Create a new booking
     */
    /**
     * Create multiple bookings inside a Cart (one transaction).
     */
    public function createCartBookings(array $data, ?int $tenantId = null): array
    {
        $bookings = [];
        $totalReservationFee = 0;

        $bookingGroupReference = 'GRP-'.date('Ymd').'-'.strtoupper(Str::random(6));

        DB::beginTransaction();
        try {
            foreach ($data['items'] as $itemData) {
                $itemData['booking_mode'] = $data['booking_mode'] ?? 'normal';
                $itemData['notes'] = $data['notes'] ?? null;
                $itemData['payment_plan'] = $data['payment_plan'] ?? 'full';
                $itemData['receipt_image'] = $data['receipt_image'] ?? null;
                $itemData['booking_group_reference'] = $bookingGroupReference;
                $itemData['skip_reservation_invoice'] = true;
                $itemData['skip_limit_check'] = $data['skip_limit_check'] ?? false;

                $booking = $this->createBooking($itemData, $tenantId);
                $bookings[] = $booking;

                $room = \App\Models\Room::with('property')->find($itemData['room_id']);
                $reservationFeeTemporarilyDisabled = SystemToggle::getBool(
                    'reservation_fee_disabled',
                    (bool) config('app.reservation_fee_disabled', false)
                );

                $reservationFeeEnabled = ! $reservationFeeTemporarilyDisabled
                    && (bool) ($room->property->require_reservation_fee ?? false);

                if ($reservationFeeEnabled && ($room->property->reservation_fee ?? 0) > 0) {
                    $startDate = \Carbon\Carbon::parse($itemData['start_date']);
                    $daysUntilMoveIn = max(0, \Carbon\Carbon::today()->diffInDays($startDate, false));
                    $threshold = max(0, (int) ($room->property->reservation_fee_gap_days ?? 3));
                    if ($daysUntilMoveIn > $threshold) {
                        $totalReservationFee += (float) $room->property->reservation_fee;
                    }
                }
            }

            // [DEFERRED] Consolidated reservation fee invoice creation moved to approval/confirmation stage.
            $reservationInvoice = null;
            /*
            if ($totalReservationFee > 0) {
                $reference = 'RES-'.$bookingGroupReference;
                $firstBooking = $bookings[0];

                $reservationInvoice = \App\Models\Invoice::create([
                    'reference' => $reference,
                    'landlord_id' => $firstBooking->landlord_id,
                    'property_id' => $firstBooking->property_id,
                    'booking_id' => $firstBooking->id,
                    'tenant_id' => $tenantId,
                    'description' => 'Cart Group Reservation Fee for '.count($bookings).' rooms',
                    'invoice_type' => 'reservation_fee',
                    'amount_cents' => $totalReservationFee,
                    'currency' => 'PHP',
                    'status' => 'pending',
                    'issued_at' => now(),
                    'due_date' => now()->addHours(24),
                    'booking_group_reference' => $bookingGroupReference,
                ]);

                $this->auditLogService->invoiceEvent('invoice.created', [
                    'subject_type' => 'invoice',
                    'subject_id' => $reservationInvoice->id,
                    'invoice_id' => $reservationInvoice->id,
                    'property_id' => $firstBooking->property_id,
                    'tenant_id' => $tenantId,
                    'status_before' => null,
                    'status_after' => $reservationInvoice->status,
                    'summary' => 'Consolidated Group Reservation fee invoice generated.',
                ]);
            }
            */

            DB::commit();

            return [
                'bookings' => (new \App\Models\Booking)->newCollection($bookings)->load(['property', 'tenant', 'room', 'occupants'])->toArray(),
                'reservation_invoice' => $reservationInvoice,
                'booking_group_reference' => $bookingGroupReference,
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create Cart Booking group', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    public function createBooking(array $data, ?int $tenantId = null): Booking
    {
        return DB::transaction(function () use ($data, $tenantId) {
            $room = Room::with('property')->lockForUpdate()->findOrFail($data['room_id']);
            $bookingMode = $this->resolveBookingMode($data['booking_mode'] ?? null);

            if ($tenantId) {
                // 1. High-Priority Fix: Overdue Invoice Check
                $hasOverdue = \App\Models\Invoice::where('tenant_id', $tenantId)
                    ->where(function ($query) {
                        $query->where('status', 'overdue')
                            ->orWhere(function ($partialQuery) {
                                $partialQuery->where('status', 'partial')
                                    ->whereDate('due_date', '<', now()->toDateString());
                            });
                    })
                    ->exists();

                if ($hasOverdue) {
                    throw new \DomainException('You cannot create a new booking while you have overdue invoices. Please settle your outstanding balance first.');
                }

                // 2. High-Priority Fix: Unconditional Double-Booking Guard
                // Check for any booking for this room by this tenant that isn't cancelled or completed
                $hasExistingBooking = Booking::where('room_id', $room->id)
                    ->where('tenant_id', $tenantId)
                    ->whereIn('status', self::BOOKING_LIMIT_STATUSES)
                    ->exists();

                if ($hasExistingBooking) {
                    throw new \DomainException('You already have an active or pending booking for this room.');
                }

                // Only check limits if not skipped (e.g., when pre-validated in a batch)
                if (empty($data['skip_limit_check'])) {
                    // Check booking limits per mode (normal and proxy are independent)
                    if ($bookingMode === 'normal') {
                        $normalBookingCount = Booking::where('property_id', $room->property_id)
                            ->where('tenant_id', $tenantId)
                            ->where('booking_mode', 'normal')
                            ->whereIn('status', self::BOOKING_LIMIT_STATUSES)
                            ->count();

                        $normalLimit = min(4, (int) ($room->property->normal_booking_limit ?? 1));
                        if ($normalBookingCount >= $normalLimit) {
                            throw new \DomainException("Normal booking allows only {$normalLimit} active or pending booking(s) in this property.");
                        }
                    } else {
                        // Proxy mode
                        $proxyBookingCount = Booking::where('property_id', $room->property_id)
                            ->where('tenant_id', $tenantId)
                            ->where('booking_mode', 'proxy')
                            ->whereIn('status', self::BOOKING_LIMIT_STATUSES)
                            ->count();

                        $proxyLimit = min(4, (int) ($room->property->proxy_booking_limit ?? 3));
                        if ($proxyBookingCount >= $proxyLimit) {
                            throw new \DomainException("Proxy booking limit reached. Only up to {$proxyLimit} active or pending bookings are allowed in this property.");
                        }
                    }
                }
            }

            $requestedBeds = (int) ($data['bed_count'] ?? 1);

            // If pricing model is 'full_room', force requestedBeds to room capacity
            // This ensures the whole room is reserved/occupied
            if (($room->pricing_model ?? 'full_room') === 'full_room') {
                $requestedBeds = $room->capacity;
            }

            $occupantsPayload = $this->normalizeOccupants($data['occupants'] ?? []);

            if ($bookingMode === 'proxy' && count($occupantsPayload) === 0) {
                throw new \DomainException('Proxy booking requires at least one occupant entry.');
            }

            if (count($occupantsPayload) > $requestedBeds) {
                throw new \DomainException('Occupant count cannot exceed requested bed slots for this booking.');
            }

            // Calculate effective occupancy (confirmed beds + pending beds)
            $pendingBeds = (int) Booking::where('room_id', $room->id)
                ->whereIn('status', ['pending', 'pending_reservation', 'reserved'])
                ->sum('bed_count');

            $effectiveOccupancy = $room->occupied + $pendingBeds;

            // Check if room has available slots
            if ($effectiveOccupancy + $requestedBeds > $room->capacity) {
                throw new \DomainException('Room does not have enough available beds for this request.');
            }

            if ($room->status === 'maintenance') {
                throw new \DomainException('Room is currently under maintenance');
            }

            if ($room->is_booking_locked) {
                throw new \DomainException('Room is temporarily locked for new bookings due to a pending eviction process.');
            }

            $roomRestriction = $this->normalizeRoomRestriction((string) ($room->sex_restriction ?? 'mixed'));

            // Check tenant sex compatibility only for normal bookings.
            // Proxy bookings are validated by occupant sex below.
            $tenant = $tenantId ? User::find($tenantId) : null;
            if ($tenant && $tenant->role === 'tenant') {
                $property = $room->property;
                // Normalize property type token so legacy/camelCase variants compare consistently.
                $propertyType = $this->normalizePropertyTypeToken($property->property_type ?? '');
                $targetTypes = ['dormitory', 'boardinghouse', 'bedspacer'];

                // Only enforce for specific property types
                if ($bookingMode === 'normal' && $propertyType !== 'apartment' && in_array($propertyType, $targetTypes)) {
                    $tenantSex = $this->normalizeGender($tenant->sex);

                    if ($roomRestriction !== 'mixed') {
                        if (! $tenantSex) {
                            throw new \DomainException('Please complete your profile sex (male/female) before booking this room type.');
                        }
                        if ($roomRestriction !== $tenantSex) {
                            throw new \DomainException("Sorry, this room is only for specifically {$roomRestriction} only");
                        }
                    }
                }
            }

            if ($bookingMode === 'proxy' && $roomRestriction !== 'mixed') {
                foreach ($occupantsPayload as $index => $occupant) {
                    $occupantSex = $this->normalizeGender((string) ($occupant['sex'] ?? ''));

                    if ($occupantSex !== $roomRestriction) {
                        throw new \DomainException('Occupant '.($index + 1).' sex must match the room restriction ('.$roomRestriction.').');
                    }
                }
            }

            if ($bookingMode === 'proxy') {
                foreach ($occupantsPayload as $index => $occupant) {
                    $occupantSex = $this->normalizeGender((string) ($occupant['sex'] ?? ''));

                    if (! $occupantSex) {
                        throw new \DomainException('Occupant '.($index + 1).' sex must be male or female.');
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

            if ($startDate->lessThan($today) && empty($data['allow_past_start'])) {
                throw new \DomainException('Check-in date cannot be in the past.');
            }

            if ($contractMode === 'daily' && ! $endDate) {
                throw new \DomainException('Check-out date is required for daily bookings.');
            }

            if ($endDate && $endDate->lessThanOrEqualTo($startDate)) {
                throw new \DomainException('Check-out date must be after check-in date.');
            }

            $days = $endDate ? max(1, $startDate->diffInDays($endDate)) : 30;

            // Prevent bookings more than 3 months in advance
            if ($startDate->greaterThan(now()->addMonths(3))) {
                throw new \DomainException('You cannot book a room more than 3 months in advance.');
            }

            // Enforce minimum stay only for daily contracts.
            // Monthly contracts can still set an end date below 30 days, but billing remains monthly.
            $minStay = (int) ($room->min_stay_days ?? 1);
            if ($contractMode === 'daily' && $endDate && $days < $minStay) {
                $minStayDisplay = $minStay.' '.($minStay === 1 ? 'day' : 'days');

                throw new \DomainException(
                    "This room requires a minimum stay of {$minStayDisplay}. Your requested stay is {$days} days."
                );
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
            $monthlyRentPerUnit = $priceResult['total'];
            if (($room->pricing_model ?? 'full_room') === 'per_bed') {
                $totalAmount = $priceResult['total'] * $requestedBeds;
                $monthlyRentPerUnit = $priceResult['total'] * $requestedBeds; // Store total for all beds
            } else {
                $totalAmount = $priceResult['total'];
            }

            $totalMonths = $endDate
                ? ($priceResult['breakdown']['months'] ?? intdiv($days, 30))
                : 1;

            $effectiveMoveInDate = $startDate->copy()->startOfDay();
            $bookingIssuedDate = Carbon::today();
            $daysUntilMoveIn = max(0, $bookingIssuedDate->diffInDays($effectiveMoveInDate, false));
            $reservationFeeTemporarilyDisabled = SystemToggle::getBool(
                'reservation_fee_disabled',
                (bool) config('app.reservation_fee_disabled', false)
            );
            $reservationFeeEnabled = ! $reservationFeeTemporarilyDisabled
                && (bool) ($room->property->require_reservation_fee ?? false);
            $reservationFeeAmount = (float) ($room->property->reservation_fee ?? 0);
            $reservationFeeThresholdDays = max(0, (int) ($room->property->reservation_fee_gap_days ?? 3));
            $requiresReservationFee = $reservationFeeEnabled
                && $reservationFeeAmount > 0
                && $daysUntilMoveIn > $reservationFeeThresholdDays;

            $requestedPaymentPlan = strtolower((string) ($data['payment_plan'] ?? 'full'));
            if (! in_array($requestedPaymentPlan, ['full', 'monthly', 'promo_one_time'], true)) {
                $requestedPaymentPlan = 'full';
            }

            if ($contractMode === 'daily') {
                $requestedPaymentPlan = 'full';
            }
            if (! $endDate && $contractMode === 'monthly') {
                $requestedPaymentPlan = 'monthly';
            }

            if ($requestedPaymentPlan === 'promo_one_time') {
                if ($contractMode !== 'monthly' || ! $endDate) {
                    throw new \DomainException('Long-term promo one-time payment is only available for fixed monthly stays.');
                }

                $promoDiscount = $this->resolveLongTermPromoDiscount($room, $priceResult, $totalAmount);
                if (! $promoDiscount) {
                    throw new \DomainException('Long-term promo is only available for exact 3, 6, 9, or 12-month stays with configured discounts.');
                }

                $totalAmount = $promoDiscount['discounted_total'];
            }

            $bookingReference = 'BK-'.strtoupper(Str::random(8));

            $status = 'pending';
            $receiptImagePath = null;
            $reservationRef = null;

            if ($requiresReservationFee && isset($data['receipt_image'])) {
                $status = 'pending_reservation';
                // Store image in default disk
                $receiptImagePath = $data['receipt_image']->store('receipts');
                $reservationRef = 'RES-'.strtoupper(Str::random(8));
            } elseif ($requiresReservationFee) {
                // If property requires reservation but no image was provided
                // (handled loosely here, can depend on UI strictness)
            }

            $booking = Booking::create([
                'property_id' => $room->property_id,
                'tenant_id' => $tenantId,
                'booking_mode' => $bookingMode,
                'landlord_id' => $room->property->landlord_id,
                'guest_name' => $data['guest_name'] ?? null,
                'room_id' => $room->id,
                'bed_count' => $requestedBeds,
                'bed_numbers' => $data['bed_numbers'] ?? ($data['bed_number'] ?? null),
                'booking_reference' => $bookingReference,
                'booking_group_reference' => $data['booking_group_reference'] ?? null,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate?->format('Y-m-d'),
                'move_in_date' => $effectiveMoveInDate->format('Y-m-d'),
                'total_months' => max(1, $totalMonths),
                'monthly_rent' => $monthlyRentPerUnit,
                'total_amount' => $totalAmount,
                'status' => $status,
                'payment_status' => 'unpaid',
                'payment_plan' => $requestedPaymentPlan,
                'contract_mode' => $contractMode,
                'notes' => $data['notes'] ?? null,
                'receipt_image_path' => $receiptImagePath,
                'reference_number' => $reservationRef,
            ]);

            $this->auditLogService->bookingEvent('booking.created', [
                'subject_type' => 'booking',
                'subject_id' => $booking->id,
                'booking_id' => $booking->id,
                'property_id' => $booking->property_id,
                'tenant_id' => $booking->tenant_id,
                'landlord_id' => $booking->landlord_id,
                'status_before' => null,
                'status_after' => $booking->status,
                'summary' => 'Booking created.',
                'metadata' => [
                    'booking_reference' => $booking->booking_reference,
                    'booking_mode' => $booking->booking_mode,
                    'contract_mode' => $booking->contract_mode,
                    'payment_plan' => $booking->payment_plan,
                ],
            ]);

            if (! empty($occupantsPayload)) {
                $booking->occupants()->createMany($occupantsPayload);
            }

            // ATTACH ADDONS IF PROVIDED
            if (! empty($data['addons'])) {
                foreach ($data['addons'] as $addonId) {
                    $addon = \App\Models\Addon::find($addonId);
                    if ($addon) {
                        $booking->addons()->attach($addonId, [
                            'status' => 'pending',
                            'quantity' => 1,
                            'price_at_booking' => $addon->price,
                        ]);
                    }
                }
            }

            // [DEFERRED] Reservation fee invoice generation moved to approval/confirmation stage.
            /*
            if ($requiresReservationFee && empty($data['skip_reservation_invoice'])) {
                $reference = 'RES-'.date('Ymd').'-'.strtoupper(Str::random(6));

                $reservationInvoice = \App\Models\Invoice::create([
                    'reference' => $reference,
                    'landlord_id' => $room->property->landlord_id,
                    'property_id' => $room->property->id,
                    'booking_id' => $booking->id,
                    'tenant_id' => $tenantId,
                    'description' => 'Reservation Fee for booking '.$bookingReference,
                    'invoice_type' => 'reservation_fee',
                    'amount_cents' => $reservationFeeAmount,
                    'currency' => 'PHP',
                    'status' => 'pending',
                    'issued_at' => now(),
                    'due_date' => now()->addHours(24), // Pay within 24 hours
                ]);

                $this->auditLogService->invoiceEvent('invoice.created', [
                    'subject_type' => 'invoice',
                    'subject_id' => $reservationInvoice->id,
                    'booking_id' => $booking->id,
                    'invoice_id' => $reservationInvoice->id,
                    'property_id' => $booking->property_id,
                    'tenant_id' => $booking->tenant_id,
                    'landlord_id' => $booking->landlord_id,
                    'status_before' => null,
                    'status_after' => $reservationInvoice->status,
                    'summary' => 'Reservation fee invoice generated.',
                    'metadata' => [
                        'invoice_type' => $reservationInvoice->invoice_type,
                        'amount_cents' => $reservationInvoice->amount_cents,
                    ],
                ]);
            }
            */

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

    private function resolveBookingMode(mixed $value): string
    {
        $mode = strtolower((string) $value);

        return in_array($mode, ['normal', 'proxy'], true) ? $mode : 'normal';
    }

    private function normalizePropertyTypeToken(?string $propertyType): string
    {
        return strtolower(str_replace([' ', '_', '-'], '', (string) $propertyType));
    }

    /**
     * @return array{months: int, discount_type: string, discount_value: float, discount_amount: float, discounted_total: float}|null
     */
    private function resolveLongTermPromoDiscount(Room $room, array $priceResult, float $baseTotal): ?array
    {
        $breakdown = $priceResult['breakdown'] ?? [];
        $months = (int) ($breakdown['months'] ?? 0);
        $remainingDays = (int) ($breakdown['remaining_days'] ?? 0);

        if ($months < 1 || $remainingDays !== 0) {
            return null;
        }

        return $room->calculateDurationDiscount($baseTotal, $months);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function normalizeOccupants(mixed $occupants): array
    {
        if (! is_array($occupants)) {
            return [];
        }

        return collect($occupants)
            ->filter(function ($occupant) {
                if (! is_array($occupant)) {
                    return false;
                }

                return filled($occupant['first_name'] ?? null)
                    || filled($occupant['last_name'] ?? null);
            })
            ->map(function (array $occupant): array {
                $firstName = trim((string) ($occupant['first_name'] ?? ''));
                $middleName = trim((string) ($occupant['middle_name'] ?? ''));
                $lastName = trim((string) ($occupant['last_name'] ?? ''));

                return [
                    'first_name' => $firstName !== '' ? $firstName : null,
                    'middle_name' => $middleName !== '' ? $middleName : null,
                    'last_name' => $lastName !== '' ? $lastName : null,
                    'date_of_birth' => $occupant['date_of_birth'] ?? null,
                    'sex' => isset($occupant['sex']) ? strtolower((string) $occupant['sex']) : null,
                    'relationship_to_booker' => $occupant['relationship_to_booker'] ?? null,
                    'phone' => $occupant['phone'] ?? null,
                    'email' => $occupant['email'] ?? null,
                    'notes' => $occupant['notes'] ?? null,
                    'bed_number' => isset($occupant['bed_number']) ? (int) $occupant['bed_number'] : null,
                ];
            })
            ->values()
            ->all();
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
            $oldStatus = $booking->status;
            $booking->status = $newStatus;

            switch ($newStatus) {
                case 'reserved':
                case 'pending_reservation':
                case 'confirmed':
                    // Trigger invoice generation when moving out of 'pending'
                    if ($oldStatus === 'pending') {
                        $this->ensureInitialInvoicesAreGenerated($booking);
                    }
                    
                    if ($newStatus === 'confirmed') {
                        $this->handleConfirmation($booking, $data);
                    }
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

            $eventName = match ($newStatus) {
                'confirmed' => 'booking.confirmed',
                'cancelled' => 'booking.cancelled',
                'completed', 'partial-completed' => 'booking.completed',
                default => 'booking.status_updated',
            };

            $this->auditLogService->bookingEvent($eventName, [
                'subject_type' => 'booking',
                'subject_id' => $booking->id,
                'booking_id' => $booking->id,
                'property_id' => $booking->property_id,
                'tenant_id' => $booking->tenant_id,
                'landlord_id' => $booking->landlord_id,
                'status_before' => $oldStatus,
                'status_after' => $newStatus,
                'summary' => 'Booking status updated.',
            ]);

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

    public function approveReservation(Booking $booking, ?int $actorUserId = null): Booking
    {
        DB::beginTransaction();
        try {
            $booking->status = 'reserved';
            $booking->save();

            // Ensure invoices exist (if they weren't generated because booking was pending)
            $this->ensureInitialInvoicesAreGenerated($booking);

            $resolvedActorId = $actorUserId ?? auth()->id();

            // Find reservation invoice and settle it through a ledger transaction entry.
            $invoice = \App\Models\Invoice::where('booking_id', $booking->id)
                ->where('invoice_type', 'reservation_fee')
                ->whereIn('status', ['pending', 'partial', 'pending_verification', 'overdue', 'unpaid'])
                ->first();

            if ($invoice) {
                $invoiceTotalCents = (int) ($invoice->total_cents ?? $invoice->amount_cents ?? 0);
                $alreadyPaidCents = (int) ($invoice->transactions()
                    ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
                    ->selectRaw('COALESCE(SUM(amount_cents - refunded_amount_cents), 0) as net_cents')
                    ->value('net_cents') ?? 0);

                $remainingCents = max(0, $invoiceTotalCents - $alreadyPaidCents);
                if ($remainingCents > 0) {
                    PaymentTransaction::create([
                        'invoice_id' => $invoice->id,
                        'tenant_id' => $invoice->tenant_id,
                        'amount_cents' => $remainingCents,
                        'currency' => $invoice->currency ?? 'PHP',
                        'status' => 'succeeded',
                        'method' => 'reservation_fee_entry',
                        'gateway_reference' => null,
                        'gateway_response' => [
                            'source' => 'landlord_reservation_approval',
                            'actor_id' => $resolvedActorId,
                            'booking_id' => $booking->id,
                        ],
                    ]);
                }

                $this->paymentLedgerService->recomputeInvoiceAndBookingStatus($invoice, $resolvedActorId);
            } else {
                $booking->payment_status = 'paid';
                $booking->save();
            }

            DB::commit();

            return $booking;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function checkInTenant(Booking $booking): array
    {
        DB::beginTransaction();
        try {
            $oldStatus = $booking->status;

            $booking->status = 'confirmed';
            $booking->save();

            // This will assign tenant and generate rent invoice
            $this->handleConfirmation($booking);

            $this->auditLogService->bookingEvent('booking.confirmed', [
                'subject_type' => 'booking',
                'subject_id' => $booking->id,
                'booking_id' => $booking->id,
                'property_id' => $booking->property_id,
                'tenant_id' => $booking->tenant_id,
                'landlord_id' => $booking->landlord_id,
                'status_before' => $oldStatus,
                'status_after' => $booking->status,
                'summary' => 'Booking confirmed through check-in flow.',
            ]);

            DB::commit();

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
            Log::error('Failed to check in tenant', ['error' => $e->getMessage(), 'booking_id' => $booking->id]);
            throw $e;
        }
    }

    /**
     * Finalize checkout for an active stay.
     *
     * @return array{booking: Booking, room_updated: bool, tenant_name: string, resolved_status: string}
     */
    public function finalizeCheckout(Booking $booking, ?string $moveOutDate = null, ?string $note = null): array
    {
        Log::info('Starting finalizeCheckout', [
            'booking_id' => $booking->id,
            'booking_status' => $booking->status,
            'tenant_id' => $booking->tenant_id,
            'room_id' => $booking->room_id,
            'deposit_balance' => $booking->deposit_balance,
            'payment_status' => $booking->payment_status,
        ]);

        DB::beginTransaction();

        try {
            $oldStatus = $booking->status;

            // Validate room relationship exists
            if (! $booking->room) {
                Log::error('Room relationship is null', [
                    'booking_id' => $booking->id,
                    'room_id' => $booking->room_id,
                ]);
                throw new \DomainException('Booking room data is missing. Cannot finalize checkout.');
            }

            Log::info('Room relationship validated', ['room_id' => $booking->room->id]);

            if (in_array($booking->status, ['cancelled', 'completed'], true)) {
                throw new \DomainException('Checkout is only allowed for active stays.');
            }

            if (! in_array($booking->status, ['confirmed', 'active', 'partial-completed'], true)) {
                throw new \DomainException('Booking must be checked in before checkout can be finalized.');
            }

            $checkoutDate = $moveOutDate
                ? Carbon::parse($moveOutDate)->startOfDay()
                : Carbon::today();

            if ($booking->start_date && $checkoutDate->lt(Carbon::parse($booking->start_date)->startOfDay())) {
                throw new \DomainException('Move-out date cannot be earlier than check-in date.');
            }

            $booking->end_date = $checkoutDate->toDateString();
            $booking->notice_given_at = $booking->notice_given_at ?: now();

            if ($booking->next_billing_date && Carbon::parse($booking->next_billing_date)->gt($checkoutDate)) {
                $booking->next_billing_date = null;
            }

            $normalizedNote = trim((string) $note);
            if ($normalizedNote !== '') {
                $existingNotes = trim((string) ($booking->notes ?? ''));
                $line = 'Checkout finalized: '.$normalizedNote;
                $booking->notes = $existingNotes === ''
                    ? $line
                    : $existingNotes."\n".$line;
            }

            Log::info('About to remove tenant from room', [
                'tenant_id' => $booking->tenant_id,
                'room_id' => $booking->room->id,
            ]);

            // Remove tenant from room if tenant_id exists
            if ($booking->tenant_id && $booking->room) {
                try {
                    $booking->room->removeTenant($booking->tenant_id, $checkoutDate->toDateString());
                    Log::info('Tenant removed successfully');
                } catch (\Exception $e) {
                    Log::error('Failed to remove tenant from room during checkout', [
                        'booking_id' => $booking->id,
                        'tenant_id' => $booking->tenant_id,
                        'room_id' => $booking->room_id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                    // Continue with checkout even if tenant removal fails
                }
            }

            $hasOutstandingDeposit = (float) ($booking->deposit_balance ?? 0) > 0;
            $resolvedStatus = $booking->payment_status === 'paid' && ! $hasOutstandingDeposit
                ? 'completed'
                : 'partial-completed';

            Log::info('Resolved status', [
                'resolved_status' => $resolvedStatus,
                'payment_status' => $booking->payment_status,
                'has_outstanding_deposit' => $hasOutstandingDeposit,
            ]);

            $booking->status = $resolvedStatus;

            Log::info('About to call handleCompletion');
            $this->handleCompletion($booking, $resolvedStatus);
            Log::info('handleCompletion completed');

            $booking->save();
            Log::info('Booking saved');

            $this->auditLogService->bookingEvent('booking.completed', [
                'subject_type' => 'booking',
                'subject_id' => $booking->id,
                'booking_id' => $booking->id,
                'property_id' => $booking->property_id,
                'tenant_id' => $booking->tenant_id,
                'landlord_id' => $booking->landlord_id,
                'status_before' => $oldStatus,
                'status_after' => $resolvedStatus,
                'summary' => 'Booking finalized through checkout flow.',
                'metadata' => [
                    'move_out_date' => $booking->end_date,
                    'has_outstanding_deposit' => $hasOutstandingDeposit,
                ],
            ]);

            DB::commit();

            $booking->load(['property', 'tenant.tenantProfile', 'room.currentTenant']);

            $tenantName = $booking->guest_name;
            if (! $tenantName && $booking->tenant) {
                $tenantName = $booking->tenant->first_name.' '.$booking->tenant->last_name;
            }

            return [
                'booking' => $booking,
                'room_updated' => true,
                'tenant_name' => $tenantName ?: 'Guest',
                'resolved_status' => $resolvedStatus,
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to finalize booking checkout', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Handle booking confirmation
     */
    protected function handleConfirmation(Booking $booking, array $data = []): void
    {
        // Validate room relationship exists
        if (! $booking->room) {
            throw new \DomainException('Booking room relationship is missing. Cannot confirm booking.');
        }

        // Check if room has physical space for more active tenants
        if ($booking->room->tenants()->count() >= $booking->room->capacity) {
            throw new \DomainException('Room is fully occupied by active tenants');
        }

        $booking->confirmed_at = now();

        // Assign tenant to room only if we have a tenant_id
        if ($booking->tenant_id) {
            $booking->room->assignTenant($booking->tenant_id, $booking->start_date, $booking->bed_count, $booking->bed_numbers);

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

        if (empty($data['skip_initial_rent_invoice'])) {
            // Auto-generate initial invoice if it doesn't exist
            $existingInvoice = \App\Models\Invoice::where('booking_id', $booking->id)
                ->where(function ($query) {
                    $query->whereNull('invoice_type')->orWhere('invoice_type', 'rent');
                })
                ->first();
            if (! $existingInvoice) {
                // Validate room relationship before accessing billing_policy
                if (! $booking->room) {
                    Log::error('Cannot generate invoice: booking room relationship missing', ['booking_id' => $booking->id]);
                    throw new \DomainException('Cannot generate invoice: room data is missing.');
                }

                $billingPolicy = $booking->room->billing_policy ?? 'monthly';
                $isProxyMode = $booking->booking_mode === 'proxy';
                $occupiedSlots = $isProxyMode
                    ? max((int) ($booking->bed_count ?? 1), (int) $booking->occupants()->count(), 1)
                    : 1;

                // For proxy bookings with multiple occupied slots, generate separate invoices.
                if ($isProxyMode && $occupiedSlots > 1) {
                    $this->generateProxyOccupantInvoices($booking, $billingPolicy, $occupiedSlots);
                } else {
                    // Generate single invoice for normal bookings or proxy with 1 occupant
                    $this->generateSingleBookingInvoice($booking, $billingPolicy);
                }
            }
        }

        // Initialize state-driven recurring billing fields for monthly plans.
        if ($booking->payment_plan === 'monthly') {
            $startDate = Carbon::parse($booking->start_date);

            if (! $booking->billing_day) {
                $booking->billing_day = (int) $startDate->day;
            }

            if (! $booking->next_billing_date) {
                $nextBillingDate = BillingCycleCalculator::calculateNextBillingDate($startDate, $booking->billing_day);

                // Safely check room billing policy and advance requirement
                if ($booking->room && ($booking->room->billing_policy ?? 'monthly') !== 'daily' && $booking->room->requiresAdvance()) {
                    $nextBillingDate = BillingCycleCalculator::calculateNextBillingDate($nextBillingDate, $booking->billing_day);
                }

                $booking->next_billing_date = $nextBillingDate->toDateString();
            }
        }

        Log::info('Booking confirmed', [
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'room_id' => $booking->room_id,
        ]);

        // Safely update property stats if relationships exist
        if ($booking->room && $booking->room->property) {
            $booking->room->property->updateAvailableRooms();
        }
    }

    /**
     * Handle booking completion
     */
    protected function handleCompletion(Booking $booking, string $status): void
    {
        if ($status === 'completed' && (float) ($booking->deposit_balance ?? 0) > 0) {
            throw new \DomainException('Deposit balance must be settled before marking this booking as completed.');
        }

        // Validate room relationship exists before checking tenant assignment
        if (! $booking->room) {
            Log::warning('Booking completion: room relationship missing', ['booking_id' => $booking->id]);
        } else {
            $hasActiveAssignment = $booking->tenant_id
                ? $booking->room->tenants()->where('tenant_id', $booking->tenant_id)->exists()
                : false;

            if ($hasActiveAssignment) {
                throw new \DomainException('Cannot complete booking while tenant is still checked in. Finalize checkout first.');
            }
        }

        if (! $booking->end_date) {
            $booking->end_date = now()->toDateString();
        }

        if ($booking->tenant_id) {
            $tenantProfile = TenantProfile::where('user_id', $booking->tenant_id)
                ->orderByDesc('id')
                ->first();

            if ($tenantProfile) {
                $tenantProfile->update([
                    'status' => 'inactive',
                    'move_out_date' => Carbon::parse($booking->end_date)->format('Y-m-d'),
                ]);
            }
        }

        Log::info('Booking marked as completed', [
            'booking_id' => $booking->id,
            'status' => $status,
            'room_still_occupied' => false,
        ]);
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

        [$cancelledInvoiceIds, $voidedPendingTransactionIds] = $this->cancelOpenInvoicesForCancelledBooking($booking);

        // Remove tenant from room only if we had a tenant_id and room exists
        if ($booking->tenant_id && $booking->room) {
            try {
                $booking->room->removeTenant($booking->tenant_id);
            } catch (\Exception $e) {
                Log::error('Failed to remove tenant during cancellation', [
                    'booking_id' => $booking->id,
                    'tenant_id' => $booking->tenant_id,
                    'error' => $e->getMessage(),
                ]);
            }

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
            'cancelled_invoice_ids' => $cancelledInvoiceIds,
            'voided_pending_transaction_ids' => $voidedPendingTransactionIds,
        ]);

        // Safely update property stats
        if ($booking->room && $booking->room->property) {
            $booking->room->property->updateAvailableRooms();
        }
    }

    /**
     * Cancel open invoices and void pending manual proofs linked to a booking
     * that was cancelled before settlement.
     *
     * @return array{0: array<int>, 1: array<int>}
     */
    private function cancelOpenInvoicesForCancelledBooking(Booking $booking): array
    {
        $openInvoiceStatuses = ['pending', 'overdue', 'pending_verification', 'unpaid'];

        $openInvoices = \App\Models\Invoice::query()
            ->where('booking_id', $booking->id)
            ->whereIn('status', $openInvoiceStatuses)
            ->lockForUpdate()
            ->get();

        $cancelledInvoiceIds = [];

        foreach ($openInvoices as $invoice) {
            $description = trim((string) ($invoice->description ?? ''));
            $suffix = '(Cancelled due to booking cancellation)';
            if ($description === '') {
                $description = $suffix;
            } elseif (! str_contains($description, $suffix)) {
                $description .= ' '.$suffix;
            }

            $invoice->status = 'cancelled';
            $invoice->description = $description;
            $invoice->is_archived = true;
            $invoice->save();

            $cancelledInvoiceIds[] = (int) $invoice->id;
        }

        if (empty($cancelledInvoiceIds)) {
            return [[], []];
        }

        $pendingTransactions = PaymentTransaction::query()
            ->whereIn('invoice_id', $cancelledInvoiceIds)
            ->where('status', 'pending_offline')
            ->lockForUpdate()
            ->get();

        $voidedPendingTransactionIds = [];
        foreach ($pendingTransactions as $transaction) {
            $gatewayResponse = is_array($transaction->gateway_response) ? $transaction->gateway_response : [];
            $gatewayResponse['verification_action'] = 'booking_cancelled';
            $gatewayResponse['rejection_reason'] = 'Booking was cancelled before manual verification.';
            $gatewayResponse['cancelled_at'] = now()->toIso8601String();

            $transaction->status = 'voided';
            $transaction->gateway_response = $gatewayResponse;
            $transaction->save();

            $voidedPendingTransactionIds[] = (int) $transaction->id;
        }

        return [$cancelledInvoiceIds, $voidedPendingTransactionIds];
    }

    /**
     * Update payment status only.
     *
     * @return array{booking: Booking, status_upgraded: bool, completion_blocked: bool}
     */
    public function updatePaymentStatus(Booking $booking, string $paymentStatus, array $paymentContext = []): array
    {
        $statusUpgraded = false;
        $completionBlocked = false;

        DB::transaction(function () use ($booking, $paymentStatus, $paymentContext): void {
            $booking->payment_status = $paymentStatus;
            $booking->save();

            // Keep invoice statuses ledger-driven. Booking-level manual updates should not
            // bulk-overwrite invoice statuses for non-paid operations.
            if ($paymentStatus !== 'paid') {
                return;
            }

            $paymentMethod = $this->normalizeRecordedPaymentMethod($paymentContext['payment_method'] ?? null);
            $actorId = isset($paymentContext['actor_id']) ? (int) $paymentContext['actor_id'] : null;

            $rentInvoices = $this->rentInvoicesForPaymentSync($booking)->get();

            foreach ($rentInvoices as $invoice) {
                $invoiceTotalCents = (int) ($invoice->total_cents ?? $invoice->amount_cents ?? 0);
                $alreadyPaidCents = (int) ($invoice->transactions()
                    ->whereIn('status', ['succeeded', 'paid', 'partially_refunded', 'refunded'])
                    ->selectRaw('COALESCE(SUM(amount_cents - refunded_amount_cents), 0) as net_cents')
                    ->value('net_cents') ?? 0);

                $remainingCents = max(0, $invoiceTotalCents - $alreadyPaidCents);

                if ($remainingCents > 0) {
                    PaymentTransaction::create([
                        'invoice_id' => $invoice->id,
                        'tenant_id' => $booking->tenant_id,
                        'amount_cents' => $remainingCents,
                        'currency' => $invoice->currency ?? 'PHP',
                        'status' => 'paid',
                        'method' => $paymentMethod,
                        'gateway_reference' => $paymentContext['payment_reference'] ?? null,
                        'gateway_response' => [
                            'source' => 'landlord_payment_status_update',
                            'notes' => $paymentContext['notes'] ?? null,
                            'actor_id' => $actorId,
                        ],
                    ]);
                }

                $this->paymentLedgerService->recomputeInvoiceAndBookingStatus($invoice, $actorId);
            }

            if ($booking->tenant) {
                $booking->tenant->notify(new RentPaidSuccess($paymentMethod));
            }

            $booking->refresh();
        });

        return [
            'booking' => $booking,
            'status_upgraded' => $statusUpgraded,
            'completion_blocked' => $completionBlocked,
        ];
    }

    private function normalizeRecordedPaymentMethod(?string $method): string
    {
        $normalized = strtolower(trim((string) $method));

        if ($normalized === '') {
            return 'cash';
        }

        return match ($normalized) {
            'paymongo', 'paymongo_gcash', 'gcash', 'cash', 'bank_transfer', 'paymaya' => $normalized,
            default => 'cash',
        };
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

    protected function normalizeGender(?string $sex): ?string
    {
        if (! $sex) {
            return null;
        }

        $normalized = strtolower(trim($sex));

        return match ($normalized) {
            'male', 'boy', 'boys' => 'male',
            'female', 'girl', 'girls' => 'female',
            default => null,
        };
    }

    protected function normalizeRoomRestriction(?string $restriction): string
    {
        $normalized = strtolower(trim((string) $restriction));

        if ($normalized === '' || $normalized === 'mixed') {
            return 'mixed';
        }

        return $this->normalizeGender($normalized) ?? 'mixed';
    }

    /**
     * Generate separate invoices for each occupant in a proxy booking
     */
    protected function generateProxyOccupantInvoices(Booking $booking, string $billingPolicy, int $invoiceSlots): void
    {
        $occupants = $booking->occupants()->get()->values();
        $invoiceSlots = max(1, $invoiceSlots);
        $effectiveMonthlyRent = $booking->resolveEffectiveMonthlyRent($invoiceSlots);
        $perOccupantAmount = $effectiveMonthlyRent / $invoiceSlots;

        if ($occupants->count() < $invoiceSlots) {
            Log::warning('Proxy booking has fewer occupant records than billed slots; using fallback labels.', [
                'booking_id' => $booking->id,
                'bed_count' => (int) ($booking->bed_count ?? 1),
                'occupants_count' => $occupants->count(),
                'invoice_slots' => $invoiceSlots,
            ]);
        }

        // OPTIMIZATION: Use PHP memory sum instead of DB query
        $recurringAddonAmount = 0;
        if ($billingPolicy !== 'daily' && $booking->payment_plan === 'monthly') {
            $activeAddons = $booking->relationLoaded('addons') 
                ? $booking->addons 
                : $booking->addons()->where('booking_addons.status', 'active')->where('price_type', 'monthly')->get();
            
            $recurringAddonAmount = $activeAddons->sum(fn($a) => $a->pivot->price_at_booking * $a->pivot->quantity);
        }

        $perOccupantAddonAmount = (float) $recurringAddonAmount / $invoiceSlots;

        for ($index = 0; $index < $invoiceSlots; $index++) {
            /** @var \App\Models\BookingOccupant|null $occupant */
            $occupant = $occupants->get($index);
            $occupantName = $occupant
                ? trim(implode(' ', array_filter([$occupant->first_name, $occupant->middle_name, $occupant->last_name])))
                : ('Occupant #'.($index + 1));

            if (empty($occupantName)) {
                $occupantName = 'Occupant #'.($index + 1);
            }

            $reference = 'INV-'.date('Ymd').'-'.strtoupper(Str::random(6));

            if ($billingPolicy !== 'daily') {
                if (in_array($booking->payment_plan, ['full', 'promo_one_time'], true)) {
                    $amount = (float) $booking->total_amount / $invoiceSlots;
                    $description = $booking->payment_plan === 'promo_one_time'
                        ? "Promo one-time rent for {$occupantName} - Booking {$booking->booking_reference}"
                        : "Full duration upfront rent for {$occupantName} - Booking {$booking->booking_reference}";
                } else {
                    $amount = $perOccupantAmount + $perOccupantAddonAmount;
                    $description = "Monthly rent for {$occupantName} - Booking {$booking->booking_reference}";
                }
            } else {
                $amount = (float) $booking->total_amount / $invoiceSlots;
                $description = "Initial invoice for {$occupantName} - Booking {$booking->booking_reference}";
            }

            // Handle 1 month advance if room or property requires it
            if ($billingPolicy !== 'daily' && $booking->room->requiresAdvance()) {
                $advanceAmount = $perOccupantAmount;
                $amount += $advanceAmount;
                $description .= ' (includes 1 month advance)';
            }

            $generatedInvoice = \App\Models\Invoice::create([
                'reference' => $reference,
                'landlord_id' => $booking->landlord_id,
                'property_id' => $booking->property_id,
                'booking_id' => $booking->id,
                'tenant_id' => $booking->tenant_id,
                'description' => $description,
                'invoice_type' => 'rent',
                'amount_cents' => $amount,
                'currency' => 'PHP',
                'status' => 'pending',
                'issued_at' => now(),
                'due_date' => Carbon::parse($booking->start_date)->addDays(3),
                'metadata' => [
                    'occupant_id' => $occupant?->id,
                    'occupant_name' => $occupantName,
                    'occupant_slot' => $index + 1,
                    'proxy_booking' => true,
                ],
            ]);

            $this->auditLogService->invoiceEvent('invoice.created', [
                'subject_type' => 'invoice',
                'subject_id' => $generatedInvoice->id,
                'booking_id' => $booking->id,
                'invoice_id' => $generatedInvoice->id,
                'property_id' => $booking->property_id,
                'tenant_id' => $booking->tenant_id,
                'landlord_id' => $booking->landlord_id,
                'status_before' => null,
                'status_after' => $generatedInvoice->status,
                'summary' => "Rent invoice generated for occupant {$occupantName}.",
                'metadata' => [
                    'invoice_type' => $generatedInvoice->invoice_type,
                    'amount_cents' => $generatedInvoice->amount_cents,
                    'occupant_id' => $occupant?->id,
                    'occupant_slot' => $index + 1,
                ],
            ]);

            Log::info('Auto-generated proxy occupant invoice', [
                'booking_id' => $booking->id,
                'occupant_id' => $occupant?->id,
                'occupant_name' => $occupantName,
                'occupant_slot' => $index + 1,
                'reference' => $reference,
            ]);
        }
    }

    /**
     * Generate single invoice for normal bookings
     */
    protected function generateSingleBookingInvoice(Booking $booking, string $billingPolicy): void
    {
        // Validate room relationship
        if (! $booking->room) {
            Log::error('Cannot generate single invoice: booking room relationship missing', ['booking_id' => $booking->id]);
            throw new \DomainException('Cannot generate invoice: room data is missing.');
        }

        $reference = 'INV-'.date('Ymd').'-'.strtoupper(Str::random(6));

        // For monthly billing policies:
        // - monthly plan starts with one monthly invoice and then recurring cycles
        // - full and promo_one_time plans issue one upfront invoice for total_amount
        if ($billingPolicy !== 'daily') {
            if (in_array($booking->payment_plan, ['full', 'promo_one_time'], true)) {
                $amount = (float) $booking->total_amount;
                $description = $booking->payment_plan === 'promo_one_time'
                    ? 'Promo one-time rent for booking '.$booking->booking_reference
                    : 'Full duration upfront rent for booking '.$booking->booking_reference;
            } else {
                $amount = $booking->monthly_rent;
                $description = 'Monthly rent for booking '.$booking->booking_reference;

                // OPTIMIZATION: Use PHP memory sum instead of DB query
                $activeAddons = $booking->relationLoaded('addons') 
                    ? $booking->addons 
                    : $booking->addons()->where('booking_addons.status', 'active')->where('price_type', 'monthly')->get();
                
                $recurringAddonAmount = $activeAddons->sum(fn($a) => $a->pivot->price_at_booking * $a->pivot->quantity);

                $amount += $recurringAddonAmount;
            }
        } else {
            $amount = $booking->total_amount;
            $description = 'Initial invoice for booking '.$booking->booking_reference;
        }

        // Handle 1 month advance if room or property requires it
        if ($billingPolicy !== 'daily' && $booking->room->requiresAdvance()) {
            $advanceAmount = $booking->monthly_rent;
            $amount += $advanceAmount;
            $description .= ' (includes 1 month advance)';
        }

        $generatedInvoice = \App\Models\Invoice::create([
            'reference' => $reference,
            'landlord_id' => $booking->landlord_id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'description' => $description,
            'invoice_type' => 'rent',
            'amount_cents' => (int) round($amount * 100),
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => Carbon::parse($booking->start_date)->addDays(3),
        ]);

        $this->auditLogService->invoiceEvent('invoice.created', [
            'subject_type' => 'invoice',
            'subject_id' => $generatedInvoice->id,
            'booking_id' => $booking->id,
            'invoice_id' => $generatedInvoice->id,
            'property_id' => $booking->property_id,
            'tenant_id' => $booking->tenant_id,
            'landlord_id' => $booking->landlord_id,
            'status_before' => null,
            'status_after' => $generatedInvoice->status,
            'summary' => 'Rent invoice generated during booking confirmation.',
            'metadata' => [
                'invoice_type' => $generatedInvoice->invoice_type,
                'amount_cents' => $generatedInvoice->amount_cents,
            ],
        ]);

        Log::info('Auto-generated invoice for confirmed booking', [
            'booking_id' => $booking->id,
            'reference' => $reference,
            'plan' => $booking->payment_plan,
        ]);
    }

    public function convertOccupantToTenant(\App\Models\Booking $booking, int $occupantId, ?string $emailOverride = null): array
    {
        $occupant = $booking->occupants()->findOrFail($occupantId);

        if ($occupant->user_id !== null) {
            throw new \DomainException('This occupant has already been converted to a tenant.');
        }

        $email = $emailOverride ?? $occupant->email;

        if (! $email) {
            throw new \DomainException('An email address is required to create a tenant account.');
        }

        if (\App\Models\User::where('email', $email)->exists()) {
            throw new \DomainException('A user with this email already exists.');
        }

        return DB::transaction(function () use ($booking, $occupant, $email) {
            $user = \App\Models\User::create([
                'first_name' => $occupant->first_name,
                'last_name' => $occupant->last_name,
                'email' => $email,
                'phone' => $occupant->phone,
                'role' => 'tenant',
                'sex' => $occupant->sex,
                'date_of_birth' => $occupant->date_of_birth,
                'password' => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(12)),
            ]);

            $tenantProfile = \App\Models\TenantProfile::create([
                'user_id' => $user->id,
                'status' => 'active',
                'lease_status' => 'active',
            ]);

            $occupant->update(['user_id' => $user->id]);

            $this->auditLogService->bookingEvent('booking.occupant_converted', [
                'subject_type' => 'booking',
                'subject_id' => $booking->id,
                'booking_id' => $booking->id,
                'property_id' => $booking->property_id,
                'tenant_id' => $booking->tenant_id,
                'landlord_id' => $booking->landlord_id,
                'status_before' => null,
                'status_after' => $booking->status,
                'summary' => "Occupant {$occupant->first_name} {$occupant->last_name} was converted to a registered tenant.",
                'metadata' => [
                    'occupant_id' => $occupant->id,
                    'new_user_id' => $user->id,
                ],
            ]);

            return ['user' => $user, 'tenantProfile' => $tenantProfile];
        });
    }

    /**
     * Ensure all required initial invoices (reservation fee, etc.) are generated
     * when a booking moves from pending to an approved/active status.
     */
    public function ensureInitialInvoicesAreGenerated(Booking $booking): void
    {
        $room = $booking->room;
        if (! $room) {
            return;
        }

        // 1. CHECK RESERVATION FEE
        $reservationFeeTemporarilyDisabled = SystemToggle::getBool(
            'reservation_fee_disabled',
            (bool) config('app.reservation_fee_disabled', false)
        );
        $reservationFeeEnabled = ! $reservationFeeTemporarilyDisabled
            && (bool) ($room->property->require_reservation_fee ?? false);
        $reservationFeeAmount = (float) ($room->property->reservation_fee ?? 0);
        
        $moveInDate = Carbon::parse($booking->move_in_date ?? $booking->start_date);
        $daysUntilMoveIn = max(0, Carbon::today()->diffInDays($moveInDate, false));
        $reservationFeeThresholdDays = max(0, (int) ($room->property->reservation_fee_gap_days ?? 3));
        
        $requiresReservationFee = $reservationFeeEnabled
            && $reservationFeeAmount > 0
            && $daysUntilMoveIn > $reservationFeeThresholdDays;

        if ($requiresReservationFee) {
            $existingReservationInvoice = $booking->invoices()
                ->where('invoice_type', 'reservation_fee')
                ->where('status', '!=', 'cancelled')
                ->exists();

            if (! $existingReservationInvoice) {
                $reference = 'RES-'.date('Ymd').'-'.strtoupper(Str::random(6));
                $reservationInvoice = \App\Models\Invoice::create([
                    'reference' => $reference,
                    'landlord_id' => $booking->landlord_id,
                    'property_id' => $booking->property_id,
                    'booking_id' => $booking->id,
                    'tenant_id' => $booking->tenant_id,
                    'description' => 'Reservation Fee for booking '.$booking->booking_reference,
                    'invoice_type' => 'reservation_fee',
                    'amount_cents' => $reservationFeeAmount,
                    'currency' => 'PHP',
                    'status' => 'pending',
                    'issued_at' => now(),
                    'due_date' => now()->addHours(24),
                    'booking_group_reference' => $booking->booking_group_reference,
                ]);

                $this->auditLogService->invoiceEvent('invoice.created', [
                    'subject_type' => 'invoice',
                    'subject_id' => $reservationInvoice->id,
                    'booking_id' => $booking->id,
                    'invoice_id' => $reservationInvoice->id,
                    'property_id' => $booking->property_id,
                    'tenant_id' => $booking->tenant_id,
                    'landlord_id' => $booking->landlord_id,
                    'status_before' => null,
                    'status_after' => $reservationInvoice->status,
                    'summary' => 'Reservation fee invoice generated upon approval.',
                ]);
            }
        }
    }
}
