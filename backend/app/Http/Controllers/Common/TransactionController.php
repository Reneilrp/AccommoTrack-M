<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Services\AuditLogService;
use App\Services\PaymentLedgerService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    use ResolvesLandlordAccess;

    public function __construct(
        protected AuditLogService $auditLogService,
        private readonly PaymentLedgerService $paymentLedgerService,
    ) {}

    public function show(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_manage_payments');
        $tx = PaymentTransaction::with('invoice')->findOrFail($id);
        if ($tx->invoice && $tx->invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($tx->invoice && $tx->invoice->property_id) {
            $this->checkPropertyAccess($context, (int) $tx->invoice->property_id);
        }

        return response()->json($tx, 200);
    }

    /**
     * Refund a transaction (basic stub)
     */
    public function refund(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_manage_payments');
        $tx = PaymentTransaction::with(['invoice.booking.room', 'invoice.transactions'])->findOrFail($id);
        $invoice = $tx->invoice;
        if ($invoice && $invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['success' => false, 'data' => null, 'message' => 'Unauthorized'], 403);
        }

        if ($invoice && $invoice->property_id) {
            $this->checkPropertyAccess($context, (int) $invoice->property_id);
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
                $this->paymentLedgerService->recomputeInvoiceAndBookingStatus($invoice, auth()->id());

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

            if ($tx->tenant_id && $invoice?->property_id) {
                \App\Models\TenantCredit::create([
                    'tenant_id' => $tx->tenant_id,
                    'property_id' => $invoice->property_id,
                    'room_id' => $invoice->booking?->room_id,
                    'amount_cents' => $refundAmount,
                    'type' => 'refund',
                    'description' => 'Refund for transaction #'.$tx->id.' from invoice #'.$invoice->id,
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

    /**
     * Refund an entire invoice (merging multiple transactions if needed)
     */
    public function refundInvoice(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_manage_payments');

        $invoice = Invoice::with(['booking.room', 'transactions'])->findOrFail($id);

        if ($invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if ($invoice->property_id) {
            $this->checkPropertyAccess($context, (int) $invoice->property_id);
        }

        $validated = $request->validate([
            'amount_cents' => 'nullable|integer|min:1',
            'reason' => 'nullable|string',
        ]);

        $maxRefundByPolicy = $this->computeMaxRefundForInvoice($invoice);
        $refundAmount = (int) ($validated['amount_cents'] ?? $maxRefundByPolicy);

        if ($maxRefundByPolicy <= 0) {
            return response()->json([
                'success' => false,
                'data' => ['max_refundable_cents' => 0],
                'message' => 'No refundable amount remains for this invoice.',
            ], 422);
        }

        if ($refundAmount > $maxRefundByPolicy) {
            return response()->json([
                'success' => false,
                'data' => [
                    'max_refundable_cents' => $maxRefundByPolicy,
                    'requested_amount_cents' => $refundAmount,
                ],
                'message' => 'Requested refund exceeds the current refundable cap for this invoice',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $invoiceStatusBefore = $invoice->status;

            // Create ONE merged refund transaction record
            $refund = PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $invoice->tenant_id,
                'amount_cents' => -1 * intval($refundAmount),
                'currency' => $invoice->transactions->first()?->currency ?? 'PHP',
                'status' => 'refunded',
                'method' => 'merged_refund',
                'gateway_reference' => null,
                'gateway_response' => [
                    'reason' => $validated['reason'] ?? 'Merged refund for multiple payments',
                    'is_merged' => true,
                ],
            ]);

            // Distribute the refund amount across source transactions for accurate individual status tracking
            $remainingToDistribute = $refundAmount;
            $positiveTransactions = $invoice->transactions
                ->filter(fn ($tx) => (int) $tx->amount_cents > 0)
                ->sortByDesc('created_at'); // Refund newest first usually

            foreach ($positiveTransactions as $tx) {
                if ($remainingToDistribute <= 0) {
                    break;
                }

                $txRefundable = max(0, (int) $tx->amount_cents - (int) ($tx->refunded_amount_cents ?? 0));
                if ($txRefundable <= 0) {
                    continue;
                }

                $allocation = min($remainingToDistribute, $txRefundable);
                $tx->refunded_amount_cents = (int) ($tx->refunded_amount_cents ?? 0) + $allocation;

                if ($tx->refunded_amount_cents >= $tx->amount_cents) {
                    $tx->status = 'refunded';
                } elseif ($tx->refunded_amount_cents > 0) {
                    $tx->status = 'partially_refunded';
                }
                $tx->save();

                $remainingToDistribute -= $allocation;
            }

            // Recompute invoice and booking payment state
            $this->paymentLedgerService->recomputeInvoiceAndBookingStatus($invoice, auth()->id());

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
                'summary' => 'Merged invoice refund processed.',
                'metadata' => [
                    'refund_transaction_id' => $refund->id,
                    'refund_amount_cents' => $refundAmount,
                    'reason' => $validated['reason'] ?? null,
                ],
            ]);

            if ($invoice->tenant_id && $invoice->property_id) {
                \App\Models\TenantCredit::create([
                    'tenant_id' => $invoice->tenant_id,
                    'property_id' => $invoice->property_id,
                    'room_id' => $invoice->booking?->room_id,
                    'amount_cents' => $refundAmount,
                    'type' => 'refund',
                    'description' => 'Merged refund for invoice #'.$invoice->id,
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
                'message' => 'Merged refund processed successfully',
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['success' => false, 'message' => 'Refund failed: '.$e->getMessage()], 500);
        }
    }

    private function computeMaxRefundForInvoice($invoice): int
    {
        $transactions = $invoice->transactions ?? collect();
        $positiveTransactions = $transactions->filter(fn ($line) => (int) $line->amount_cents > 0);

        $totalPaidCents = (int) $positiveTransactions->sum(fn ($line) => (int) $line->amount_cents);
        $alreadyRefundedCents = (int) $positiveTransactions->sum(fn ($line) => max(0, (int) ($line->refunded_amount_cents ?? 0)));
        $remainingTotalCents = max(0, $totalPaidCents - $alreadyRefundedCents);

        $booking = $invoice->booking;
        if (! $booking || ! $booking->start_date || ! $booking->end_date || $totalPaidCents <= 0) {
            return $remainingTotalCents;
        }

        $startDate = Carbon::parse($booking->start_date)->startOfDay();
        $endDate = Carbon::parse($booking->end_date)->startOfDay();
        $today = now()->startOfDay();

        $billingPolicy = strtolower((string) ($booking->room->billing_policy ?? $booking->billing_policy ?? 'monthly'));
        $proratedCents = 0;

        if ($billingPolicy === 'daily') {
            $totalDays = max(1, $startDate->diffInDays($endDate) + 1);
            $elapsedDays = $today->lt($startDate) ? 0 : ($today->gt($endDate) ? $totalDays : $startDate->diffInDays($today) + 1);
            $unusedDays = max(0, $totalDays - $elapsedDays);
            $proratedCents = (int) floor(($totalPaidCents * $unusedDays) / $totalDays);
        } else {
            $totalMonths = max(1, (int) ($booking->total_months ?: ceil(($startDate->diffInDays($endDate) + 1) / 30)));
            $elapsedDays = $today->lt($startDate) ? 0 : ($today->gt($endDate) ? $totalMonths * 30 : $startDate->diffInDays($today));
            $usedMonths = min($totalMonths, max(0, (int) floor($elapsedDays / 30)));
            $unusedMonths = max(0, $totalMonths - $usedMonths);
            $proratedCents = (int) floor(($totalPaidCents * $unusedMonths) / $totalMonths);
        }

        $fixedPenaltyCents = max(0, (int) config('refunds.fixed_penalty_cents', 0));

        return max(0, min($remainingTotalCents, $proratedCents - $fixedPenaltyCents - $alreadyRefundedCents));
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
