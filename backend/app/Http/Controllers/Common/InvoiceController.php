<?php

namespace App\Http\Controllers\Common;

use App\Events\InvoiceUpdated;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Models\User;
use App\Notifications\NewPaymentReceived;
use App\Services\AuditLogService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    use ResolvesLandlordAccess;

    private const MANUAL_PAYMENT_METHODS = [
        'cash',
        'gcash',
        'bank_transfer',
        'paymaya',
    ];

    public function __construct(protected AuditLogService $auditLogService)
    {
    }

    /**
     * List invoices (basic filtering)
     */
    public function index(Request $request)
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_manage_payments');

        $landlordId = $context['landlord_id'];

        // If caretaker, restrict which properties they can see invoices for
        $allowedPropertyIds = null;
        if ($context['is_caretaker']) {
            $allowedPropertyIds = $context['assignment']->getAssignedPropertyIds();
        }

        // Auto-generate missing invoices for confirmed bookings for this landlord
        $uninvoicedBookingsQuery = \App\Models\Booking::where('landlord_id', $landlordId)
            ->whereIn('status', ['confirmed', 'completed', 'partial-completed'])
            ->whereDoesntHave('invoices');

        if ($allowedPropertyIds) {
            $uninvoicedBookingsQuery->whereIn('property_id', $allowedPropertyIds);
        }

        $uninvoicedBookings = $uninvoicedBookingsQuery->get();

        foreach ($uninvoicedBookings as $booking) {
            // ... (rest of auto-generation logic remains same) ...
            try {
                $reference = 'INV-'.date('Ymd').'-'.strtoupper(\Illuminate\Support\Str::random(6));
                $roomAmountCents = (int) round($booking->total_amount * 100);

                // Bundle active monthly addons
                $billingPeriodStart = \Carbon\Carbon::parse($booking->start_date)->startOfMonth();
                $activeMonthlyAddons = $booking->addons()
                    ->wherePivot('status', 'active')
                    ->where(function ($query) use ($billingPeriodStart) {
                        $query->whereNull('booking_addons.cancellation_effective_at')
                            ->orWhere('booking_addons.cancellation_effective_at', '>', $billingPeriodStart);
                    })
                    ->where('price_type', 'monthly')
                    ->get();

                $addonsTotalCents = 0;
                $addonMetadata = [];
                foreach ($activeMonthlyAddons as $addon) {
                    $priceCents = (int) round($addon->pivot->price_at_booking * $addon->pivot->quantity * 100);
                    $addonsTotalCents += $priceCents;
                    $addonMetadata[] = [
                        'addon_id' => $addon->id,
                        'addon_name' => $addon->name,
                        'quantity' => $addon->pivot->quantity,
                        'price' => $priceCents,
                        'price_type' => 'monthly',
                    ];
                }

                $totalAmountCents = $roomAmountCents + $addonsTotalCents;
                $description = 'Monthly invoice for booking '.$booking->booking_reference;
                if ($addonsTotalCents > 0) {
                    $description .= "\n+ Includes active Add-ons";
                }

                $invoice = Invoice::create([
                    'reference' => $reference,
                    'landlord_id' => $booking->landlord_id,
                    'property_id' => $booking->property_id,
                    'booking_id' => $booking->id,
                    'tenant_id' => $booking->tenant_id,
                    'description' => $description,
                    'amount_cents' => $totalAmountCents,
                    'currency' => 'PHP',
                    'status' => 'pending',
                    'issued_at' => $booking->created_at,
                    'due_date' => \Carbon\Carbon::parse($booking->start_date)->addDays(3),
                    'metadata' => ['addons' => $addonMetadata],
                ]);

                foreach ($activeMonthlyAddons as $addon) {
                    $booking->addons()->updateExistingPivot($addon->id, [
                        'invoice_id' => $invoice->id,
                        'invoiced_at' => now(),
                    ]);
                }
            } catch (\Exception $e) {
                \Log::error('Failed auto-generate bundled invoice: '.$e->getMessage());
            }
        }

        $query = Invoice::query()->where('landlord_id', $landlordId);

        if ($allowedPropertyIds) {
            $query->whereIn('property_id', $allowedPropertyIds);
        }

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->has('tenant_id')) {
            $query->where('tenant_id', $request->query('tenant_id'));
        }
        if ($request->has('property_id')) {
            $query->where('property_id', $request->query('property_id'));
        }

        $invoices = $query->with(['transactions', 'booking.room', 'property', 'tenant'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($invoices, 200);
    }

    /**
     * Summarize invoice totals/counts for landlord payment dashboard cards.
     */
    public function summary(Request $request)
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_manage_payments');

        $landlordId = $context['landlord_id'];

        $allowedPropertyIds = null;
        if ($context['is_caretaker']) {
            $allowedPropertyIds = $context['assignment']->getAssignedPropertyIds();
        }

        $validated = $request->validate([
            'range' => ['nullable', Rule::in(['month', 'all', 'custom'])],
            'from' => 'nullable|date',
            'to' => 'nullable|date|after_or_equal:from',
            'property_id' => 'nullable|integer|exists:properties,id',
            'tenant_id' => 'nullable|integer|exists:users,id',
            'status' => 'nullable|string|max:40',
        ]);

        $range = $validated['range'] ?? 'month';

        $query = Invoice::query()->where('landlord_id', $landlordId);

        if ($allowedPropertyIds !== null) {
            $query->whereIn('property_id', $allowedPropertyIds);
        }

        if (isset($validated['property_id'])) {
            $this->checkPropertyAccess($context, (int) $validated['property_id']);
            $query->where('property_id', $validated['property_id']);
        }

        if (isset($validated['tenant_id'])) {
            $query->where('tenant_id', $validated['tenant_id']);
        }

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $periodFrom = null;
        $periodTo = null;

        if ($range === 'month') {
            $periodFrom = Carbon::now()->startOfMonth();
            $periodTo = Carbon::now()->endOfMonth();
        } elseif ($range === 'custom') {
            if (! empty($validated['from'])) {
                $periodFrom = Carbon::parse($validated['from'])->startOfDay();
            }
            if (! empty($validated['to'])) {
                $periodTo = Carbon::parse($validated['to'])->endOfDay();
            }
        }

        $dateExpression = 'DATE(COALESCE(issued_at, created_at, due_date))';
        if ($periodFrom) {
            $query->whereRaw("{$dateExpression} >= ?", [$periodFrom->toDateString()]);
        }
        if ($periodTo) {
            $query->whereRaw("{$dateExpression} <= ?", [$periodTo->toDateString()]);
        }

        $invoices = $query->get([
            'id',
            'status',
            'amount_cents',
            'total_cents',
            'due_date',
        ]);

        $invoiceIds = $invoices->pluck('id')->values()->all();

        $paidByInvoice = [];
        if (! empty($invoiceIds)) {
            $paidByInvoice = PaymentTransaction::query()
                ->whereIn('invoice_id', $invoiceIds)
                ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
                ->selectRaw('invoice_id, COALESCE(SUM(amount_cents - refunded_amount_cents), 0) as paid_cents')
                ->groupBy('invoice_id')
                ->pluck('paid_cents', 'invoice_id')
                ->all();
        }

        $totalPaidCents = 0;
        $totalBalanceCents = 0;
        $paidCount = 0;
        $pendingCount = 0;
        $overdueCount = 0;
        $pendingVerificationCount = 0;
        $refundedCount = 0;
        $cancelledCount = 0;

        foreach ($invoices as $invoice) {
            $status = $this->resolveSummaryStatus($invoice);

            $invoiceTotalCents = (int) ($invoice->total_cents ?? $invoice->amount_cents ?? 0);
            $invoicePaidCents = max(0, (int) ($paidByInvoice[$invoice->id] ?? 0));
            $invoiceBalanceCents = max(0, $invoiceTotalCents - $invoicePaidCents);

            $totalPaidCents += $invoicePaidCents;
            $totalBalanceCents += $invoiceBalanceCents;

            if ($status === 'paid') {
                $paidCount++;
            } elseif ($status === 'pending_verification') {
                $pendingVerificationCount++;
            } elseif (in_array($status, ['pending', 'unpaid', 'partial'], true)) {
                $pendingCount++;
            } elseif ($status === 'overdue') {
                $overdueCount++;
            } elseif ($status === 'refunded') {
                $refundedCount++;
            } elseif ($status === 'cancelled') {
                $cancelledCount++;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'range' => $range,
                'period' => [
                    'from' => $periodFrom?->toDateString(),
                    'to' => $periodTo?->toDateString(),
                ],
                'totals' => [
                    'total_paid' => round($totalPaidCents / 100, 2),
                    'total_paid_cents' => $totalPaidCents,
                    'total_balance' => round($totalBalanceCents / 100, 2),
                    'total_balance_cents' => $totalBalanceCents,
                    'paid_count' => $paidCount,
                    'pending_count' => $pendingCount,
                    'overdue_count' => $overdueCount,
                    'pending_verification_count' => $pendingVerificationCount,
                    'refunded_count' => $refundedCount,
                    'cancelled_count' => $cancelledCount,
                    'total_invoices' => $invoices->count(),
                ],
            ],
            'message' => '',
        ]);
    }

    /**
     * Create an invoice
     */
    public function store(Request $request)
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_manage_payments');

        $validated = $request->validate([
            'booking_id' => 'nullable|integer',
            'tenant_id' => 'nullable|integer',
            'property_id' => 'required|integer|exists:properties,id',
            'description' => 'nullable|string',
            'amount_cents' => 'required|integer|min:0',
            'currency' => 'nullable|string|size:3',
            'due_date' => 'nullable|date',
            'metadata' => 'nullable|array',
        ]);

        $this->checkPropertyAccess($context, (int) $validated['property_id']);

        $invoice = null;
        DB::beginTransaction();
        try {
            $reference = 'INV-'.date('Ymd').'-'.strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));

            $invoice = Invoice::create(array_merge($validated, [
                'reference' => $reference,
                'landlord_id' => $context['landlord_id'],
                'currency' => $validated['currency'] ?? 'PHP',
                'status' => 'pending',
                'issued_at' => now(),
            ]));

            $this->auditLogService->invoiceEvent('invoice.created', [
                'subject_type' => 'invoice',
                'subject_id' => $invoice->id,
                'booking_id' => $invoice->booking_id,
                'invoice_id' => $invoice->id,
                'property_id' => $invoice->property_id,
                'tenant_id' => $invoice->tenant_id,
                'landlord_id' => $invoice->landlord_id,
                'status_before' => null,
                'status_after' => $invoice->status,
                'summary' => 'Invoice created manually.',
                'metadata' => [
                    'amount_cents' => $invoice->amount_cents,
                    'currency' => $invoice->currency,
                ],
            ]);

            DB::commit();

            return response()->json($invoice->load('transactions'), 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Failed to create invoice', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Show invoice
     */
    public function show(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_manage_payments');

        $invoice = Invoice::with('transactions')->findOrFail($id);
        if ($invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $this->checkPropertyAccess($context, $invoice->property_id);

        return response()->json($invoice, 200);
    }

    /**
     * Charge (gateway) - stubbed for now
     */
    public function charge(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_manage_payments');

        $invoice = Invoice::findOrFail($id);
        if ($invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $this->checkPropertyAccess($context, $invoice->property_id);

        $validated = $request->validate([
            'method' => 'required|string',
            'amount_cents' => 'nullable|integer|min:0',
            'payment_method_id' => 'nullable|integer',
            'idempotency_key' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $amount = $validated['amount_cents'] ?? $invoice->amount_cents;
            $statusBefore = $invoice->status;

            // Create transaction (in a real implementation we'd call the gateway)
            $tx = PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $invoice->tenant_id,
                'amount_cents' => $amount,
                'currency' => $invoice->currency,
                'status' => 'succeeded',
                'method' => $validated['method'],
                'gateway_reference' => null,
                'gateway_response' => null,
                'idempotency_key' => $validated['idempotency_key'] ?? null,
            ]);

            // Use Paymongo logic or similar to update invoice/booking
            $invoice->paid_at = now();
            $invoice->status = 'paid';
            $invoice->save();

            $this->logInvoiceStatusTransition($invoice, $statusBefore, [
                'payment_transaction_id' => $tx->id,
                'summary' => 'Invoice paid via charge endpoint.',
                'metadata' => [
                    'amount_cents' => $amount,
                    'method' => $validated['method'],
                ],
            ]);

            // Broadcast the update to the tenant
            broadcast(new InvoiceUpdated($invoice))->toOthers();

            DB::commit();

            return response()->json($tx->fresh(), 200);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Charge failed', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Record an offline payment
     */
    public function recordOffline(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_manage_payments');

        $invoice = Invoice::findOrFail($id);
        if ($invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $this->checkPropertyAccess($context, $invoice->property_id);

        $normalizedMethod = $this->normalizeManualPaymentMethod($request->input('method'));
        if ($normalizedMethod !== null) {
            $request->merge(['method' => $normalizedMethod]);
        }

        $validated = $request->validate([
            'amount_cents' => 'required|integer|min:0',
            'method' => ['required', 'string', Rule::in(self::MANUAL_PAYMENT_METHODS)],
            'reference' => 'nullable|string',
            'received_at' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $statusBefore = $invoice->status;

            $tx = PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $invoice->tenant_id,
                'amount_cents' => $validated['amount_cents'],
                'currency' => $invoice->currency,
                'status' => 'succeeded',
                'method' => $validated['method'],
                'gateway_reference' => $validated['reference'] ?? null,
                'gateway_response' => ['notes' => $validated['notes'] ?? null, 'received_at' => $validated['received_at'] ?? now()->toDateTimeString()],
                'idempotency_key' => null,
            ]);

            $this->recomputeInvoiceAndBookingStatus($invoice);

            $this->auditLogService->paymentEvent('payment.recorded_offline', [
                'subject_type' => 'invoice',
                'subject_id' => $invoice->id,
                'booking_id' => $invoice->booking_id,
                'invoice_id' => $invoice->id,
                'payment_transaction_id' => $tx->id,
                'property_id' => $invoice->property_id,
                'tenant_id' => $invoice->tenant_id,
                'landlord_id' => $invoice->landlord_id,
                'status_before' => $statusBefore,
                'status_after' => $invoice->status,
                'summary' => 'Offline payment recorded by landlord/caretaker.',
                'metadata' => [
                    'amount_cents' => $validated['amount_cents'],
                    'method' => $validated['method'],
                    'reference' => $validated['reference'] ?? null,
                ],
            ]);

            // Broadcast the update to the tenant
            broadcast(new InvoiceUpdated($invoice))->toOthers();

            DB::commit();

            return response()->json($tx->fresh(), 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Failed to record payment', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Tenant requests to record an offline (cash) payment for their invoice.
     * This creates a pending payment transaction that the landlord can verify.
     * POST /tenant/invoices/{id}/record-offline
     */
    public function recordOfflineForTenant(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);
        $tenantId = Auth::id();
        if ($invoice->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $normalizedMethod = $this->normalizeManualPaymentMethod($request->input('method'));
        if ($normalizedMethod !== null) {
            $request->merge(['method' => $normalizedMethod]);
        }

        $validated = $request->validate([
            'amount_cents' => 'required|integer|min:1',
            'method' => ['required', 'string', Rule::in(self::MANUAL_PAYMENT_METHODS)],
            'reference' => 'nullable|string',
            'notes' => 'nullable|string',
            'proof_image' => 'nullable|image|mimes:jpeg,jpg,png,webp|max:5120',
        ]);

        // --- Guard: amount must not exceed remaining balance ---
        $invoiceTotalCents = $invoice->total_cents ?? $invoice->amount_cents;
        $alreadyPaidCents = $invoice->transactions()
            ->whereIn('status', ['succeeded', 'paid', 'pending_offline', 'partially_refunded'])
            ->selectRaw('SUM(amount_cents - refunded_amount_cents) as net_cents')
            ->value('net_cents') ?? 0;
        $remainingCents = max(0, $invoiceTotalCents - $alreadyPaidCents);

        if ($validated['amount_cents'] > $remainingCents) {
            return response()->json([
                'message' => 'Payment amount cannot exceed the remaining balance of ₱'.number_format($remainingCents / 100, 2),
            ], 422);
        }

        // --- Guard: check allow_partial_payments ---
        $property = $invoice->property ?? $invoice->booking?->property;
        $allowPartial = $property ? (bool) $property->allow_partial_payments : true;
        if (! $allowPartial && $validated['amount_cents'] < $remainingCents) {
            return response()->json([
                'message' => 'Partial payments are not allowed for this property. Please pay the full remaining balance of ₱'.number_format($remainingCents / 100, 2),
            ], 422);
        }

        DB::beginTransaction();
        try {
            $hadPreviousDeniedSubmission = $invoice->transactions()
                ->whereIn('method', ['cash', 'gcash', 'bank_transfer', 'paymaya'])
                ->where('status', 'voided')
                ->exists();

            $statusBefore = $invoice->status;

            $proofImagePath = null;
            if (isset($validated['proof_image'])) {
                $proofImagePath = $validated['proof_image']->store('payment_proofs', 'public');
            }

            $tx = PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $tenantId,
                'amount_cents' => $validated['amount_cents'],
                'currency' => $invoice->currency,
                'status' => 'pending_offline',
                'method' => $validated['method'],
                'gateway_reference' => $validated['reference'] ?? null,
                'gateway_response' => [
                    'notes' => $validated['notes'] ?? null,
                    'proof_image_path' => $proofImagePath,
                    'proof_image_url' => $proofImagePath ? asset('storage/'.ltrim($proofImagePath, '/')) : null,
                ],
            ]);

            // Mark invoice as pending_verification so landlord can confirm
            $invoice->status = 'pending_verification';
            $invoice->save();

            $this->logInvoiceStatusTransition($invoice, $statusBefore, [
                'payment_transaction_id' => $tx->id,
                'summary' => 'Invoice moved to pending verification after tenant manual submission.',
            ]);

            $this->auditLogService->paymentEvent($hadPreviousDeniedSubmission ? 'payment.resubmitted' : 'payment.submitted', [
                'subject_type' => 'invoice',
                'subject_id' => $invoice->id,
                'booking_id' => $invoice->booking_id,
                'invoice_id' => $invoice->id,
                'payment_transaction_id' => $tx->id,
                'property_id' => $invoice->property_id,
                'tenant_id' => $invoice->tenant_id,
                'landlord_id' => $invoice->landlord_id,
                'status_before' => $statusBefore,
                'status_after' => $invoice->status,
                'summary' => $hadPreviousDeniedSubmission
                    ? 'Tenant re-submitted manual payment proof after a denial.'
                    : 'Tenant submitted manual payment proof.',
                'metadata' => [
                    'amount_cents' => $validated['amount_cents'],
                    'method' => $validated['method'],
                    'reference' => $validated['reference'] ?? null,
                    'proof_image_path' => $proofImagePath,
                ],
            ]);

            // Notify landlord about the cash payment awaiting verification
            $landlord = User::find($invoice->landlord_id);
            if ($landlord) {
                $landlord->notify(new NewPaymentReceived(true));
            }

            DB::commit();

            return response()->json(['success' => true, 'transaction' => $tx], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Failed to record offline payment', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Landlord verifies or rejects a tenant's cash payment claim.
     * POST /invoices/{id}/verify-cash
     */
    public function verifyCash(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_manage_payments');

        $invoice = Invoice::with('transactions', 'booking', 'tenant')->findOrFail($id);
        if ($invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'action' => 'required|in:approve,reject',
            'reason_code' => 'required_if:action,reject|nullable|in:invalid_proof,wrong_amount,unclear_image,mismatched_reference,duplicate_submission,other',
            'reason' => 'required_if:action,reject|nullable|string|max:500',
        ]);

        $shouldBroadcastInvoiceUpdate = false;

        DB::beginTransaction();
        try {
            $invoiceStatusBefore = $invoice->status;
            $pendingTxs = $invoice->transactions()->where('status', 'pending_offline')->get();

            if ($pendingTxs->isEmpty()) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => 'No pending manual payment found for verification.',
                ], 422);
            }

            if ($validated['action'] === 'approve') {
                foreach ($pendingTxs as $ptx) {
                    $ptx->status = 'succeeded';
                    $ptx->save();
                }
                $this->recomputeInvoiceAndBookingStatus($invoice);

                $this->logInvoiceStatusTransition($invoice, $invoiceStatusBefore, [
                    'payment_transaction_id' => $pendingTxs->last()?->id,
                    'summary' => 'Invoice status updated after payment approval.',
                ]);

                $this->auditLogService->paymentEvent('payment.approved', [
                    'severity' => 'info',
                    'subject_type' => 'invoice',
                    'subject_id' => $invoice->id,
                    'booking_id' => $invoice->booking_id,
                    'invoice_id' => $invoice->id,
                    'payment_transaction_id' => $pendingTxs->last()?->id,
                    'property_id' => $invoice->property_id,
                    'tenant_id' => $invoice->tenant_id,
                    'landlord_id' => $invoice->landlord_id,
                    'status_before' => $invoiceStatusBefore,
                    'status_after' => $invoice->status,
                    'summary' => 'Landlord approved manual payment proof.',
                    'metadata' => [
                        'pending_transaction_ids' => $pendingTxs->pluck('id')->values()->all(),
                    ],
                ]);

                // Notify tenant without failing approval when notifier transport is unavailable.
                if ($invoice->tenant) {
                    try {
                        $invoice->tenant->notify(new \App\Notifications\InvoiceVerifiedNotification($invoice, 'approved'));
                    } catch (\Throwable $notifyError) {
                        \Log::warning('verifyCash approved notification failed', [
                            'invoice_id' => $invoice->id,
                            'error' => $notifyError->getMessage(),
                        ]);
                    }
                }

                $shouldBroadcastInvoiceUpdate = true;
            } else {
                // Reject: void pending offline transactions
                foreach ($pendingTxs as $ptx) {
                    $gatewayResponse = is_array($ptx->gateway_response) ? $ptx->gateway_response : [];
                    $gatewayResponse['denial_reason_code'] = $validated['reason_code'];
                    $gatewayResponse['denial_reason'] = $validated['reason'];

                    $ptx->status = 'voided';
                    $ptx->gateway_response = $gatewayResponse;
                    $ptx->save();
                }
                $this->recomputeInvoiceAndBookingStatus($invoice);

                $this->logInvoiceStatusTransition($invoice, $invoiceStatusBefore, [
                    'payment_transaction_id' => $pendingTxs->last()?->id,
                    'summary' => 'Invoice status updated after payment denial.',
                    'metadata' => [
                        'reason_code' => $validated['reason_code'],
                        'reason' => $validated['reason'],
                    ],
                ]);

                $this->auditLogService->paymentEvent('payment.denied', [
                    'severity' => 'warning',
                    'subject_type' => 'invoice',
                    'subject_id' => $invoice->id,
                    'booking_id' => $invoice->booking_id,
                    'invoice_id' => $invoice->id,
                    'payment_transaction_id' => $pendingTxs->last()?->id,
                    'property_id' => $invoice->property_id,
                    'tenant_id' => $invoice->tenant_id,
                    'landlord_id' => $invoice->landlord_id,
                    'status_before' => $invoiceStatusBefore,
                    'status_after' => $invoice->status,
                    'summary' => 'Landlord denied manual payment proof.',
                    'metadata' => [
                        'reason_code' => $validated['reason_code'],
                        'reason' => $validated['reason'],
                        'pending_transaction_ids' => $pendingTxs->pluck('id')->values()->all(),
                    ],
                ]);

                // Notify tenant without failing rejection when notifier transport is unavailable.
                if ($invoice->tenant) {
                    try {
                        $invoice->tenant->notify(new \App\Notifications\InvoiceVerifiedNotification($invoice, 'rejected'));
                    } catch (\Throwable $notifyError) {
                        \Log::warning('verifyCash rejected notification failed', [
                            'invoice_id' => $invoice->id,
                            'error' => $notifyError->getMessage(),
                        ]);
                    }
                }
            }

            DB::commit();

            if ($shouldBroadcastInvoiceUpdate) {
                try {
                    broadcast(new InvoiceUpdated($invoice))->toOthers();
                } catch (\Throwable $broadcastError) {
                    \Log::warning('verifyCash broadcast failed', [
                        'invoice_id' => $invoice->id,
                        'error' => $broadcastError->getMessage(),
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => $validated['action'] === 'approve' ? 'Payment approved.' : 'Payment rejected.',
                'invoice' => $invoice->fresh(['transactions']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('verifyCash error: ' . $e->getMessage());
            return response()->json(['message' => 'Action failed', 'error' => $e->getMessage()], 500);
        }
    }

    private function recomputeInvoiceAndBookingStatus(Invoice $invoice): void
    {
        $netPaidCents = $this->calculateInvoiceNetPaidCents($invoice);
        $resolvedStatus = $this->resolveInvoiceStatus($invoice, $netPaidCents);

        $invoice->status = $resolvedStatus;
        if ($resolvedStatus === 'paid') {
            $invoice->paid_at = $invoice->paid_at ?? now();
        } else {
            $invoice->paid_at = null;
        }
        $invoice->save();

        if ($invoice->booking) {
            $invoice->booking->payment_status = $this->mapInvoiceStatusToBookingPaymentStatus($resolvedStatus);
            $invoice->booking->save();
        }
    }

    private function calculateInvoiceNetPaidCents(Invoice $invoice): int
    {
        $netPaidCents = $invoice->transactions()
            ->where('amount_cents', '>', 0)
            ->whereIn('status', ['succeeded', 'paid', 'partially_refunded', 'refunded'])
            ->selectRaw('COALESCE(SUM(amount_cents - refunded_amount_cents), 0) as net_cents')
            ->value('net_cents');

        return max(0, (int) ($netPaidCents ?? 0));
    }

    private function resolveInvoiceStatus(Invoice $invoice, int $netPaidCents): string
    {
        $invoiceTotalCents = (int) ($invoice->total_cents ?? $invoice->amount_cents ?? 0);

        if ($invoiceTotalCents > 0 && $netPaidCents >= $invoiceTotalCents) {
            return 'paid';
        }

        if ($netPaidCents > 0) {
            return 'partial';
        }

        if ($this->hasRefundActivity($invoice)) {
            return 'refunded';
        }

        $dueDate = $invoice->due_date ? Carbon::parse($invoice->due_date)->startOfDay() : null;
        if ($dueDate && $dueDate->lt(now()->startOfDay())) {
            return 'overdue';
        }

        return 'pending';
    }

    private function hasRefundActivity(Invoice $invoice): bool
    {
        return $invoice->transactions()
            ->where(function ($query) {
                $query->where(function ($nested) {
                    $nested->where('amount_cents', '<', 0)
                        ->where('status', 'refunded');
                })->orWhere('refunded_amount_cents', '>', 0);
            })
            ->exists();
    }

    private function resolveSummaryStatus(Invoice $invoice): string
    {
        $status = strtolower((string) $invoice->status);

        if (in_array($status, [
            'paid',
            'pending',
            'pending_verification',
            'partial',
            'unpaid',
            'overdue',
            'cancelled',
            'refunded',
        ], true)) {
            return $status;
        }

        if ($status === 'voided') {
            return 'cancelled';
        }

        $dueDate = $invoice->due_date ? Carbon::parse($invoice->due_date)->startOfDay() : null;
        if ($dueDate && $dueDate->lt(now()->startOfDay())) {
            return 'overdue';
        }

        return $status !== '' ? $status : 'pending';
    }

    private function mapInvoiceStatusToBookingPaymentStatus(string $invoiceStatus): string
    {
        return match ($invoiceStatus) {
            'paid' => 'paid',
            'partial' => 'partial',
            'refunded' => 'refunded',
            default => 'unpaid',
        };
    }

    private function normalizeManualPaymentMethod(?string $method): ?string
    {
        if ($method === null) {
            return null;
        }

        $normalized = strtolower(trim($method));
        $normalized = str_replace(['-', ' '], '_', $normalized);

        return match ($normalized) {
            'maya' => 'paymaya',
            default => $normalized,
        };
    }

    private function logInvoiceStatusTransition(Invoice $invoice, string $beforeStatus, array $context = []): void
    {
        $afterStatus = $invoice->status;
        if ($beforeStatus === $afterStatus) {
            return;
        }

        $event = match ($afterStatus) {
            'paid' => 'invoice.paid',
            'overdue' => 'invoice.overdue',
            'voided' => 'invoice.voided',
            default => 'invoice.status_updated',
        };

        $this->auditLogService->invoiceEvent($event, [
            'subject_type' => 'invoice',
            'subject_id' => $invoice->id,
            'booking_id' => $invoice->booking_id,
            'invoice_id' => $invoice->id,
            'payment_transaction_id' => $context['payment_transaction_id'] ?? null,
            'property_id' => $invoice->property_id,
            'tenant_id' => $invoice->tenant_id,
            'landlord_id' => $invoice->landlord_id,
            'status_before' => $beforeStatus,
            'status_after' => $afterStatus,
            'summary' => $context['summary'] ?? 'Invoice status changed.',
            'metadata' => $context['metadata'] ?? [],
        ]);
    }

    public function generateCashInvoice(\App\Models\Room $room)
    {
        $tenantId = Auth::id();
        if (! $tenantId) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        DB::beginTransaction();
        try {
            $reference = 'CASH-'.date('Ymd').'-'.strtoupper(\Illuminate\Support\Str::random(6));

            $invoice = Invoice::create([
                'reference' => $reference,
                'landlord_id' => $room->property->landlord_id,
                'property_id' => $room->property_id,
                'booking_id' => null, // No booking yet
                'tenant_id' => $tenantId,
                'description' => 'Cash Payment for '.$room->property->title.' - Room '.$room->room_number,
                'amount_cents' => (int) round($room->monthly_rate * 100),
                'currency' => 'PHP',
                'status' => 'pending',
                'issued_at' => now(),
                'due_date' => now()->addDays(3),
            ]);

            DB::commit();

            return response()->json($invoice, 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Failed to create cash invoice', 'error' => $e->getMessage()], 500);
        }
    }
}
