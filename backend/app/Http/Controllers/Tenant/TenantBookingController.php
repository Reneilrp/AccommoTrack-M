<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\RequestMoveOutNoticeRequest;
use App\Notifications\MoveOutRequestedNotification;
use App\Services\AuditLogService;
use App\Services\BillingCycleCalculator;
use Illuminate\Support\Facades\Notification;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Models\Room;
use App\Models\TenantProfile;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class TenantBookingController extends Controller
{
    /**
     * Get all bookings for the authenticated tenant (MyBookings)
     */
    public function index(Request $request)
    {
        try {
            $query = Booking::with(['property.images', 'landlord', 'room', 'review', 'occupants'])
                ->withCount('occupants')
                ->where('tenant_id', Auth::id());

            // Filter by status if provided
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $bookings = $query->orderBy('created_at', 'desc')->get();

            return response()->json(\App\Http\Resources\BookingResource::collection($bookings)->resolve(), 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch bookings',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Allow tenant to cancel their own booking.
     * PATCH /api/tenant/bookings/{id}/cancel
     * Body: { cancellation_reason?: string }
     */
    public function cancel(Request $request, $id)
    {
        DB::beginTransaction();
        try {
            $booking = Booking::with(['room', 'tenant.tenantProfile'])
                ->where('tenant_id', Auth::id())
                ->findOrFail($id);

            $oldStatus = $booking->status;

            // Only allow cancellation for non-completed bookings
            if (in_array($booking->status, ['completed', 'partial-completed', 'cancelled'])) {
                DB::rollBack();

                return response()->json(['message' => 'Cannot cancel this booking'], 422);
            }

            $booking->status = 'cancelled';
            $booking->cancelled_at = now();
            $booking->cancellation_reason = $request->input('cancellation_reason');

            // If tenant was already assigned to room, remove them
            if ($booking->room) {
                try {
                    $booking->room->removeTenant($booking->tenant_id);
                } catch (\Exception $e) {
                    Log::warning('Failed to remove tenant from room during tenant cancellation', ['err' => $e->getMessage()]);
                }
                // update property availability
                try {
                    $booking->room->property->updateAvailableRooms();
                } catch (\Exception $e) {
                }
            }

            [$cancelledInvoiceIds, $voidedPendingTransactionIds] = $this->cancelOpenBookingInvoices($booking);

            // Update tenant profile if exists
            $tenantProfile = TenantProfile::where('user_id', $booking->tenant_id)
                ->where('booking_id', $booking->id)
                ->first();

            if ($tenantProfile) {
                $tenantProfile->update([
                    'status' => 'inactive',
                    'move_out_date' => now()->format('Y-m-d'),
                ]);
            }

            $booking->save();

            app(AuditLogService::class)->bookingEvent('booking.cancelled', [
                'subject_type' => 'booking',
                'subject_id' => $booking->id,
                'booking_id' => $booking->id,
                'property_id' => $booking->property_id,
                'tenant_id' => $booking->tenant_id,
                'landlord_id' => $booking->landlord_id,
                'status_before' => $oldStatus,
                'status_after' => $booking->status,
                'summary' => 'Booking cancelled by tenant.',
                'metadata' => [
                    'cancellation_reason' => $booking->cancellation_reason,
                    'cancelled_invoice_ids' => $cancelledInvoiceIds,
                    'voided_pending_transaction_ids' => $voidedPendingTransactionIds,
                ],
            ]);

            DB::commit();

            return response()->json(['message' => 'Booking cancelled', 'booking' => $booking], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Tenant cancel booking failed', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);

            return response()->json(['message' => 'Failed to cancel booking', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cancel open booking invoices and void pending offline submissions so
     * cancelled bookings do not continue to appear as payable.
     *
     * @return array{0: array<int>, 1: array<int>}
     */
    private function cancelOpenBookingInvoices(Booking $booking): array
    {
        $openInvoiceStatuses = ['pending', 'overdue', 'pending_verification', 'unpaid'];

        $openInvoices = Invoice::query()
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
     * Get single booking details
     */
    public function show($id)
    {
        try {
            $booking = Booking::with([
                'property.images',
                'landlord',
                'room.images',
                'room.amenities',
                'addons',
                'maintenanceRequests',
                'occupants',
            ])
                ->withCount('occupants')
                ->where('tenant_id', Auth::id())
                ->findOrFail($id);

            return response()->json((new \App\Http\Resources\BookingResource($booking))->resolve(), 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Booking not found',
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Tenant: create an invoice for this booking (on-demand)
     * POST /api/tenant/bookings/{id}/invoice
     */
    public function createInvoice(Request $request, $id)
    {
        $validated = $request->validate([
            'start_from' => 'nullable|in:current,next',
            'months_count' => 'nullable|integer|min:1|max:2',
        ]);

        $startFrom = strtolower((string) ($validated['start_from'] ?? 'current'));
        $monthsCount = max(1, min((int) ($validated['months_count'] ?? 1), 2));

        DB::beginTransaction();
        try {
            $booking = Booking::with(['room', 'property'])
                ->where('tenant_id', Auth::id())
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            // Allow invoice creation for active monthly stays as well.
            if (! in_array($booking->status, ['confirmed', 'active'], true)) {
                DB::rollBack();

                return response()->json(['message' => 'Invoice can only be created for confirmed or active bookings'], 422);
            }

            if (strtolower((string) ($booking->payment_plan ?? 'monthly')) !== 'monthly') {
                DB::rollBack();

                return response()->json(['message' => 'On-demand invoice generation is only available for monthly payment plans'], 422);
            }

            if ($startFrom === 'next') {
                $this->initializeMonthlyBillingState($booking);

                if (! $booking->next_billing_date) {
                    DB::rollBack();

                    return response()->json([
                        'success' => false,
                        'message' => 'No upcoming billing date is available for this booking.',
                    ], 422);
                }

                $basePeriodStart = Carbon::parse($booking->next_billing_date)->startOfDay();
                $bookingEndDate = $booking->end_date ? Carbon::parse($booking->end_date)->startOfDay() : null;

                $createdInvoices = [];
                $existingInvoices = [];
                $skippedPeriods = [];

                for ($monthIndex = 0; $monthIndex < $monthsCount; $monthIndex++) {
                    $periodStart = $basePeriodStart->copy()->addMonthsNoOverflow($monthIndex)->startOfDay();

                    if ($bookingEndDate && $periodStart->gt($bookingEndDate)) {
                        $skippedPeriods[] = [
                            'billing_period_start' => $periodStart->toDateString(),
                            'reason' => 'outside_booking_end_date',
                        ];
                        continue;
                    }

                    $existing = $this->findMonthlyRentInvoiceForPeriod($booking, $periodStart);
                    if ($existing) {
                        $existingInvoices[] = $existing;
                        continue;
                    }

                    $invoice = $this->createMonthlyRentInvoiceForPeriod($booking, $periodStart);
                    if ($invoice) {
                        $createdInvoices[] = $invoice;
                    } else {
                        $skippedPeriods[] = [
                            'billing_period_start' => $periodStart->toDateString(),
                            'reason' => 'zero_amount',
                        ];
                    }
                }

                DB::commit();

                return response()->json([
                    'success' => true,
                    'data' => [
                        'start_from' => 'next',
                        'months_count' => $monthsCount,
                        'created' => $createdInvoices,
                        'existing' => $existingInvoices,
                        'skipped' => $skippedPeriods,
                    ],
                ], ! empty($createdInvoices) ? 201 : 200);
            }

            // Create an invoice for the current billing cycle.
            // Calculate month start for current billing cycle based on booking start_date.
            $startDate = new \Carbon\Carbon($booking->start_date);
            $today = \Carbon\Carbon::today();

            // Determine how many full months have passed since start_date up to today
            $months = 0;
            $cursor = $startDate->copy();
            while ($cursor->copy()->addMonth()->lessThanOrEqualTo($today)) {
                $months++;
                $cursor->addMonth();
            }

            // cycleStart is the start date for the current billing cycle
            $cycleStart = $startDate->copy()->addMonths($months)->startOfDay();
            $billingDay = $booking->billing_day ?? $cycleStart->day;
            $cycleEnd = BillingCycleCalculator::calculatePeriodEnd($cycleStart, $billingDay);
            $periodKey = $cycleStart->format('Y-m-d');

            // De-dupe on booking + rent invoice + billing period, including legacy rows
            // that may be missing billing_period_key but were issued in the same month.
            $existing = Invoice::query()
                ->where('booking_id', $booking->id)
                ->where('invoice_type', 'rent')
                ->where(function ($query) use ($periodKey, $cycleStart) {
                    $query->where('billing_period_key', $periodKey)
                        ->orWhere('billing_period_key', 'like', $periodKey.'#%')
                        ->orWhere(function ($legacy) use ($cycleStart) {
                            $legacy->whereNull('billing_period_key')
                                ->whereYear('issued_at', $cycleStart->year)
                                ->whereMonth('issued_at', $cycleStart->month);
                        });
                })
                ->orderByDesc('id')
                ->first();

            if ($existing) {
                DB::commit();

                return response()->json(['success' => true, 'data' => $existing], 200);
            }

            // Base monthly amount (normalize legacy proxy/per-bed records when needed)
            $monthlyDue = $booking->resolveEffectiveMonthlyRent();

            // Partial calculation: if tenant has exceeded the cycle start (i.e., today is after cycle start), charge partial extra days
            $daysInMonth = 30; // Hardcoded to 30
            $daysOverdue = 0;
            if ($today->greaterThan($cycleStart)) {
                $daysOverdue = max(0, (int) $cycleStart->diffInDays($today, false));
            }

            $partialCharge = 0.0;
            if ($daysOverdue > 0) {
                $ratePerDay = $booking->room->daily_rate !== null ? (float) $booking->room->daily_rate : ($monthlyDue / max(1, $daysInMonth));
                $partialCharge = round($daysOverdue * $ratePerDay, 2);
            }

            $totalAmount = round($monthlyDue + $partialCharge, 2);

            $amountCents = (int) round($totalAmount * 100);

            $reference = 'INV-'.date('Ymd').'-'.strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));

            $invoice = Invoice::create([
                'reference' => $reference,
                'landlord_id' => $booking->landlord_id,
                'property_id' => $booking->property_id,
                'booking_id' => $booking->id,
                'tenant_id' => $booking->tenant_id,
                'description' => 'Invoice for booking '.$booking->booking_reference,
                'invoice_type' => 'rent',
                'billing_period_start' => $cycleStart,
                'billing_period_end' => $cycleEnd,
                'billing_period_key' => $periodKey,
                'amount_cents' => $amountCents,
                'currency' => 'PHP',
                'status' => 'pending',
                'issued_at' => now(),
                'due_date' => $cycleStart,
                'metadata' => [
                    'monthly_due' => $monthlyDue,
                    'partial_days' => $daysOverdue,
                    'partial_charge' => $partialCharge,
                    'days_in_month' => $daysInMonth,
                    'cycle_start' => $cycleStart->format('Y-m-d'),
                    'billing_period_key' => $periodKey,
                ],
            ]);

            DB::commit();

            return response()->json(['success' => true, 'data' => $invoice], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();

            return response()->json(['success' => false, 'message' => 'Booking not found'], 404);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['success' => false, 'message' => 'Failed to create invoice', 'error' => $e->getMessage()], 500);
        }
    }

    private function initializeMonthlyBillingState(Booking $booking): void
    {
        $dirty = false;
        $startDate = Carbon::parse($booking->start_date)->startOfDay();

        if (! $booking->billing_day) {
            $booking->billing_day = (int) $startDate->day;
            $dirty = true;
        }

        if (! $booking->next_billing_date) {
            $nextBillingDate = BillingCycleCalculator::calculateNextBillingDate($startDate, $booking->billing_day);

            if (($booking->room->billing_policy ?? 'monthly') !== 'daily' && optional($booking->room)->requiresAdvance()) {
                $nextBillingDate = BillingCycleCalculator::calculateNextBillingDate($nextBillingDate, $booking->billing_day);
            }

            $latestDueDate = $booking->invoices()
                ->whereNotNull('due_date')
                ->orderByDesc('due_date')
                ->value('due_date');

            if ($latestDueDate) {
                $candidate = BillingCycleCalculator::calculateNextBillingDate(Carbon::parse($latestDueDate), $booking->billing_day);
                if ($candidate->gt($nextBillingDate)) {
                    $nextBillingDate = $candidate;
                }
            }

            $booking->next_billing_date = $nextBillingDate->toDateString();
            $dirty = true;
        }

        if ($dirty) {
            $booking->save();
        }
    }

    private function findMonthlyRentInvoiceForPeriod(Booking $booking, Carbon $periodStart): ?Invoice
    {
        $periodKey = $periodStart->format('Y-m-d');

        return Invoice::query()
            ->where('booking_id', $booking->id)
            ->where('invoice_type', 'rent')
            ->where(function ($query) use ($periodKey, $periodStart) {
                $query->where('billing_period_key', $periodKey)
                    ->orWhere('billing_period_key', 'like', $periodKey.'#%')
                    ->orWhere(function ($legacy) use ($periodStart) {
                        $legacy->whereNull('billing_period_key')
                            ->whereYear('issued_at', $periodStart->year)
                            ->whereMonth('issued_at', $periodStart->month);
                    });
            })
            ->orderByDesc('id')
            ->first();
    }

    private function resolveRecurringAddonAmountForPeriod(Booking $booking, Carbon $periodStart): float
    {
        return (float) $booking->addons()
            ->where('booking_addons.status', 'active')
            ->where('price_type', 'monthly')
            ->where(function ($query) use ($periodStart) {
                $query->whereNull('booking_addons.cancellation_effective_at')
                    ->orWhere('booking_addons.cancellation_effective_at', '>', $periodStart);
            })
            ->sum(DB::raw('booking_addons.price_at_booking * booking_addons.quantity'));
    }

    private function createMonthlyRentInvoiceForPeriod(Booking $booking, Carbon $periodStart): ?Invoice
    {
        $billingDay = $booking->billing_day ?? $periodStart->day;
        $periodEnd = BillingCycleCalculator::calculatePeriodEnd($periodStart, $billingDay);
        $periodKey = $periodStart->format('Y-m-d');

        $recurringAddonAmount = $this->resolveRecurringAddonAmountForPeriod($booking, $periodStart);
        $monthlyRent = $booking->resolveEffectiveMonthlyRent();
        $baseInvoiceAmount = $monthlyRent + $recurringAddonAmount;

        if ($baseInvoiceAmount <= 0) {
            return null;
        }

        $reference = 'INV-'.$periodStart->format('Ym').'-'.Str::upper(Str::random(6));

        return Invoice::create([
            'reference' => $reference,
            'landlord_id' => $booking->landlord_id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'description' => 'Monthly rent and services for '.$periodStart->format('F Y'),
            'invoice_type' => 'rent',
            'billing_period_start' => $periodStart,
            'billing_period_end' => $periodEnd,
            'billing_period_key' => $periodKey,
            'amount_cents' => (int) round($baseInvoiceAmount * 100),
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => $periodStart,
            'metadata' => [
                'generated_by' => 'tenant_on_demand',
                'billing_period' => $periodStart->format('Y-m'),
                'billing_period_key' => $periodKey,
            ],
        ]);
    }

    /**
     * Tenant requests move-out and sets an agreed departure date.
     * PATCH /api/tenant/bookings/{id}/request-move-out
     */
    public function requestMoveOutNotice(RequestMoveOutNoticeRequest $request, $id)
    {
        DB::beginTransaction();
        try {
            $booking = Booking::with(['property', 'room', 'landlord'])
                ->where('tenant_id', Auth::id())
                ->findOrFail($id);

            if (in_array($booking->status, ['cancelled', 'completed', 'partial-completed'], true)) {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'Move-out notice is only allowed for active stays.',
                ], 422);
            }

            if (! in_array($booking->status, ['confirmed', 'active'], true)) {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'Booking must be confirmed before requesting move-out.',
                ], 422);
            }

            $moveOutDate = Carbon::parse($request->validated()['move_out_date'])->startOfDay();
            if ($booking->start_date && $moveOutDate->lt(Carbon::parse($booking->start_date)->startOfDay())) {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'Move-out date cannot be earlier than your check-in date.',
                ], 422);
            }

            $booking->notice_given_at = now();
            $booking->end_date = $moveOutDate->toDateString();

            // If recurring billing is already queued after move-out date, stop future generations.
            if ($booking->next_billing_date && Carbon::parse($booking->next_billing_date)->gt($moveOutDate)) {
                $booking->next_billing_date = null;
            }

            $notes = trim((string) ($booking->notes ?? ''));
            $reason = trim((string) ($request->validated()['reason'] ?? ''));
            if ($reason !== '') {
                $noticeLine = 'Move-out notice: '.$reason;
                $booking->notes = $notes === '' ? $noticeLine : ($notes."\n".$noticeLine);
            }

            $booking->save();
            DB::commit();

            if ($booking->landlord) {
                Notification::send($booking->landlord, new MoveOutRequestedNotification($booking));
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'booking' => (new BookingResource($booking))->resolve(),
                    'notice' => [
                        'notice_given_at' => optional($booking->notice_given_at)->toISOString(),
                        'move_out_date' => optional($booking->end_date)->format('Y-m-d'),
                    ],
                ],
                'message' => 'Move-out request submitted successfully.',
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Booking not found.',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Tenant move-out notice request failed', [
                'booking_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Failed to submit move-out request.',
            ], 500);
        }
    }
}
