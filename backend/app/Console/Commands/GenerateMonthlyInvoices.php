<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Invoice;
use App\Services\BillingCycleCalculator;
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
        $forcedNow = \App\Support\SystemToggle::getString('system_forced_now');
        if ($forcedNow && $forcedNow !== '') {
            try {
                Carbon::setTestNow(Carbon::parse($forcedNow));
            } catch (\Exception $e) {
                // Ignore parsing errors
            }
        }

        $lock = Cache::lock('invoices:generate-monthly', 600);
        if (! $lock->get()) {
            $message = 'Monthly invoice generation is already running. Skipping duplicate execution.';
            $this->warn($message);
            Log::warning($message);

            return Command::SUCCESS;
        }

        Log::info('Starting state-driven monthly invoice generation task...');
        $this->info('Starting state-driven monthly invoice generation task...');

        $backfilledCount = 0;
        $generatedCount = 0;
        $skippedCount = 0;
        $failedCount = 0;
        $today = Carbon::today();

        try {
            $uninvoicedBookingIds = Booking::query()
                ->whereIn('status', ['confirmed', 'completed', 'partial-completed'])
                ->whereDoesntHave('invoices')
                ->pluck('id');

            foreach ($uninvoicedBookingIds as $bookingId) {
                try {
                    if ($this->backfillMissingInvoiceForBooking((int) $bookingId)) {
                        $backfilledCount++;
                    }
                } catch (\Throwable $e) {
                    $failedCount++;
                    Log::error('Legacy invoice backfill failed for booking', [
                        'booking_id' => $bookingId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $bookings = Booking::query()
                ->whereIn('status', ['confirmed', 'active'])
                ->where('payment_plan', 'monthly')
                ->where(function ($query) use ($today) {
                    $query->whereNull('next_billing_date')
                        ->orWhere(function ($openEnded) use ($today) {
                            $openEnded->whereNull('end_date')
                                ->whereDate('next_billing_date', '<=', $today->copy()->addDays(5)->toDateString());
                        })
                        ->orWhere(function ($fixedTerm) use ($today) {
                            $fixedTerm->whereNotNull('end_date')
                                ->whereDate('next_billing_date', '<=', $today->toDateString());
                        });
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

            $summary = "Completed monthly generation. Backfilled {$backfilledCount}, generated {$generatedCount}, skipped {$skippedCount}, failed {$failedCount}.";
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
                $openEndedAdvanceWindow = Carbon::today()->addDays(5)->startOfDay();
                $isOpenEnded = is_null($booking->end_date);

                if (! $isOpenEnded || $billingDate->gt($openEndedAdvanceWindow)) {
                    return 'skipped';
                }
            }

            if ($booking->end_date && $billingDate->gt(Carbon::parse($booking->end_date))) {
                $booking->next_billing_date = null;
                $booking->save();

                return 'skipped';
            }

            $periodStart = $billingDate->copy();
            $periodEnd = BillingCycleCalculator::calculatePeriodEnd($billingDate, $booking->billing_day);
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

            $nextBillingDate = BillingCycleCalculator::calculateNextBillingDate($billingDate, $booking->billing_day);
            $booking->next_billing_date = $booking->end_date && $nextBillingDate->gt(Carbon::parse($booking->end_date))
                ? null
                : $nextBillingDate->toDateString();
            $booking->save();

            return $invoiceExists ? 'skipped' : 'generated';
        });
    }

    /**
     * Backfill a missing initial invoice for legacy bookings that have no invoice records.
     */
    protected function backfillMissingInvoiceForBooking(int $bookingId): bool
    {
        return DB::transaction(function () use ($bookingId): bool {
            $booking = Booking::query()
                ->whereKey($bookingId)
                ->lockForUpdate()
                ->first();

            if (! $booking || ! in_array($booking->status, ['confirmed', 'completed', 'partial-completed'], true)) {
                return false;
            }

            if ($booking->invoices()->exists()) {
                return false;
            }

            $reference = 'INV-'.date('Ymd').'-'.strtoupper(Str::random(6));
            $roomAmountCents = (int) round((float) $booking->total_amount * 100);

            $billingPeriodStart = Carbon::parse($booking->start_date)->startOfMonth();
            $activeMonthlyAddons = $booking->addons()
                ->wherePivot('status', 'active')
                ->where(function ($query) use ($billingPeriodStart) {
                    $query->whereNull('booking_addons.cancellation_effective_at')
                        ->orWhere('booking_addons.cancellation_effective_at', '>', $billingPeriodStart);
                })
                ->where('price_type', 'monthly')
                ->get();

            $addonsTotalCents = 0;
            $addonMetadata = [];
            foreach ($activeMonthlyAddons as $addon) {
                $priceCents = (int) round($addon->pivot->price_at_booking * $addon->pivot->quantity * 100);
                $addonsTotalCents += $priceCents;
                $addonMetadata[] = [
                    'addon_id' => $addon->id,
                    'addon_name' => $addon->name,
                    'quantity' => $addon->pivot->quantity,
                    'price' => $priceCents,
                    'price_type' => 'monthly',
                ];
            }

            $totalAmountCents = $roomAmountCents + $addonsTotalCents;
            $description = 'Monthly invoice for booking '.$booking->booking_reference;
            if ($addonsTotalCents > 0) {
                $description .= "\n+ Includes active Add-ons";
            }

            $invoice = Invoice::create([
                'reference' => $reference,
                'landlord_id' => $booking->landlord_id,
                'property_id' => $booking->property_id,
                'booking_id' => $booking->id,
                'tenant_id' => $booking->tenant_id,
                'description' => $description,
                'amount_cents' => $totalAmountCents,
                'currency' => 'PHP',
                'status' => 'pending',
                'issued_at' => $booking->created_at,
                'due_date' => Carbon::parse($booking->start_date)->addDays(3),
                'metadata' => ['addons' => $addonMetadata],
            ]);

            foreach ($activeMonthlyAddons as $addon) {
                $booking->addons()->updateExistingPivot($addon->id, [
                    'invoice_id' => $invoice->id,
                    'invoiced_at' => now(),
                ]);
            }

            Log::info('Backfilled missing invoice for booking', [
                'booking_id' => $booking->id,
                'invoice_id' => $invoice->id,
            ]);

            return true;
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
            $nextBillingDate = BillingCycleCalculator::calculateNextBillingDate($startDate, $booking->billing_day);

            if (($booking->room->billing_policy ?? 'monthly') !== 'daily' && $booking->room->requiresAdvance()) {
                $nextBillingDate = BillingCycleCalculator::calculateNextBillingDate($nextBillingDate, $booking->billing_day);
            }

            $latestDueDate = $booking->invoices()
                ->whereNotNull('due_date')
                ->orderByDesc('due_date')
                ->value('due_date');

            if ($latestDueDate) {
                $candidate = BillingCycleCalculator::calculateNextBillingDate(Carbon::parse($latestDueDate), $booking->billing_day);
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
