<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Booking;
use App\Models\Invoice;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
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

        $bookings = Booking::whereIn('status', ['confirmed', 'active'])->get();
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

            // Calculate recurring addon costs once.
            $recurringAddonAmount = $booking->addons()
                ->where('booking_addons.status', 'active')
                ->where('price_type', 'monthly')
                ->sum(DB::raw('booking_addons.price_at_booking * booking_addons.quantity'));

            $baseInvoiceAmount = $booking->monthly_rent + $recurringAddonAmount;

            if ($baseInvoiceAmount <= 0) {
                continue; // Skip bookings with no monthly charge
            }

            // Loop through each month from the start date to the current month
            for ($i = 0; $i < $monthsSinceStart; $i++) {
                $billingDateForLoop = $startDate->copy()->addMonths($i);

                // Check if an invoice for this specific billing month already exists
                $invoiceExists = $booking->invoices()
                    ->whereYear('due_date', $billingDateForLoop->year)
                    ->whereMonth('due_date', $billingDateForLoop->month)
                    ->exists();

                if (!$invoiceExists) {
                    // Create the missing invoice for this billing period
                    $reference = 'INV-' . $billingDateForLoop->format('Ym') . '-' . strtoupper(Str::random(6));
                    Invoice::create([
                        'reference' => $reference,
                        'landlord_id' => $booking->landlord_id,
                        'property_id' => $booking->property_id,
                        'booking_id' => $booking->id,
                        'tenant_id' => $booking->tenant_id,
                        'description' => 'Monthly Rent and Services for ' . $billingDateForLoop->format('F Y'),
                        'amount_cents' => (int) round($baseInvoiceAmount * 100),
                        'currency' => 'PHP',
                        'status' => 'pending',
                        'issued_at' => $now,
                        'due_date' => $billingDateForLoop,
                        'metadata' => [
                            'generated_by' => 'system',
                            'billing_period' => $billingDateForLoop->format('Y-m'),
                        ]
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
