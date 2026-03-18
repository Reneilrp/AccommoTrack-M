<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\PaymentTransaction;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        $tx = PaymentTransaction::with(['invoice.booking.room', 'invoice.transactions'])->findOrFail($id);
        $invoice = $tx->invoice;
        if ($invoice && $invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['success' => false, 'data' => null, 'message' => 'Unauthorized'], 403);
        }

        if ($tx->amount_cents <= 0) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Only original payment transactions can be refunded',
            ], 422);
        }

        $validated = $request->validate([
            'amount_cents' => 'nullable|integer|min:1',
            'reason' => 'nullable|string',
        ]);

        $alreadyRefundedForTx = max(0, (int) ($tx->refunded_amount_cents ?? 0));
        $remainingForTx = max(0, (int) $tx->amount_cents - $alreadyRefundedForTx);

        if ($remainingForTx <= 0) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'This transaction is already fully refunded',
            ], 422);
        }

        $maxRefundByPolicy = $this->computeMaxRefundForTransaction($invoice, $tx, $remainingForTx);
        $refundAmount = (int) ($validated['amount_cents'] ?? $maxRefundByPolicy);

        if ($maxRefundByPolicy <= 0) {
            return response()->json([
                'success' => false,
                'data' => [
                    'max_refundable_cents' => 0,
                    'remaining_for_transaction_cents' => $remainingForTx,
                ],
                'message' => 'Refund window has ended or no refundable amount remains after penalty',
            ], 422);
        }

        if ($refundAmount > $maxRefundByPolicy) {
            return response()->json([
                'success' => false,
                'data' => [
                    'max_refundable_cents' => $maxRefundByPolicy,
                    'requested_amount_cents' => $refundAmount,
                    'remaining_for_transaction_cents' => $remainingForTx,
                ],
                'message' => 'Requested refund exceeds the current refundable cap',
            ], 422);
        }

        DB::beginTransaction();
        try {
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
            if ($tx->refunded_amount_cents >= $tx->amount_cents) {
                $tx->status = 'refunded';
            } elseif ($tx->refunded_amount_cents > 0) {
                $tx->status = 'partially_refunded';
            }
            $tx->save();

            // Update invoice status if fully refunded
            if ($invoice) {
                $totalRefunded = $invoice->transactions()->where('status', 'refunded')->sum('amount_cents');
                // Note: $refund->amount_cents is negative, so we take absolute value or use the sum
                // Let's use the sum of negative values and compare with -1 * invoice amount
                if (abs($totalRefunded) >= $invoice->amount_cents) {
                    $invoice->status = 'refunded';
                    $invoice->save();
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'refund' => $refund,
                    'max_refundable_cents' => $maxRefundByPolicy,
                    'applied_refund_cents' => $refundAmount,
                ],
                'message' => 'Refund processed successfully',
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Refund failed: '.$e->getMessage(),
            ], 500);
        }
    }

    private function computeMaxRefundForTransaction($invoice, PaymentTransaction $tx, int $remainingForTx): int
    {
        if (! $invoice) {
            return $remainingForTx;
        }

        $transactions = $invoice->transactions ?? collect();
        $positiveTransactions = $transactions->filter(function ($line) {
            return (int) $line->amount_cents > 0;
        });

        $totalPaidCents = (int) $positiveTransactions->sum(function ($line) {
            return (int) $line->amount_cents;
        });

        $alreadyRefundedCents = (int) $positiveTransactions->sum(function ($line) {
            return max(0, (int) ($line->refunded_amount_cents ?? 0));
        });

        $booking = $invoice->booking;
        if (! $booking || ! $booking->start_date || ! $booking->end_date || $totalPaidCents <= 0) {
            return $remainingForTx;
        }

        $startDate = Carbon::parse($booking->start_date)->startOfDay();
        $endDate = Carbon::parse($booking->end_date)->startOfDay();
        $today = now()->startOfDay();

        $billingPolicy = strtolower((string) ($booking->room->billing_policy ?? $booking->billing_policy ?? 'monthly'));
        $proratedCents = 0;

        if ($billingPolicy === 'daily') {
            $totalDays = max(1, $startDate->diffInDays($endDate) + 1);
            if ($today->lt($startDate)) {
                $elapsedDays = 0;
            } elseif ($today->gt($endDate)) {
                $elapsedDays = $totalDays;
            } else {
                $elapsedDays = $startDate->diffInDays($today) + 1;
            }

            $unusedDays = max(0, $totalDays - $elapsedDays);
            $proratedCents = (int) floor(($totalPaidCents * $unusedDays) / $totalDays);
        } else {
            $totalMonths = max(1, (int) ($booking->total_months ?: ceil(($startDate->diffInDays($endDate) + 1) / 30)));
            if ($today->lt($startDate)) {
                $elapsedDays = 0;
            } elseif ($today->gt($endDate)) {
                $elapsedDays = $totalMonths * 30;
            } else {
                $elapsedDays = $startDate->diffInDays($today);
            }

            // For monthly billing, consider a month consumed for each full 30-day block.
            $usedMonths = min($totalMonths, max(0, (int) floor($elapsedDays / 30)));
            $unusedMonths = max(0, $totalMonths - $usedMonths);
            $proratedCents = (int) floor(($totalPaidCents * $unusedMonths) / $totalMonths);
        }

        $fixedPenaltyCents = max(0, (int) config('refunds.fixed_penalty_cents', 0));
        $invoiceCapRemaining = max(0, $proratedCents - $fixedPenaltyCents - $alreadyRefundedCents);

        return min($remainingForTx, $invoiceCapRemaining);
    }
}
