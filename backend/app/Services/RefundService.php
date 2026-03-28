<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Invoice;
use Carbon\Carbon;

class RefundService
{
    /**
     * Calculate prorated credit for unused days in current booking
     */
    public function calculateProratedCredit(Booking $booking, ?float $damageCharge = 0): array
    {
        $today = Carbon::today();
        $startDate = Carbon::parse($booking->start_date)->startOfDay();
        
        // Find next billing date
        $nextBillingDate = $startDate->copy();
        while ($nextBillingDate->lte($today)) {
            $nextBillingDate->addMonthNoOverflow()->startOfDay();
        }

        // Carbon 3 diffInDays can return signed fractional values. Use whole calendar days only.
        $remainingDays = max(0, (int) $today->diffInDays($nextBillingDate, false));

        $monthlyRentCents = (int) round(((float) ($booking->monthly_rent ?? 0)) * 100);
        $dailyRateCents = $monthlyRentCents / 30;
        $unusedValueCents = (int) round(($monthlyRentCents * $remainingDays) / 30);
        
        // Calculate paid amount for current period
        $paidAmountCents = $this->calculatePaidAmountForCurrentPeriod($booking, $today, $nextBillingDate);

        // Refundable amount is the lesser of unused value or paid amount
        $refundableAmountCents = max(0, min($unusedValueCents, $paidAmountCents));
        
        // Apply fixed penalty from config
        $penaltyCents = (int) config('refunds.fixed_penalty_cents', 0);
        $damageChargeCents = (int) round(max(0, (float) $damageCharge) * 100);

        // Deduct damage charge and penalty
        $finalCreditCents = max(0, $refundableAmountCents - $damageChargeCents - $penaltyCents);
        
        return [
            'remaining_days' => $remainingDays,
            'daily_rate' => round($dailyRateCents / 100, 2),
            'unused_value' => round($unusedValueCents / 100, 2),
            'paid_amount' => round($paidAmountCents / 100, 2),
            'refundable_amount' => round($refundableAmountCents / 100, 2),
            'damage_charge' => round($damageChargeCents / 100, 2),
            'penalty' => round($penaltyCents / 100, 2),
            'final_credit' => round($finalCreditCents / 100, 2),
            'daily_rate_cents' => (int) round($dailyRateCents),
            'unused_value_cents' => $unusedValueCents,
            'paid_amount_cents' => $paidAmountCents,
            'refundable_amount_cents' => $refundableAmountCents,
            'damage_charge_cents' => $damageChargeCents,
            'penalty_cents' => $penaltyCents,
            'final_credit_cents' => $finalCreditCents,
            'next_billing_date' => $nextBillingDate->format('Y-m-d'),
        ];
    }
    
    /**
     * Calculate how much tenant paid for the current billing period
     */
    private function calculatePaidAmountForCurrentPeriod(Booking $booking, Carbon $today, Carbon $nextBillingDate): int
    {
        $previousBillingDate = $nextBillingDate->copy()->subMonth();
        
        // Get paid invoices for this period
        $paidInvoices = Invoice::where('booking_id', $booking->id)
            ->where('status', 'paid')
            ->where('due_date', '>=', $previousBillingDate)
            ->where('due_date', '<', $nextBillingDate)
            ->sum('amount_cents');

        return (int) $paidInvoices;
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
