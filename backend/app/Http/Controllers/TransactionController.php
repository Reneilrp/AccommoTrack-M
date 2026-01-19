<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\PaymentTransaction;
use App\Models\Invoice;

class TransactionController extends Controller
{
    use ResolvesLandlordAccess;

    public function show(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $tx = PaymentTransaction::with('invoice')->findOrFail($id);
        if ($tx->invoice && $tx->invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        return response()->json($tx, 200);
    }

    /**
     * Refund a transaction (basic stub)
     */
    public function refund(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $tx = PaymentTransaction::findOrFail($id);
        $invoice = $tx->invoice;
        if ($invoice && $invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'amount_cents' => 'nullable|integer|min:0',
            'reason' => 'nullable|string'
        ]);

        DB::beginTransaction();
        try {
            $refundAmount = $validated['amount_cents'] ?? $tx->amount_cents;

            // Create a refund transaction record (in a real integration we'd call gateway)
            $refund = PaymentTransaction::create([
                'invoice_id' => $tx->invoice_id,
                'tenant_id' => $tx->tenant_id,
                'amount_cents' => -1 * intval($refundAmount),
                'currency' => $tx->currency,
                'status' => 'refunded',
                'method' => $tx->method,
                'gateway_reference' => null,
                'gateway_response' => ['reason' => $validated['reason'] ?? null],
            ]);

            // update original transaction refunded_amount_cents
            $tx->refunded_amount_cents = ($tx->refunded_amount_cents ?? 0) + $refundAmount;
            $tx->save();

            DB::commit();
            return response()->json($refund, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Refund failed', 'error' => $e->getMessage()], 500);
        }
    }
}
