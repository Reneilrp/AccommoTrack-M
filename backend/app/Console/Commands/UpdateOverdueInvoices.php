<?php

namespace App\Console\Commands;

use App\Models\Invoice;
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
    protected $description = 'Mark pending invoices as overdue if they are past their due date.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        Log::info('Starting overdue invoice update task...');
        
        $today = Carbon::now()->startOfDay();

        $updatedCount = Invoice::where('status', 'pending')
            ->where('due_date', '<', $today)
            ->update(['status' => 'overdue']);

        if ($updatedCount > 0) {
            Log::info("Updated {$updatedCount} invoices to overdue status.");
            $this->info("Updated {$updatedCount} invoices to overdue status.");
        } else {
            $this->info("No overdue invoices found.");
        }
    }
}
