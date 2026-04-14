<?php

namespace App\Services;

use Carbon\Carbon;

class BillingCycleCalculator
{
    /**
     * Calculate next billing date based on anniversary day.
     * 
     * If move-in is Feb 14, next billing is Mar 14 (regardless of days in month).
     * Handles month-end edge cases (e.g., Jan 31 → Feb 28).
     * 
     * @param Carbon $currentDate Current billing date
     * @param int $billingDay Day of month to bill (1-31)
     * @return Carbon Next billing date
     */
    public static function calculateNextBillingDate(Carbon $currentDate, int $billingDay): Carbon
    {
        // Use addMonthNoOverflow to safely move to next month without day overflow
        $next = $currentDate->copy()->addMonthNoOverflow();
        
        // Then adjust to the billing day, handling month-end edge cases
        $maxDayInMonth = $next->daysInMonth;
        $targetDay = min($billingDay, $maxDayInMonth);
        
        return $next->day($targetDay)->startOfDay();
    }
    
    /**
     * Calculate billing period end date (day before next billing date).
     * 
     * Example: If billing is on the 14th, period ends on the 13th.
     * 
     * @param Carbon $periodStart Start of billing period
     * @param int $billingDay Day of month to bill (1-31)
     * @return Carbon Period end date
     */
    public static function calculatePeriodEnd(Carbon $periodStart, int $billingDay): Carbon
    {
        return self::calculateNextBillingDate($periodStart, $billingDay)->subDay();
    }
}
