<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GenerateMonthlyInvoices extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'invoices:generate-monthly';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate any missing monthly invoices for active bookings.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        Log::info('Starting monthly invoice generation task...');
        $this->info('Starting monthly invoice generation task...');

        $bookings = Booking::whereIn('status', ['confirmed', 'active'])
            ->where('payment_plan', 'monthly')
            ->get();
        $generatedCount = 0;
        $now = Carbon::now();

        foreach ($bookings as $booking) {
            $startDate = Carbon::parse($booking->start_date);
            // Don't process bookings that haven't started yet
            if ($startDate->isFuture()) {
                continue;
            }

            // Calculate total months passed since booking started.
            $monthsSinceStart = $startDate->diffInMonths($now) + 1;

            // Loop through each month from the start date to the current month, but not exceeding total_months
            $maxMonths = (int) ($booking->total_months || 1);
            for ($i = 0; $i < min($monthsSinceStart, $maxMonths); $i++) {
                $billingDateForLoop = $startDate->copy()->addMonths($i);
                $billingPeriodStart = $billingDateForLoop->copy()->startOfMonth();

                $recurringAddonAmount = $booking->addons()
                    ->where('booking_addons.status', 'active')
                    ->where('price_type', 'monthly')
                    ->where(function ($query) use ($billingPeriodStart) {
                        $query->whereNull('booking_addons.cancellation_effective_at')
                            ->orWhere('booking_addons.cancellation_effective_at', '>', $billingPeriodStart);
                    })
                    ->sum(DB::raw('booking_addons.price_at_booking * booking_addons.quantity'));

                $baseInvoiceAmount = $booking->monthly_rent + $recurringAddonAmount;

                if ($baseInvoiceAmount <= 0) {
                    continue; // Skip bookings with no monthly charge
                }

                // Check if an invoice for this specific billing month already exists
                // OR if this is the first recurring month and an advance was already paid
                $invoiceExists = $booking->invoices()
                    ->whereYear('due_date', $billingDateForLoop->year)
                    ->whereMonth('due_date', $billingDateForLoop->month)
                    ->exists();

                // Logic: If i == 1 (second month), check if the FIRST invoice (i=0) included an advance.
                // In AccommoTrack, the advance covers the LAST month or the NEXT month depending on landlord policy.
                // Usually, 1 month advance means you've paid for the next month already.
                if ($i === 1 && ! $invoiceExists) {
                    $firstInvoice = $booking->invoices()->orderBy('created_at', 'asc')->first();
                    if ($firstInvoice && str_contains(strtolower($firstInvoice->description), 'advance')) {
                        Log::info("Skipping second month invoice for booking #{$booking->id} as advance was detected in initial invoice.");
                        continue; 
                    }
                }

                if (! $invoiceExists) {
                    // Create the missing invoice for this billing period
                    $reference = 'INV-'.$billingDateForLoop->format('Ym').'-'.strtoupper(Str::random(6));
                    Invoice::create([
                        'reference' => $reference,
                        'landlord_id' => $booking->landlord_id,
                        'property_id' => $booking->property_id,
                        'booking_id' => $booking->id,
                        'tenant_id' => $booking->tenant_id,
                        'description' => 'Monthly Rent and Services for '.$billingDateForLoop->format('F Y'),
                        'amount_cents' => (int) round($baseInvoiceAmount * 100),
                        'currency' => 'PHP',
                        'status' => 'pending',
                        'issued_at' => $now,
                        'due_date' => $billingDateForLoop,
                        'metadata' => [
                            'generated_by' => 'system',
                            'billing_period' => $billingDateForLoop->format('Y-m'),
                        ],
                    ]);
                    $generatedCount++;
                    Log::info("Generated invoice for booking #{$booking->id} for period {$billingDateForLoop->format('Y-m')}");
                }
            }
        }

        $this->info("Completed invoice generation. Generated {$generatedCount} new invoices.");
        Log::info("Completed invoice generation. Generated {$generatedCount} new invoices.");
    }
}
