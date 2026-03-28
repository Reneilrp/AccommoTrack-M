<?php

namespace App\Http\Controllers\Common;

use App\Events\InvoiceUpdated;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Models\User;
use App\Notifications\NewPaymentReceived;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    use ResolvesLandlordAccess;

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

        $validated = $request->validate([
            'amount_cents' => 'required|integer|min:0',
            'method' => 'required|string',
            'reference' => 'nullable|string',
            'received_at' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
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

            // Mark invoice as paid if full (respecting existing sum)
            $totalPaid = $invoice->transactions()->whereIn('status', ['succeeded', 'paid'])->sum('amount_cents');
            $invoiceTotal = $invoice->total_cents ?? $invoice->amount_cents;

            if ($totalPaid >= $invoiceTotal) {
                $invoice->status = 'paid';
                $invoice->paid_at = now();
            } else {
                $invoice->status = 'partial';
            }
            $invoice->save();

            // Also update the associated booking's payment status
            if ($invoice->booking_id) {
                $booking = $invoice->booking;
                $booking->payment_status = $invoice->status;
                $booking->save();
            }

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

        $validated = $request->validate([
            'amount_cents' => 'required|integer|min:1',
            'method' => 'required|string',
            'reference' => 'nullable|string',
            'notes' => 'nullable|string',
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
            $tx = PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $tenantId,
                'amount_cents' => $validated['amount_cents'],
                'currency' => $invoice->currency,
                'status' => 'pending_offline',
                'method' => $validated['method'],
                'gateway_reference' => $validated['reference'] ?? null,
                'gateway_response' => ['notes' => $validated['notes'] ?? null],
            ]);

            // Mark invoice as pending_verification so landlord can confirm
            $invoice->status = 'pending_verification';
            $invoice->save();

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
        ]);

        $shouldBroadcastInvoiceUpdate = false;

        DB::beginTransaction();
        try {
            $pendingTxs = $invoice->transactions()->where('status', 'pending_offline')->get();

            if ($validated['action'] === 'approve') {
                foreach ($pendingTxs as $ptx) {
                    $ptx->status = 'succeeded';
                    $ptx->save();
                }
                // Check if fully paid
                $totalPaid = $invoice->transactions()->whereIn('status', ['succeeded', 'paid'])->sum('amount_cents');
                $invoiceTotal = $invoice->total_cents ?? $invoice->amount_cents;
                $invoice->status = $totalPaid >= $invoiceTotal ? 'paid' : 'partial';
                if ($invoice->status === 'paid') $invoice->paid_at = now();
                $invoice->save();

                // Update booking payment status
                if ($invoice->booking_id && $invoice->booking) {
                    $invoice->booking->payment_status = $invoice->status;
                    $invoice->booking->save();
                }

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
                    $ptx->status = 'voided';
                    $ptx->save();
                }
                $invoice->status = 'pending';
                $invoice->save();

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
