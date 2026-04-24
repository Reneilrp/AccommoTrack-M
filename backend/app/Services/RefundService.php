<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Models\TenantCredit;
use Carbon\Carbon;

class RefundService
{
    private function toCents(?float $amount): int
    {
        return (int) round(($amount ?? 0) * 100);
    }

    private function fromCents($amountCents): float
    {
        return (float) ($amountCents / 100);
    }

    /**
     * Calculate prorated credit for unused days in current booking
     */
    public function calculateProratedCredit(Booking $booking, ?float $damageCharge = 0, ?float $transferFee = 0): array
    {
        $today = Carbon::today();
        $startDate = Carbon::parse($booking->start_date)->startOfDay();
        $billingDay = $booking->billing_day ?? $startDate->day;

        // Find next billing date using anniversary-based calculation
        $nextBillingDate = $startDate->copy();
        while ($nextBillingDate->lte($today)) {
            $nextBillingDate = BillingCycleCalculator::calculateNextBillingDate($nextBillingDate, $billingDay);
        }

        $periodStartDate = $nextBillingDate->copy()->subMonth();
        // Handle month-end edge cases
        $maxDayInMonth = $periodStartDate->daysInMonth;
        $periodStartDate->day(min($billingDay, $maxDayInMonth))->startOfDay();

        $daysInCycle = max(1, (int) $periodStartDate->diffInDays($nextBillingDate));

        // Carbon 3 diffInDays can return signed fractional values. Use whole calendar days only.
        $remainingDays = max(0, (int) $today->diffInDays($nextBillingDate, false));

        // Keep all computations in centavos to prevent floating-point cent leakage.
        $monthlyRentCents = $this->toCents((float) $booking->resolveEffectiveMonthlyRent());
        $dailyRateCents = (int) round($monthlyRentCents / $daysInCycle);
        $unusedValueCents = (int) round(($monthlyRentCents * $remainingDays) / $daysInCycle);

        // Calculate paid amount for current period
        $paidAmountCents = $this->calculatePaidAmountForCurrentPeriod($booking, $periodStartDate, $nextBillingDate);

        // Refundable amount is the lesser of unused value or paid amount
        $refundableAmountCents = max(0, min($unusedValueCents, $paidAmountCents));

        // Apply fixed penalty from config
        $penaltyCents = (int) config('refunds.fixed_penalty_cents', 0);
        $damageChargeCents = $this->toCents($damageCharge);
        $transferFeeCents = $this->toCents($transferFee);

        // Deduct only the generic cancellation penalty from the credit.
        // Damage and Transfer Fees are issued as standalone invoices during transfer,
        // , so we DO NOT deduct them from the credit here, preventing double-charging.
        $finalCreditCents = max(0, $refundableAmountCents - $penaltyCents);

        return [
            'period_start_date' => $periodStartDate->format('Y-m-d'),
            'remaining_days' => $remainingDays,
            'days_in_cycle' => $daysInCycle,
            'daily_rate' => $this->fromCents($dailyRateCents),
            'unused_value' => $this->fromCents($unusedValueCents),
            'paid_amount' => $this->fromCents($paidAmountCents),
            'refundable_amount' => $this->fromCents($refundableAmountCents),
            'damage_charge' => $this->fromCents($damageChargeCents),
            'transfer_fee' => $this->fromCents($transferFeeCents),
            'penalty' => $this->fromCents($penaltyCents),
            'final_credit' => $this->fromCents($finalCreditCents),
            'daily_rate_cents' => $dailyRateCents,
            'unused_value_cents' => $unusedValueCents,
            'paid_amount_cents' => $paidAmountCents,
            'refundable_amount_cents' => $refundableAmountCents,
            'damage_charge_cents' => $damageChargeCents,
            'transfer_fee_cents' => $transferFeeCents,
            'penalty_cents' => $penaltyCents,
            'final_credit_cents' => $finalCreditCents,
            'next_billing_date' => $nextBillingDate->format('Y-m-d'),
        ];
    }

