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

        $staleQuery = Booking::query()
            ->where('created_at', '<=', $expiryThreshold)
            ->where(function ($query) {
                $query->where('status', 'pending')
                    ->orWhere(function ($nested) {
                        $nested->where('status', 'pending_reservation')
                            ->whereDoesntHave('invoices.transactions');
                    });
            });

        $totalStale = (clone $staleQuery)->count();

        if ($totalStale === 0) {
            $this->info('No stale bookings found.');
            Log::info('No stale bookings found.');
            return;
        }

        $this->info("Found {$totalStale} stale bookings. Proceeding with service-level cancellation...");

        $processed = 0;
        $staleQuery->chunkById(200, function ($bookings) use ($bookingService, $expirationHours, &$processed) {
            foreach ($bookings as $booking) {
                try {
                    $bookingService->updateStatus($booking, [
                        'status' => 'cancelled',
                        'cancellation_reason' => "Booking request automatically expired after {$expirationHours} hours of inactivity."
                    ]);
                    $processed++;
                    Log::info("Booking #{$booking->id} was automatically expired and cleaned up.");
                } catch (\Exception $e) {
                    Log::error("Failed to expire booking #{$booking->id}: " . $e->getMessage());
                }
            }
        });

        $this->info("Successfully processed {$processed} bookings.");
        Log::info("Successfully processed {$processed} bookings.");
    }
}
