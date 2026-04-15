<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Services\BillingCycleCalculator;
use Carbon\Carbon;

class RefundService
{
    private function toCents(?float $amount): int
    {
        return (int) round(max(0, (float) ($amount ?? 0)) * 100);
    }

    private function fromCents(int $amountCents): float
    {
        return round($amountCents / 100, 2);
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
        $monthlyRentCents = $this->toCents((float) ($booking->monthly_rent ?? 0));
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
        //, so we DO NOT deduct them from the credit here, preventing double-charging.
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
    public function applyCreditToInvoice(Invoice $invoice, float $creditAmount, array $metadata = []): void
    {
        $creditCents = (int) round($creditAmount * 100);
        $newAmountCents = max(0, $invoice->amount_cents - $creditCents);
        
        $description = $invoice->description . " (Credit of ₱" . number_format($creditAmount, 2) . " applied from previous room)";
        
        $updateData = [
            'amount_cents' => $newAmountCents,
            'description' => $description,
        ];
        
        // If fully credited, mark as paid
        if ($newAmountCents == 0) {
            $updateData['status'] = 'paid';
            $updateData['paid_at'] = now();
        }
        
        // Store credit metadata
        $existingMetadata = $invoice->metadata ?? [];
        $updateData['metadata'] = array_merge($existingMetadata, [
            'credit_applied' => $creditAmount,
            'credit_applied_at' => now()->toISOString(),
            'original_amount' => $invoice->amount_cents / 100,
        ], $metadata);
        
        $invoice->update($updateData);
    }
    
    /**
     * Record refund information in booking
     */
    public function recordRefundInBooking(Booking $booking, float $refundAmount): void
    {
        $booking->update([
            'refund_amount' => $refundAmount,
            'refund_processed_at' => now(),
        ]);
    }
}
