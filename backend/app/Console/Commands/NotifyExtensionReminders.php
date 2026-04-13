<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\ExtensionRequest;
use App\Models\Notification as UserNotification;
use App\Notifications\ExtensionReminderNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class NotifyExtensionReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bookings:notify-extension-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send one-day-before-end reminders so tenants can extend their stay in time.';

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
                // Ignore parse errors
            }
        }

        $lock = Cache::lock('bookings:notify-extension-reminders', 600);
        if (! $lock->get()) {
            $message = 'Extension reminder command is already running. Skipping duplicate execution.';
            $this->warn($message);
            Log::warning($message);

            return Command::SUCCESS;
        }

        $sentCount = 0;
        $skippedCount = 0;
        $failedCount = 0;

        try {
            $today = Carbon::today();
            $targetDate = $today->copy()->addDay()->toDateString();

            $bookings = Booking::query()
                ->with(['tenant', 'property', 'room'])
                ->whereIn('status', ['confirmed', 'active'])
                ->whereNotNull('tenant_id')
                ->whereNotNull('end_date')
                ->whereDate('end_date', $targetDate)
                ->get();

            foreach ($bookings as $booking) {
                try {
                    if (! $booking->tenant) {
                        $skippedCount++;
                        continue;
                    }

                    $hasPendingOrApprovedExtension = ExtensionRequest::query()
                        ->where('booking_id', $booking->id)
                        ->whereIn('status', ['pending', 'approved'])
                        ->exists();

                    if ($hasPendingOrApprovedExtension) {
                        $skippedCount++;
                        continue;
                    }

                    $alreadySentToday = UserNotification::query()
                        ->where('user_id', $booking->tenant_id)
                        ->where('type', 'extension_reminder')
                        ->whereDate('created_at', $today->toDateString())
                        ->where('data->booking_id', $booking->id)
                        ->where('data->target_end_date', $targetDate)
                        ->exists();

                    if ($alreadySentToday) {
                        $skippedCount++;
                        continue;
                    }

                    $booking->tenant->notify(new ExtensionReminderNotification($booking, 1));
                    $sentCount++;
                } catch (\Throwable $bookingError) {
                    $failedCount++;
                    Log::error('Failed to send extension reminder notification', [
                        'booking_id' => $booking->id,
                        'tenant_id' => $booking->tenant_id,
                        'error' => $bookingError->getMessage(),
                    ]);
                }
            }

            $summary = "Extension reminders: sent {$sentCount}, skipped {$skippedCount}, failed {$failedCount}.";
            $this->info($summary);
            Log::info($summary);

            return Command::SUCCESS;
        } finally {
            optional($lock)->release();
        }
    }
}
