<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Services\AuditLogService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    use ResolvesLandlordAccess;

    public function __construct(protected AuditLogService $auditLogService)
    {
    }

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
            $invoiceStatusBefore = $invoice?->status;

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

            // Recompute invoice and booking payment state from net paid values.
            if ($invoice) {
                $this->recomputeInvoiceAndBookingStatus($invoice);

                $this->auditLogService->invoiceEvent('invoice.refunded', [
                    'subject_type' => 'invoice',
                    'subject_id' => $invoice->id,
                    'booking_id' => $invoice->booking_id,
                    'invoice_id' => $invoice->id,
                    'payment_transaction_id' => $refund->id,
                    'property_id' => $invoice->property_id,
                    'tenant_id' => $invoice->tenant_id,
                    'landlord_id' => $invoice->landlord_id,
                    'status_before' => $invoiceStatusBefore,
                    'status_after' => $invoice->status,
                    'summary' => 'Invoice refund processed.',
                    'metadata' => [
                        'source_transaction_id' => $tx->id,
                        'refund_transaction_id' => $refund->id,
                        'refund_amount_cents' => $refundAmount,
                        'reason' => $validated['reason'] ?? null,
                    ],
                ]);
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

    private function mapInvoiceStatusToBookingPaymentStatus(string $invoiceStatus): string
    {
        return match ($invoiceStatus) {
            'paid' => 'paid',
            'partial' => 'partial',
            'refunded' => 'refunded',
            default => 'unpaid',
        };
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
