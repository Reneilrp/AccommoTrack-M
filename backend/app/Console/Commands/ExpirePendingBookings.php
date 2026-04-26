<?php

namespace App\Console\Commands;

use App\Models\Booking;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ExpirePendingBookings extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bookings:expire-pending';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Find and cancel pending bookings that are older than a defined threshold (e.g., 2 days).';

    /**
     * Execute the console command.
     */
    public function handle(\App\Services\BookingService $bookingService)
    {
        $forcedNow = \App\Support\SystemToggle::getString('system_forced_now');
        if ($forcedNow && $forcedNow !== '') {
            try {
                \Carbon\Carbon::setTestNow(\Carbon\Carbon::parse($forcedNow));
            } catch (\Exception $e) {
                // Ignore parsing errors
            }
        }

        $expirationHours = 24;
        $expiryThreshold = \Carbon\Carbon::now()->subHours($expirationHours);
        
        $this->info("Searching for stale bookings older than {$expirationHours} hours...");
        Log::info('Running ExpirePendingBookings command...');

        // 1. Find pure 'pending' bookings (never reached payment step)
        $expiredPending = Booking::where('status', 'pending')
            ->where('created_at', '<=', $expiryThreshold)
            ->get();

        // 2. Find 'pending_reservation' that timed out without a transaction
        $expiredUnpaid = Booking::where('status', 'pending_reservation')
            ->where('created_at', '<=', $expiryThreshold)
            ->whereDoesntHave('invoices.transactions')
            ->get();

        $allStale = $expiredPending->merge($expiredUnpaid);

        if ($allStale->isEmpty()) {
            $this->info('No stale bookings found.');
            Log::info('No stale bookings found.');
            return;
        }

        $count = $allStale->count();
        $this->info("Found {$count} stale bookings. Proceeding with service-level cancellation...");

        foreach ($allStale as $booking) {
            try {
                $bookingService->updateStatus($booking, [
                    'status' => 'cancelled',
                    'cancellation_reason' => "Booking request automatically expired after {$expirationHours} hours of inactivity."
                ]);
                Log::info("Booking #{$booking->id} was automatically expired and cleaned up.");
            } catch (\Exception $e) {
                Log::error("Failed to expire booking #{$booking->id}: " . $e->getMessage());
            }
        }

        $this->info("Successfully processed {$count} bookings.");
        Log::info("Successfully processed {$count} bookings.");
    }
}