    /**
     * Calculate how much tenant paid for the current billing period
     */
    private function calculatePaidAmountForCurrentPeriod(Booking $booking, Carbon $periodStartDate, Carbon $nextBillingDate): int
    {
        // Use only rent invoices for this period to avoid counting standalone add-on invoices.
        $periodRentInvoiceIds = Invoice::where('booking_id', $booking->id)
            ->where('invoice_type', 'rent')
            ->whereDate('due_date', '>=', $periodStartDate->toDateString())
            ->whereDate('due_date', '<', $nextBillingDate->toDateString())
            ->pluck('id');

        if ($periodRentInvoiceIds->isEmpty()) {
            return 0;
        }

        $netPaidCents = PaymentTransaction::whereIn('invoice_id', $periodRentInvoiceIds)
            ->where('amount_cents', '>', 0)
            ->whereIn('status', ['succeeded', 'paid', 'partially_refunded', 'refunded'])
            ->selectRaw('COALESCE(SUM(amount_cents - refunded_amount_cents), 0) as net_cents')
            ->value('net_cents');

        return max(0, (int) ($netPaidCents ?? 0));
    }

    /**
     * Apply credit to new booking's first invoice
     */
    public function applyCreditToInvoice(Invoice $invoice, float $creditAmount, array $metadata = [], string $refundPreference = 'wallet'): void
    {
        $creditCents = max(0, (int) round($creditAmount * 100));
        $appliedCreditCents = min((int) $invoice->amount_cents, $creditCents);
        $excessCreditCents = max(0, $creditCents - $appliedCreditCents);

        if ($appliedCreditCents > 0) {
            \App\Models\PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $invoice->tenant_id,
                'amount_cents' => $appliedCreditCents,
                'currency' => $invoice->currency ?? 'PHP',
                'status' => 'succeeded',
                'method' => 'wallet',
            ]);
        }

        $totalPaidCents = \App\Models\PaymentTransaction::where('invoice_id', $invoice->id)
            ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
            ->sum('amount_cents');

        $totalRefundedCents = \App\Models\PaymentTransaction::where('invoice_id', $invoice->id)
            ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
            ->sum('refunded_amount_cents');

        $netPaidCents = $totalPaidCents - $totalRefundedCents;
        $balanceCents = max(0, (int) $invoice->amount_cents - $netPaidCents);

        $description = $invoice->description.' (Credit of ₱'.number_format($appliedCreditCents / 100, 2).' applied from previous room)';

        $updateData = [
            'description' => $description,
        ];

        if ($balanceCents == 0) {
            $updateData['status'] = 'paid';
            $updateData['paid_at'] = now();
        } elseif ($netPaidCents > 0) {
            $updateData['status'] = 'partial';
        }

        // Store credit metadata
        $existingMetadata = $invoice->metadata ?? [];
        $updateData['metadata'] = array_merge($existingMetadata, [
            'credit_applied' => round($appliedCreditCents / 100, 2),
            'credit_excess_to_wallet' => $refundPreference === 'wallet' ? round($excessCreditCents / 100, 2) : 0,
            'credit_excess_to_cash' => $refundPreference === 'cash' ? round($excessCreditCents / 100, 2) : 0,
            'credit_applied_at' => now()->toISOString(),
            'original_amount' => $invoice->amount_cents / 100,
        ], $metadata);

        $invoice->update($updateData);

        // If transfer credit exceeds invoice amount, handle based on preference.
        if ($excessCreditCents > 0 && $invoice->tenant_id) {
            if ($refundPreference === 'cash') {
                // Log cash refund owed
                \App\Models\PaymentTransaction::create([
                    'tenant_id' => $invoice->tenant_id,
                    'landlord_id' => $invoice->landlord_id,
                    'invoice_id' => $invoice->id,
                    'amount_cents' => $excessCreditCents,
                    'currency' => 'PHP',
                    'payment_method' => 'cash',
                    'gateway' => 'manual',
                    'description' => 'Cash Refund Owed to Tenant from Transfer',
                    'status' => 'pending_refund',
                    'metadata' => [
                        'refund_type' => 'cash',
                        'transfer_from_invoice' => $invoice->id,
                    ],
                ]);
            } else {
                // Default to wallet credits
                TenantCredit::create([
                    'tenant_id' => $invoice->tenant_id,
                    'property_id' => $invoice->property_id,
                    'room_id' => $invoice->booking?->room_id,
                    'invoice_id' => $invoice->id,
                    'amount_cents' => $excessCreditCents,
                    'type' => 'credit',
                    'description' => 'Excess transfer credit from invoice #'.$invoice->id,
                ]);
            }
        }
    }

    /**
     * Record refund information in booking
     */
    public function recordRefundInBooking(Booking $booking, float $refundAmount): void
    {
        $booking->update([
            'refund_amount' => $refundAmount,
            'refund_processed_at' => now(),
            'payment_status' => 'refunded',
        ]);

        // Clear related caches
        $landlordId = $booking->landlord_id;
        $tenantId = $booking->tenant_id;
        \Illuminate\Support\Facades\Cache::forget("landlord_analytics_{$landlordId}_all_month");
        \Illuminate\Support\Facades\Cache::forget("landlord_analytics_{$landlordId}_all_week");
        \Illuminate\Support\Facades\Cache::forget("landlord_analytics_{$landlordId}_all_year");
        if ($booking->property_id) {
            \Illuminate\Support\Facades\Cache::forget("landlord_analytics_{$landlordId}_{$booking->property_id}_month");
            \Illuminate\Support\Facades\Cache::forget("landlord_analytics_{$landlordId}_{$booking->property_id}_week");
            \Illuminate\Support\Facades\Cache::forget("landlord_analytics_{$landlordId}_{$booking->property_id}_year");
        }
        \Illuminate\Support\Facades\Cache::forget("tenant_dashboard_{$tenantId}");
        \Illuminate\Support\Facades\Cache::forget("tenant_stats_{$tenantId}");
        \Illuminate\Support\Facades\Cache::forget("tenant_stay_details_{$tenantId}");
        \Illuminate\Support\Facades\Cache::forget("tenant_payment_breakdown_{$tenantId}");

        $refundCents = max(0, (int) round($refundAmount * 100));
        if ($refundCents === 0) return;

        // Find the most recent paid or transferred rent invoice for this booking
        $latestInvoice = \App\Models\Invoice::where('booking_id', $booking->id)
            ->where('invoice_type', 'rent')
            ->whereIn('status', ['paid', 'transferred'])
            ->orderBy('id', 'desc')
            ->first();

        if ($latestInvoice) {
            \App\Models\PaymentTransaction::create([
                'invoice_id' => $latestInvoice->id,
                'tenant_id' => $latestInvoice->tenant_id,
                'amount_cents' => -1 * $refundCents,
                'currency' => $latestInvoice->currency ?? 'PHP',
                'status' => 'refunded',
                'method' => 'wallet',
            ]);

            // Allocate refund to positive transactions to correct dashboard analytics
            $positiveTxs = \App\Models\PaymentTransaction::where('invoice_id', $latestInvoice->id)
                ->where('amount_cents', '>', 0)
                ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
                ->orderBy('id', 'asc')
                ->get();

            $remainingRefund = $refundCents;
            foreach ($positiveTxs as $tx) {
                if ($remainingRefund <= 0) break;
                
                $refundable = max(0, (int) $tx->amount_cents - (int) ($tx->refunded_amount_cents ?? 0));
                if ($refundable <= 0) continue;

                $allocation = min($remainingRefund, $refundable);
                $tx->refunded_amount_cents = (int) ($tx->refunded_amount_cents ?? 0) + $allocation;

                if ($tx->refunded_amount_cents >= $tx->amount_cents) {
                    $tx->status = 'refunded';
                } elseif ($tx->refunded_amount_cents > 0) {
                    $tx->status = 'partially_refunded';
                }
                $tx->save();

                $remainingRefund -= $allocation;
            }

            $newAmount = max(0, $latestInvoice->amount_cents - $refundCents);
            $latestInvoice->update([
                'amount_cents' => $newAmount,
                'total_cents' => $newAmount,
                'subtotal_cents' => $newAmount,
                'status' => $newAmount <= 0 ? 'refunded' : $latestInvoice->status,
            ]);
        }
    }
}
