<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesLandlordAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Invoice;
use App\Models\PaymentTransaction;

class InvoiceController extends Controller
{
    use ResolvesLandlordAccess;

    /**
     * List invoices (basic filtering)
     */
    public function index(Request $request)
    {
        $context = $this->resolveLandlordContext($request);

        $query = Invoice::query()->where('landlord_id', $context['landlord_id']);

        if ($request->has('status')) $query->where('status', $request->query('status'));
        if ($request->has('tenant_id')) $query->where('tenant_id', $request->query('tenant_id'));
        if ($request->has('property_id')) $query->where('property_id', $request->query('property_id'));

        $invoices = $query->with('transactions')->orderBy('created_at', 'desc')->paginate(20);
        return response()->json($invoices, 200);
    }

    /**
     * Create an invoice
     */
    public function store(Request $request)
    {
        $context = $this->resolveLandlordContext($request);

        $validated = $request->validate([
            'booking_id' => 'nullable|integer',
            'tenant_id' => 'nullable|integer',
            'property_id' => 'nullable|integer',
            'description' => 'nullable|string',
            'amount_cents' => 'required|integer|min:0',
            'currency' => 'nullable|string|size:3',
            'due_date' => 'nullable|date',
            'metadata' => 'nullable|array'
        ]);

        $invoice = null;
        DB::beginTransaction();
        try {
            $reference = 'INV-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)),0,6));

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
        $invoice = Invoice::with('transactions')->findOrFail($id);
        if ($invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        return response()->json($invoice, 200);
    }

    /**
     * Charge (gateway) - stubbed for now
     */
    public function charge(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $invoice = Invoice::findOrFail($id);
        if ($invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'method' => 'required|string',
            'amount_cents' => 'nullable|integer|min:0',
            'payment_method_id' => 'nullable|integer',
            'idempotency_key' => 'nullable|string'
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

            // Update invoice status (simple logic)
            $invoice->paid_at = now();
            $invoice->status = 'paid';
            $invoice->save();

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
        $invoice = Invoice::findOrFail($id);
        if ($invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'amount_cents' => 'required|integer|min:0',
            'method' => 'required|string',
            'reference' => 'nullable|string',
            'received_at' => 'nullable|date',
            'notes' => 'nullable|string'
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

            // Mark invoice as paid if full
            if ($validated['amount_cents'] >= $invoice->amount_cents) {
                $invoice->status = 'paid';
                $invoice->paid_at = now();
                $invoice->save();
            } else {
                $invoice->status = 'partial';
                $invoice->save();
            }

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
            'amount_cents' => 'required|integer|min:0',
            'method' => 'required|string',
            'reference' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

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

            DB::commit();
            return response()->json(['success' => true, 'transaction' => $tx], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to record offline payment', 'error' => $e->getMessage()], 500);
        }
    }
}
