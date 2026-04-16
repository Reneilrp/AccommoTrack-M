<?php

namespace App\Console\Commands;

use App\Models\Booking;
use Carbon\Carbon;
use Illuminate\Console\Command;

class BackfillBillingDay extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bookings:backfill-billing-day';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfill billing_day for existing bookings based on their start_date';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting billing_day backfill for existing bookings...');

        $updated = 0;

        Booking::whereNull('billing_day')
            ->whereNotNull('start_date')
            ->chunk(100, function ($bookings) use (&$updated) {
                foreach ($bookings as $booking) {
                    $startDate = Carbon::parse($booking->start_date);
                    $booking->billing_day = $startDate->day;
                    $booking->save();
                    $updated++;

                    if ($updated % 50 === 0) {
                        $this->info("Processed {$updated} bookings...");
                    }
                }
            });

        $this->info("✓ Backfilled billing_day for {$updated} bookings.");

        return Command::SUCCESS;
    }
}
