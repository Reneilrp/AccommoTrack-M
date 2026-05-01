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
    public function handle()
    {
        $forcedNow = \App\Support\SystemToggle::getString('system_forced_now');
        if ($forcedNow && $forcedNow !== '') {
            try {
                Carbon::setTestNow(Carbon::parse($forcedNow));
            } catch (\Exception $e) {
                // Ignore parsing errors
            }
        }

        $expirationDays = 2;
        $this->info("Searching for pending bookings older than {$expirationDays} days...");
        Log::info('Running ExpirePendingBookings command...');

        $expiredBookings = Booking::where('status', 'pending')
            ->where('created_at', '<=', Carbon::now()->subDays($expirationDays))
            ->get();

        if ($expiredBookings->isEmpty()) {
            $this->info('No expired pending bookings found.');
            Log::info('No expired pending bookings found.');

            return;
        }

        $count = $expiredBookings->count();
        $this->info("Found {$count} expired pending bookings. Proceeding with cancellation...");

        $now = Carbon::now();
        Booking::whereIn('id', $expiredBookings->pluck('id'))->update([
            'status' => 'cancelled',
            'cancellation_reason' => 'Booking request expired after '.$expirationDays.' days.',
            'cancelled_at' => $now,
            'updated_at' => $now,
        ]);

        foreach ($expiredBookings as $booking) {
            // Optional: Re-calculate property availability if needed
            // $booking->room->property->updateAvailableRooms();

            Log::info("Booking #{$booking->id} has expired and was automatically cancelled.");
        }

        $this->info("Successfully cancelled {$count} expired bookings.");
        Log::info("Successfully cancelled {$count} expired bookings.");
    }
}
