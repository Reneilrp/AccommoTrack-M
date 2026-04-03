<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Services\BookingService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class FinalizeDailyCheckouts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bookings:finalize-daily-checkouts';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Finalize checkout for daily stays whose checkout date has already passed.';

    /**
     * Execute the console command.
     */
    public function handle(BookingService $bookingService): int
    {
        $today = Carbon::today();

        $candidates = Booking::query()
            ->with(['room', 'tenant.tenantProfile'])
            ->whereIn('status', ['confirmed', 'active'])
            ->where('contract_mode', 'daily')
            ->whereNotNull('end_date')
            ->whereDate('end_date', '<', $today)
            ->orderBy('id')
            ->get();

        if ($candidates->isEmpty()) {
            $this->info('No overdue daily checkouts to finalize.');
            return self::SUCCESS;
        }

        $finalized = 0;
        $failed = 0;

        foreach ($candidates as $booking) {
            try {
                $bookingService->finalizeCheckout(
                    $booking,
                    optional($booking->end_date)->format('Y-m-d'),
                    'Auto-finalized after daily checkout date passed.'
                );
                $finalized++;
            } catch (\Exception $e) {
                $failed++;
                Log::warning('Failed to auto-finalize daily checkout', [
                    'booking_id' => $booking->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("Daily checkout finalization finished. Finalized: {$finalized}, Failed: {$failed}");

        return self::SUCCESS;
    }
}
