<?php

namespace App\Console\Commands;

use App\Models\BillingReminderLog;
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
    protected $description = 'Send due and overdue billing reminders to monthly tenants';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $today = Carbon::today();

        $invoices = Invoice::query()
            ->whereIn('status', ['pending', 'overdue'])
            ->whereNotNull('tenant_id')
            ->whereNotNull('due_date')
            ->where(function ($query) use ($today) {
                $query->whereDate('due_date', $today->copy()->addDays(3)->toDateString())
                    ->orWhereDate('due_date', $today->copy()->addDay()->toDateString())
                    ->orWhereDate('due_date', '<', $today->toDateString());
            })
            ->whereHas('booking', function ($query) {
                $query->where('payment_plan', 'monthly')
                    ->whereIn('status', ['confirmed', 'active', 'partial-completed']);
            })
            ->with(['tenant', 'booking'])
            ->get();

        $count = 0;
        foreach ($invoices as $invoice) {
            if (! $invoice->tenant) {
                continue;
            }

            $dueDate = Carbon::parse($invoice->due_date)->startOfDay();
            $daysUntilDue = $today->diffInDays($dueDate, false);

            $candidateReminders = [];
            if ($daysUntilDue === 3) {
                $candidateReminders[] = ['type' => 'due_3_days', 'target_date' => $dueDate->toDateString()];
            }

            if ($daysUntilDue === 1) {
                $candidateReminders[] = ['type' => 'due_1_day', 'target_date' => $dueDate->toDateString()];
            }

            if ($today->greaterThan($dueDate)) {
                $daysOverdue = $dueDate->diffInDays($today);
                if ($daysOverdue === 1 || $daysOverdue % 3 === 0) {
                    $candidateReminders[] = ['type' => 'overdue_followup', 'target_date' => $today->toDateString()];
                }
            }

            foreach ($candidateReminders as $candidateReminder) {
                $log = BillingReminderLog::firstOrCreate(
                    [
                        'invoice_id' => $invoice->id,
                        'reminder_type' => $candidateReminder['type'],
                        'target_date' => $candidateReminder['target_date'],
                    ],
                    [
                        'booking_id' => $invoice->booking_id,
                        'tenant_id' => $invoice->tenant_id,
                        'sent_at' => now(),
                    ]
                );

                if (! $log->wasRecentlyCreated) {
                    continue;
                }

                try {
                    $invoice->tenant->notify(new UpcomingPaymentNotification($invoice, $candidateReminder['type']));
                    $count++;
                } catch (\Throwable $e) {
                    $log->delete();
                }
            }
        }

        $this->info("Sent {$count} billing reminder notifications.");
    }
}
