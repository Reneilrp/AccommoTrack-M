<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GenerateMonthlyInvoices extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'invoices:generate-monthly';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate recurring monthly invoices for active monthly bookings.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $lock = Cache::lock('invoices:generate-monthly', 600);
        if (! $lock->get()) {
            $message = 'Monthly invoice generation is already running. Skipping duplicate execution.';
            $this->warn($message);
            Log::warning($message);

            return Command::SUCCESS;
        }

        Log::info('Starting state-driven monthly invoice generation task...');
        $this->info('Starting state-driven monthly invoice generation task...');

        $generatedCount = 0;
        $skippedCount = 0;
        $failedCount = 0;
        $today = Carbon::today();

        try {
            $bookings = Booking::query()
                ->whereIn('status', ['confirmed', 'active'])
                ->where('payment_plan', 'monthly')
                ->where(function ($query) use ($today) {
                    $query->whereNull('next_billing_date')
                        ->orWhereDate('next_billing_date', '<=', $today->toDateString());
                })
                ->get();

            foreach ($bookings as $booking) {
                try {
                    $result = $this->processBooking($booking->id);

                    if ($result === 'generated') {
                        $generatedCount++;
                    } else {
                        $skippedCount++;
                    }
                } catch (\Throwable $e) {
                    $failedCount++;
                    Log::error('Monthly invoice generation failed for booking', [
                        'booking_id' => $booking->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $summary = "Completed monthly generation. Generated {$generatedCount}, skipped {$skippedCount}, failed {$failedCount}.";
            $this->info($summary);
            Log::info($summary);

            return Command::SUCCESS;
        } finally {
            optional($lock)->release();
        }
    }

    /**
     * Process one booking inside a transaction + row lock to avoid duplicate invoices.
     */
    protected function processBooking(int $bookingId): string
    {
        return DB::transaction(function () use ($bookingId) {
            $booking = Booking::with('room')
                ->whereKey($bookingId)
                ->lockForUpdate()
                ->first();

            if (! $booking || ! in_array($booking->status, ['confirmed', 'active'], true)) {
                return 'skipped';
            }

            $this->initializeBillingState($booking);

            if (! $booking->next_billing_date) {
                return 'skipped';
            }

            $billingDate = Carbon::parse($booking->next_billing_date)->startOfDay();
            if ($billingDate->isFuture()) {
                return 'skipped';
            }

            if ($booking->end_date && $billingDate->gt(Carbon::parse($booking->end_date))) {
                $booking->next_billing_date = null;
                $booking->save();

                return 'skipped';
            }

            $periodStart = $billingDate->copy();
            $periodEnd = $billingDate->copy()->addMonthNoOverflow()->subDay();
            $periodKey = $periodStart->format('Y-m-d');

            $invoiceExists = Invoice::query()
                ->where('booking_id', $booking->id)
                ->where('invoice_type', 'rent')
                ->where('billing_period_key', $periodKey)
                ->exists();

            if (! $invoiceExists) {
                $recurringAddonAmount = $booking->addons()
                    ->where('booking_addons.status', 'active')
                    ->where('price_type', 'monthly')
                    ->where(function ($query) use ($periodStart) {
                        $query->whereNull('booking_addons.cancellation_effective_at')
                            ->orWhere('booking_addons.cancellation_effective_at', '>', $periodStart);
                    })
                    ->sum(DB::raw("booking_addons.price_at_booking * booking_addons.quantity"));

                $baseInvoiceAmount = (float) $booking->monthly_rent + (float) $recurringAddonAmount;

                if ($baseInvoiceAmount > 0) {
                    $reference = 'INV-'.$periodStart->format('Ym').'-'.strtoupper(Str::random(6));

                    Invoice::create([
                        'reference' => $reference,
                        'landlord_id' => $booking->landlord_id,
                        'property_id' => $booking->property_id,
                        'booking_id' => $booking->id,
                        'tenant_id' => $booking->tenant_id,
                        'description' => 'Monthly rent and services for '.$periodStart->format('F Y'),
                        'invoice_type' => 'rent',
                        'billing_period_start' => $periodStart,
                        'billing_period_end' => $periodEnd,
                        'billing_period_key' => $periodKey,
                        'amount_cents' => (int) round($baseInvoiceAmount * 100),
                        'currency' => 'PHP',
                        'status' => 'pending',
                        'issued_at' => now(),
                        'due_date' => $periodStart,
                        'metadata' => [
                            'generated_by' => 'system',
                            'billing_period' => $periodStart->format('Y-m'),
                            'billing_period_key' => $periodKey,
                        ],
                    ]);

                    Log::info('Generated recurring invoice', [
                        'booking_id' => $booking->id,
                        'billing_period_key' => $periodKey,
                    ]);
                }
            }

            $nextBillingDate = $billingDate->copy()->addMonthNoOverflow();
            $booking->next_billing_date = $booking->end_date && $nextBillingDate->gt(Carbon::parse($booking->end_date))
                ? null
                : $nextBillingDate->toDateString();
            $booking->save();

            return $invoiceExists ? 'skipped' : 'generated';
        });
    }

    /**
     * Initialize new billing state columns for legacy bookings before processing.
     */
    protected function initializeBillingState(Booking $booking): void
    {
        $dirty = false;
        $startDate = Carbon::parse($booking->start_date);

        if (! $booking->billing_day) {
            $booking->billing_day = (int) $startDate->day;
            $dirty = true;
        }

        if (! $booking->next_billing_date) {
            $nextBillingDate = $startDate->copy()->addMonthNoOverflow();

            if (($booking->room->billing_policy ?? 'monthly') !== 'daily' && $booking->room->requiresAdvance()) {
                $nextBillingDate = $nextBillingDate->addMonthNoOverflow();
            }

            $latestDueDate = $booking->invoices()
                ->whereNotNull('due_date')
                ->orderByDesc('due_date')
                ->value('due_date');

            if ($latestDueDate) {
                $candidate = Carbon::parse($latestDueDate)->addMonthNoOverflow();
                if ($candidate->gt($nextBillingDate)) {
                    $nextBillingDate = $candidate;
                }
            }

            $booking->next_billing_date = $nextBillingDate->toDateString();
            $dirty = true;
        }

        if ($dirty) {
            $booking->save();
        }
    }
}
