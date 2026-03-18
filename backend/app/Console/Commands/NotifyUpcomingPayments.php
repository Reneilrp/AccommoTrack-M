<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Notifications\UpcomingPaymentNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;

class NotifyUpcomingPayments extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'payments:notify-upcoming';

    /**
     * The console command description.
     */
    protected $description = 'Notify tenants of payments due within 10 days';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $tenDaysFromNow = Carbon::now()->addDays(10)->format('Y-m-d');
        $today = Carbon::now()->format('Y-m-d');

        $invoices = Invoice::where('status', 'pending')
            ->whereBetween('due_date', [$today, $tenDaysFromNow])
            ->with('tenant')
            ->get();

        $count = 0;
        foreach ($invoices as $invoice) {
            $metadata = $invoice->metadata ?? [];
            if (! isset($metadata['upcoming_notified_at']) && $invoice->tenant) {
                $invoice->tenant->notify(new UpcomingPaymentNotification($invoice));

                $metadata['upcoming_notified_at'] = Carbon::now()->toISOString();
                $invoice->metadata = $metadata;
                $invoice->save();

                $count++;
            }
        }

        $this->info("Sent {$count} upcoming payment notifications.");
    }
}
