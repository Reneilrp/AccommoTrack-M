<?php

namespace App\Http\Controllers\Common;

use App\Events\InvoiceUpdated;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\PaymentLedgerService;
use App\Support\SystemToggle;
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

    public function __construct(
        protected AuditLogService $auditLogService,
        private readonly PaymentLedgerService $paymentLedgerService,
    ) {}

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
        if ($request->has('invoice_type')) {
            $query->where('invoice_type', $request->query('invoice_type'));
        }
        if ($request->has('exclude_invoice_type')) {
            $excludedTypes = collect(explode(',', (string) $request->query('exclude_invoice_type')))
                ->map(fn ($type) => trim($type))
                ->filter()
                ->values();

            if ($excludedTypes->isNotEmpty()) {
                $query->where(function ($excludeQuery) use ($excludedTypes) {
                    $excludeQuery->whereNull('invoice_type')
                        ->orWhereNotIn('invoice_type', $excludedTypes->all());
                });
            }
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
            'invoice_type' => 'nullable|string|max:32',
            'exclude_invoice_type' => 'nullable|string|max:255',
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

        if (isset($validated['invoice_type'])) {
            $query->where('invoice_type', $validated['invoice_type']);
        }

        if (! empty($validated['exclude_invoice_type'])) {
            $excludedTypes = collect(explode(',', (string) $validated['exclude_invoice_type']))
                ->map(fn ($type) => trim($type))
                ->filter()
                ->values();

            if ($excludedTypes->isNotEmpty()) {
                $query->where(function ($excludeQuery) use ($excludedTypes) {
                    $excludeQuery->whereNull('invoice_type')
                        ->orWhereNotIn('invoice_type', $excludedTypes->all());
                });
            }
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

        $invoice = Invoice::with(['property', 'booking.property'])->findOrFail($id);
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

            $this->paymentLedgerService->recomputeInvoiceAndBookingStatus($invoice, Auth::id());

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

            $this->paymentLedgerService->recomputeInvoiceAndBookingStatus($invoice, Auth::id());

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
        if (SystemToggle::getBool('tenant_payments_disabled', (bool) config('app.tenant_payments_disabled', false))) {
            return response()->json([
                'message' => 'Tenant payment submissions are temporarily unavailable while payment compliance updates are in progress.',
            ], 503);
        }

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
            'proof_image' => 'required|image|mimes:jpeg,jpg,png,webp|max:5120',
        ], [
            'proof_image.required' => 'Proof of payment image is required. Please upload an image.',
            'proof_image.image' => 'Proof of payment must be a valid image file.',
            'proof_image.mimes' => 'Proof of payment image must be a JPEG, JPG, PNG, or WEBP file.',
            'proof_image.max' => 'Proof of payment image must not exceed 5MB.',
        ]);

        DB::beginTransaction();
        try {
            $invoice = Invoice::with(['property', 'booking.property'])
                ->whereKey($invoice->id)
                ->lockForUpdate()
                ->firstOrFail();

            $hasPendingSubmission = $invoice->transactions()
                ->where('status', 'pending_offline')
                ->lockForUpdate()
                ->exists();

            if ($hasPendingSubmission && strtolower((string) $invoice->status) === 'pending_verification') {
                DB::rollBack();

                return response()->json([
                    'message' => 'A manual payment submission is already pending verification for this invoice.',
                ], 422);
            }

            // Recompute remaining balance while holding row locks to prevent concurrent over-submission.
            $invoiceTotalCents = $invoice->total_cents ?? $invoice->amount_cents;
            $alreadyPaidCents = $invoice->transactions()
                ->whereIn('status', ['succeeded', 'paid', 'pending_offline', 'partially_refunded'])
                ->lockForUpdate()
                ->selectRaw('SUM(amount_cents - refunded_amount_cents) as net_cents')
                ->value('net_cents') ?? 0;
            $remainingCents = max(0, $invoiceTotalCents - $alreadyPaidCents);

            if ($validated['amount_cents'] > $remainingCents) {
                DB::rollBack();

                return response()->json([
                    'message' => 'Payment amount cannot exceed the remaining balance of ₱'.number_format($remainingCents / 100, 2),
                ], 422);
            }

            $property = $invoice->property ?? $invoice->booking?->property;
            $allowPartial = $property ? (bool) $property->allow_partial_payments : true;
            if (! $allowPartial && $validated['amount_cents'] < $remainingCents) {
                DB::rollBack();

                return response()->json([
                    'message' => 'Partial payments are not allowed for this property. Please pay the full remaining balance of ₱'.number_format($remainingCents / 100, 2),
                ], 422);
            }

            if ($allowPartial && $property) {
                $minPercent = $property->min_partial_payment_pct ?? 20;
                $minAmount = $remainingCents * ($minPercent / 100);
                if ($validated['amount_cents'] < $remainingCents && $validated['amount_cents'] < $minAmount) {
                    DB::rollBack();

                    return response()->json([
                        'message' => 'The minimum partial payment for this property is '.$minPercent.'% (₱'.number_format($minAmount / 100, 2).').',
                    ], 422);
                }
            }

            $hadPreviousDeniedSubmission = $invoice->transactions()
                ->whereIn('method', ['cash', 'gcash', 'bank_transfer', 'paymaya'])
                ->where('status', 'voided')
                ->exists();

            $statusBefore = $invoice->status;

            $invoiceType = strtolower((string) ($invoice->invoice_type ?? $invoice->type ?? ''));
            if ($validated['method'] === 'gcash' && $invoiceType === 'reservation_fee') {
                $manualGcashDisabled = \App\Support\SystemToggle::getBool('manual_gcash_reservation_disabled', false);
                if ($manualGcashDisabled) {
                    DB::rollBack();

                    return response()->json([
                        'message' => 'Manual GCash is currently disabled for reservation fees.',
                    ], 422);
                }
            }

            $proofImagePath = null;
            if (isset($validated['proof_image'])) {
                $proofImagePath = $validated['proof_image']->store('payment_proofs');
            }

            $isGCash = $validated['method'] === 'gcash';
            $txStatus = $isGCash ? 'success' : 'pending_offline';

            $tx = PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $tenantId,
                'amount_cents' => $validated['amount_cents'],
                'currency' => $invoice->currency,
                'status' => $txStatus,
                'method' => $validated['method'],
                'gateway_reference' => $validated['reference'] ?? null,
                'gateway_response' => [
                    'notes' => $validated['notes'] ?? null,
                    'proof_image_path' => $proofImagePath,
                    'proof_image_url' => $proofImagePath ? \Illuminate\Support\Facades\Storage::url($proofImagePath) : null,
                ],
            ]);

            if ($isGCash) {
                $invoice->status = 'paid';
                $invoice->save();

                $this->logInvoiceStatusTransition($invoice, $statusBefore, [
                    'payment_transaction_id' => $tx->id,
                    'summary' => 'Invoice automatically marked as paid via GCash.',
                ]);

                $this->paymentLedgerService->recomputeInvoiceAndBookingStatus($invoice, Auth::id());
                $invoice->refresh();
            } else {
                // Mark invoice as pending_verification so landlord can confirm
                $invoice->status = 'pending_verification';
                $invoice->save();

                $this->logInvoiceStatusTransition($invoice, $statusBefore, [
                    'payment_transaction_id' => $tx->id,
                    'summary' => 'Invoice moved to pending verification after tenant manual submission.',
                ]);
            }

            $summaryLog = $isGCash
                ? 'Tenant submitted manual GCash payment (auto-approved).'
                : ($hadPreviousDeniedSubmission ? 'Tenant re-submitted manual payment proof after a denial.' : 'Tenant submitted manual payment proof.');

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
                'summary' => $summaryLog,
                'metadata' => [
                    'amount_cents' => $validated['amount_cents'],
                    'method' => $validated['method'],
                    'reference' => $validated['reference'] ?? null,
                    'proof_image_path' => $proofImagePath,
                ],
            ]);

            if ($isGCash) {
                if ($invoice->tenant) {
                    try {
                        $invoice->tenant->notify(new \App\Notifications\InvoiceVerifiedNotification($invoice, 'approved'));
                    } catch (\Throwable $notifyError) {
                        \Log::warning('gcash auto-verify notification failed', [
                            'invoice_id' => $invoice->id,
                            'error' => $notifyError->getMessage(),
                        ]);
                    }
                }
                \App\Events\InvoiceUpdated::dispatch($invoice->loadMissing(['booking.property', 'tenant', 'transactions']));
            } else {
                // Notify landlord about the cash payment awaiting verification
                $landlord = User::find($invoice->landlord_id);
                if ($landlord) {
                    $landlord->notify(new \App\Notifications\NewPaymentReceived(true));
                }
            }

            DB::commit();

            return response()->json(['success' => true, 'transaction' => $tx->fresh()], 201);
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
            'reason_code' => 'required_if:action,reject|in:invalid_proof,wrong_amount,unclear_image,mismatched_reference,duplicate_submission,other',
            'reason' => ['required_if:action,reject', 'string', 'max:500', 'not_regex:/^\s*$/'],
        ]);

        $shouldBroadcastInvoiceUpdate = false;

        DB::beginTransaction();
        try {
            $invoice = Invoice::with('booking', 'tenant')
                ->whereKey($invoice->id)
                ->lockForUpdate()
                ->firstOrFail();

            $invoiceStatusBefore = $invoice->status;
            $pendingTxs = $invoice->transactions()
                ->where('status', 'pending_offline')
                ->lockForUpdate()
                ->get();

            if ($pendingTxs->isEmpty()) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => 'No pending manual payment found for verification.',
                ], 422);
            }

            if ($validated['action'] === 'approve') {
                foreach ($pendingTxs as $ptx) {
                    $gatewayResponse = is_array($ptx->gateway_response) ? $ptx->gateway_response : [];
                    $gatewayResponse['verification_action'] = 'approve';
                    $gatewayResponse['verified_by_user_id'] = Auth::id();
                    $gatewayResponse['verified_at'] = now()->toIso8601String();

                    $ptx->status = 'succeeded';
                    $ptx->gateway_response = $gatewayResponse;
                    $ptx->save();
                }
                $this->paymentLedgerService->recomputeInvoiceAndBookingStatus($invoice, Auth::id());

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
                        'action_by_user_id' => Auth::id(),
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
                $rejectionReason = trim((string) ($validated['reason'] ?? ''));

                // Reject: void pending offline transactions
                foreach ($pendingTxs as $ptx) {
                    $gatewayResponse = is_array($ptx->gateway_response) ? $ptx->gateway_response : [];
                    $gatewayResponse['denial_reason_code'] = $validated['reason_code'];
                    $gatewayResponse['denial_reason'] = $rejectionReason;
                    $gatewayResponse['rejection_reason'] = $rejectionReason;
                    $gatewayResponse['verification_action'] = 'reject';
                    $gatewayResponse['verified_by_user_id'] = Auth::id();
                    $gatewayResponse['verified_at'] = now()->toIso8601String();

                    $ptx->status = 'voided';
                    $ptx->gateway_response = $gatewayResponse;
                    $ptx->save();
                }
                $this->paymentLedgerService->recomputeInvoiceAndBookingStatus($invoice, Auth::id());

                $this->logInvoiceStatusTransition($invoice, $invoiceStatusBefore, [
                    'payment_transaction_id' => $pendingTxs->last()?->id,
                    'summary' => 'Invoice status updated after payment denial.',
                    'metadata' => [
                        'reason_code' => $validated['reason_code'],
                        'reason' => $rejectionReason,
                        'rejection_reason' => $rejectionReason,
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
                        'action_by_user_id' => Auth::id(),
                        'reason_code' => $validated['reason_code'],
                        'reason' => $rejectionReason,
                        'rejection_reason' => $rejectionReason,
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
            \Log::error('verifyCash error: '.$e->getMessage());

            return response()->json(['message' => 'Action failed', 'error' => $e->getMessage()], 500);
        }
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

    private function normalizeManualPaymentMethod(?string $method): ?string
    {
        if ($method === null) {
            return null;
        }

        $normalized = strtolower(trim($method));
        $normalized = str_replace(['-', ' '], '_', $normalized);

        return match ($normalized) {
            'cash_on_site', 'cash_onsite', 'cashonsite' => 'cash',
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

    /**
     * Tenant applying their wallet credits to pay an invoice
     */
    public function applyWalletCreditForTenant(Request $request, $id)
    {
        if (SystemToggle::getBool('tenant_payments_disabled', (bool) config('app.tenant_payments_disabled', false))) {
            return response()->json([
                'message' => 'Tenant payment submissions are temporarily unavailable while payment compliance updates are in progress.',
            ], 503);
        }

        $invoice = Invoice::findOrFail($id);
        $tenantId = Auth::id();
        if ($invoice->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'amount_cents' => 'required|integer|min:1',
        ]);

        DB::beginTransaction();
        try {
            $invoice = Invoice::with(['property', 'booking.property'])
                ->whereKey($invoice->id)
                ->lockForUpdate()
                ->firstOrFail();

            $propertyId = $invoice->property_id ?? $invoice->booking?->property_id;

            $availableCredits = \App\Models\TenantCredit::getBalance($tenantId, $propertyId);

            if ($validated['amount_cents'] > $availableCredits) {
                DB::rollBack();

                return response()->json([
                    'message' => 'Insufficient wallet credits.',
                ], 422);
            }

            // Recompute remaining balance
            $invoiceTotalCents = $invoice->total_cents ?? $invoice->amount_cents;
            $alreadyPaidCents = $invoice->transactions()
                ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
                ->lockForUpdate()
                ->selectRaw('SUM(amount_cents - refunded_amount_cents) as net_cents')
                ->value('net_cents') ?? 0;
            $remainingCents = max(0, $invoiceTotalCents - $alreadyPaidCents);

            if ($validated['amount_cents'] > $remainingCents) {
                DB::rollBack();

                return response()->json([
                    'message' => 'Credit amount cannot exceed the remaining balance of ₱'.number_format($remainingCents / 100, 2),
                ], 422);
            }

            // Debit the wallet
            \App\Models\TenantCredit::create([
                'tenant_id' => $tenantId,
                'property_id' => $propertyId,
                'amount_cents' => $validated['amount_cents'],
                'type' => 'debit',
                'description' => 'Applied to invoice #'.$invoice->id,
            ]);

            // Create successful transaction immediately since it's credit
            $tx = PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $tenantId,
                'amount_cents' => $validated['amount_cents'],
                'currency' => $invoice->currency,
                'status' => 'succeeded',
                'method' => 'wallet_credit',
                'gateway_response' => [
                    'notes' => 'Paid using wallet credit',
                ],
            ]);

            // Log event
            $this->auditLogService->paymentEvent('payment.succeeded', [
                'invoice_id' => $invoice->id,
                'tenant_id' => $tenantId,
                'property_id' => $propertyId,
                'payment_transaction_id' => $tx->id,
                'summary' => 'Tenant applied wallet credits to invoice.',
                'metadata' => [
                    'amount_cents' => $validated['amount_cents'],
                ],
            ]);

            // Update invoice status since it's confirmed
            $statusBefore = $invoice->status;
            if ($remainingCents - $validated['amount_cents'] <= 0) {
                $invoice->status = 'paid';
            } else {
                $invoice->status = 'partial';
            }
            $invoice->save();

            DB::commit();

            return response()->json(['success' => true, 'transaction' => $tx->fresh(), 'invoice' => $invoice], 200);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Failed to apply credits', 'error' => $e->getMessage()], 500);
        }
    }
}
