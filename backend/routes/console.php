<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('payments:notify-upcoming')->daily();
Schedule::command('bookings:expire-pending')->daily();
Schedule::command('bookings:finalize-daily-checkouts')->daily();
Schedule::command('invoices:update-overdue')->daily();
Schedule::command('invoices:generate-monthly')->daily();
Schedule::command('properties:cleanup-archived')->daily();
