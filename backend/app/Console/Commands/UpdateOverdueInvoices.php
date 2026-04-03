<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Services\AuditLogService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class UpdateOverdueInvoices extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'invoices:update-overdue';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Mark pending or partial invoices as overdue if they are past their due date.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        Log::info('Starting overdue invoice update task...');

        $auditLogService = app(AuditLogService::class);
        $today = Carbon::now()->startOfDay();

        $updatedCount = 0;

        Invoice::query()
            ->whereIn('status', ['pending', 'partial'])
            ->where('due_date', '<', $today)
            ->chunkById(200, function ($invoices) use (&$updatedCount, $auditLogService) {
                foreach ($invoices as $invoice) {
                    $statusBefore = $invoice->status;
                    $invoice->status = 'overdue';
                    $invoice->save();

                    $updatedCount++;

                    $auditLogService->invoiceEvent('invoice.overdue', [
                        'severity' => 'warning',
                        'subject_type' => 'invoice',
                        'subject_id' => $invoice->id,
                        'booking_id' => $invoice->booking_id,
                        'invoice_id' => $invoice->id,
                        'property_id' => $invoice->property_id,
                        'tenant_id' => $invoice->tenant_id,
                        'landlord_id' => $invoice->landlord_id,
                        'status_before' => $statusBefore,
                        'status_after' => $invoice->status,
                        'summary' => 'Invoice marked overdue by scheduled command.',
                    ]);
                }
            });

        if ($updatedCount > 0) {
            Log::info("Updated {$updatedCount} invoices to overdue status.");
            $this->info("Updated {$updatedCount} invoices to overdue status.");
        } else {
            $this->info("No overdue invoices found.");
        }
    }
}
