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

            $isProxyMode = $booking->booking_mode === 'proxy';
            $expectedInvoiceCount = $isProxyMode
                ? max((int) ($booking->bed_count ?? 1), (int) $booking->occupants()->count(), 1)
                : 1;

            $existingInvoices = Invoice::query()
                ->where('booking_id', $booking->id)
                ->where('invoice_type', 'rent')
                ->where(function ($query) use ($periodKey) {
                    $query->where('billing_period_key', $periodKey)
                        ->orWhere('billing_period_key', 'like', $periodKey.'#%');
                })
                ->get(['id', 'billing_period_key', 'metadata']);

            $existingInvoiceCount = $existingInvoices->count();
            $generatedInvoices = false;
            $missingProxySlots = collect();

            if ($isProxyMode && $expectedInvoiceCount > 1) {
                $expectedSlots = collect(range(1, $expectedInvoiceCount));
                $existingSlots = $existingInvoices
                    ->map(fn (Invoice $invoice) => $this->resolveProxySlotNumber($invoice, $periodKey, $expectedInvoiceCount))
                    ->filter()
                    ->filter(fn (int $slot) => $slot >= 1 && $slot <= $expectedInvoiceCount)
                    ->unique()
                    ->values();

                $missingProxySlots = $expectedSlots->diff($existingSlots)->values();

                // Legacy rows may not have occupant_slot metadata; fallback to count-based gap fill.
                if ($missingProxySlots->isEmpty() && $existingInvoiceCount < $expectedInvoiceCount) {
                    $missingProxySlots = collect(range($existingInvoiceCount + 1, $expectedInvoiceCount));
                }
            }

            if ($existingInvoiceCount < $expectedInvoiceCount || $missingProxySlots->isNotEmpty()) {
                $effectiveMonthlyRent = $booking->resolveEffectiveMonthlyRent($expectedInvoiceCount);
                $baseInvoiceAmount = $effectiveMonthlyRent;

                if ($baseInvoiceAmount > 0) {
                    if ($isProxyMode && $expectedInvoiceCount > 1) {
                        $slotsToGenerate = $missingProxySlots;

                        if ($slotsToGenerate->isEmpty() && $existingInvoiceCount < $expectedInvoiceCount) {
                            $slotsToGenerate = collect(range($existingInvoiceCount + 1, $expectedInvoiceCount));
                        }

                        if ($slotsToGenerate->isNotEmpty()) {
                            $generated = $this->generateProxyOccupantRecurringInvoices(
                                $booking,
                                $periodStart,
                                $periodEnd,
                                $periodKey,
                                $baseInvoiceAmount,
                                $expectedInvoiceCount,
                                $slotsToGenerate->all(),
                            );

                            $generatedInvoices = $generatedInvoices || $generated > 0;
                        }
                    } elseif ($existingInvoiceCount < 1) {
                        // Generate single rent invoice
                        $reference = 'INV-'.$periodStart->format('Ym').'-'.strtoupper(Str::random(6));

                        Invoice::create([
                            'reference' => $reference,
                            'landlord_id' => $booking->landlord_id,
                            'property_id' => $booking->property_id,
                            'booking_id' => $booking->id,
                            'tenant_id' => $booking->tenant_id,
                            'description' => 'Monthly rent for '.$periodStart->format('F Y'),
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

                        Log::info('Generated recurring rent invoice', [
                            'booking_id' => $booking->id,
                            'billing_period_key' => $periodKey,
                        ]);

                        // Clear tenant dashboard cache to reflect new invoice immediately
                        Cache::forget("tenant_dashboard_{$booking->tenant_id}");
                        Cache::forget("tenant_stay_details_{$booking->tenant_id}");
                        Cache::forget("tenant_stats_{$booking->tenant_id}");

                        $generatedInvoices = true;
                    }
                }

                // Add-ons Decoupling: Generate discrete standalone invoices for active add-ons
                $activeMonthlyAddons = $booking->addons()
                    ->wherePivot('status', 'active')
                    ->where('price_type', 'monthly')
                    ->where(function ($query) use ($periodStart) {
                        $query->whereNull('booking_addons.cancellation_effective_at')
                            ->orWhere('booking_addons.cancellation_effective_at', '>', $periodStart);
                    })
                    ->get();

                foreach ($activeMonthlyAddons as $addon) {
                    // Check if this addon was already billed for this period
                    // (prevent duplicate addon invoices if the script is run multiple times)
                    $addonExists = Invoice::where('booking_id', $booking->id)
                        ->where('invoice_type', 'addon')
                        ->where('billing_period_key', "addon-{$addon->id}-{$periodKey}")
                        ->exists();

                    if (! $addonExists) {
                        $priceCents = (int) round(((float) $addon->pivot->price_at_booking) * ((int) $addon->pivot->quantity) * 100);

                        $addonInvoice = Invoice::create([
                            'reference' => 'INV-ADD-'.date('Ymd').'-'.strtoupper(Str::random(6)),
                            'landlord_id' => $booking->landlord_id,
                            'property_id' => $booking->property_id,
                            'booking_id' => $booking->id,
                            'tenant_id' => $booking->tenant_id,
                            'description' => "Monthly Add-on: {$addon->name} - ".$periodStart->format('F Y'),
                            'invoice_type' => 'addon',
                            'billing_period_start' => $periodStart,
                            'billing_period_end' => $periodEnd,
                            'billing_period_key' => "addon-{$addon->id}-{$periodKey}",
                            'amount_cents' => $priceCents,
                            'currency' => 'PHP',
                            'status' => 'pending',
                            'issued_at' => now(),
                            'due_date' => $periodStart,
                            'metadata' => ['addons' => [[
                                'addon_id' => $addon->id,
                                'addon_name' => $addon->name,
                                'quantity' => $addon->pivot->quantity,
                                'price' => $priceCents,
                                'price_type' => 'monthly',
                            ]]],
                        ]);

                        $booking->addons()->updateExistingPivot($addon->id, [
                            'invoice_id' => $addonInvoice->id,
                            'invoiced_at' => now(),
                        ]);

                        Log::info('Generated recurring standalone addon invoice', [
                            'booking_id' => $booking->id,
                            'addon_id' => $addon->id,
                            'invoice_id' => $addonInvoice->id,
                        ]);

                        // Clear tenant dashboard cache
                        Cache::forget("tenant_dashboard_{$booking->tenant_id}");
                        Cache::forget("tenant_stay_details_{$booking->tenant_id}");
                        Cache::forget("tenant_stats_{$booking->tenant_id}");

                        $generatedInvoices = true;
                    }
                }
            }

            $nextBillingDate = BillingCycleCalculator::calculateNextBillingDate($billingDate, $booking->billing_day);
            $booking->next_billing_date = $booking->end_date && $nextBillingDate->gt(Carbon::parse($booking->end_date))
                ? null
                : $nextBillingDate->toDateString();
            $booking->save();

            return $generatedInvoices ? 'generated' : 'skipped';
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
            $roomAmountCents = (int) round(((float) $booking->total_amount) * 100);

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
                $priceCents = (int) round(((float) $addon->pivot->price_at_booking) * ((int) $addon->pivot->quantity) * 100);
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
                'metadata' => ['addons' => []],
            ]);

            // Add-ons Decoupling: Generate discrete standalone invoices for active add-ons instead of merging into Rent.
            foreach ($activeMonthlyAddons as $addon) {
                $priceCents = (int) round(((float) $addon->pivot->price_at_booking) * ((int) $addon->pivot->quantity) * 100);

                $addonInvoice = Invoice::create([
                    'reference' => 'INV-ADD-'.date('Ymd').'-'.strtoupper(Str::random(6)),
                    'landlord_id' => $booking->landlord_id,
                    'property_id' => $booking->property_id,
                    'booking_id' => $booking->id,
                    'tenant_id' => $booking->tenant_id,
                    'description' => "Monthly Add-on: {$addon->name}",
                    'invoice_type' => 'addon',
                    'amount_cents' => $priceCents,
                    'currency' => 'PHP',
                    'status' => 'pending',
                    'issued_at' => $booking->created_at,
                    'due_date' => Carbon::parse($booking->start_date)->addDays(3),
                    'metadata' => ['addons' => [[
                        'addon_id' => $addon->id,
                        'addon_name' => $addon->name,
                        'quantity' => $addon->pivot->quantity,
                        'price' => $priceCents,
                        'price_type' => 'monthly',
                    ]]],
                ]);

                $booking->addons()->updateExistingPivot($addon->id, [
                    'invoice_id' => $addonInvoice->id,
                    'invoiced_at' => now(),
                ]);
            }

            Log::info('Backfilled missing invoices (Rent + Decoupled Addons) for booking', [
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

    /**
     * Generate separate recurring invoices for each occupant in a proxy booking
     */
    protected function generateProxyOccupantRecurringInvoices(
        Booking $booking,
        Carbon $periodStart,
        Carbon $periodEnd,
        string $periodKey,
        float $totalAmount,
        int $totalSlots,
        ?array $slotNumbers = null,
    ): int {
        $occupants = $booking->occupants()->get()->values();
        $totalSlots = max(1, $totalSlots);
        $perOccupantAmount = $totalAmount / $totalSlots;

        if ($slotNumbers === null) {
            $slotNumbers = range(1, $totalSlots);
        }

        $slotNumbers = collect($slotNumbers)
            ->map(fn ($slot) => (int) $slot)
            ->filter(fn (int $slot) => $slot >= 1 && $slot <= $totalSlots)
            ->unique()
            ->values();

        if ($slotNumbers->isEmpty()) {
            return 0;
        }

        if ($occupants->count() < $totalSlots) {
            Log::warning('Recurring proxy billing found fewer occupants than billed slots; using fallback labels.', [
                'booking_id' => $booking->id,
                'bed_count' => (int) ($booking->bed_count ?? 1),
                'occupants_count' => $occupants->count(),
                'invoice_slots' => $totalSlots,
                'billing_period_key' => $periodKey,
            ]);
        }

        $generatedCount = 0;

        foreach ($slotNumbers as $slotNumber) {
            $index = $slotNumber - 1;
            /** @var \App\Models\BookingOccupant|null $occupant */
            $occupant = $occupants->get($index);
            $occupantName = $occupant
                ? trim(implode(' ', array_filter([$occupant->first_name, $occupant->middle_name, $occupant->last_name])))
                : ('Occupant #'.$slotNumber);

            if (empty($occupantName)) {
                $occupantName = 'Occupant #'.$slotNumber;
            }

            $slotBillingPeriodKey = $slotNumber === 1 ? $periodKey : $periodKey.'#'.$slotNumber;

            $reference = 'INV-'.$periodStart->format('Ym').'-'.strtoupper(Str::random(6));

            Invoice::create([
                'reference' => $reference,
                'landlord_id' => $booking->landlord_id,
                'property_id' => $booking->property_id,
                'booking_id' => $booking->id,
                'tenant_id' => $booking->tenant_id,
                'description' => "Monthly rent for {$occupantName} - ".$periodStart->format('F Y'),
                'invoice_type' => 'rent',
                'billing_period_start' => $periodStart,
                'billing_period_end' => $periodEnd,
                'billing_period_key' => $slotBillingPeriodKey,
                'amount_cents' => (int) round($perOccupantAmount * 100),
                'currency' => 'PHP',
                'status' => 'pending',
                'issued_at' => now(),
                'due_date' => $periodStart,
                'metadata' => [
                    'generated_by' => 'system',
                    'billing_period' => $periodStart->format('Y-m'),
                    'billing_period_key' => $periodKey,
                    'billing_period_slot_key' => $slotBillingPeriodKey,
                    'occupant_id' => $occupant?->id,
                    'occupant_name' => $occupantName,
                    'occupant_slot' => $slotNumber,
                    'proxy_booking' => true,
                ],
            ]);

            $generatedCount++;

            Log::info('Generated recurring invoice for proxy occupant', [
                'booking_id' => $booking->id,
                'occupant_id' => $occupant?->id,
                'occupant_name' => $occupantName,
                'occupant_slot' => $slotNumber,
                'billing_period_key' => $periodKey,
            ]);
        }

        return $generatedCount;
    }

    private function resolveProxySlotNumber(Invoice $invoice, string $basePeriodKey, int $maxSlot): ?int
    {
        $slotFromMetadata = (int) data_get($invoice->metadata, 'occupant_slot');
        if ($slotFromMetadata >= 1 && $slotFromMetadata <= $maxSlot) {
            return $slotFromMetadata;
        }

        $key = (string) ($invoice->billing_period_key ?? '');
        if ($key === $basePeriodKey) {
            return 1;
        }

        if (str_starts_with($key, $basePeriodKey.'#')) {
            $suffix = substr($key, strlen($basePeriodKey) + 1);
            $slotFromSuffix = (int) $suffix;
            if ($slotFromSuffix >= 1 && $slotFromSuffix <= $maxSlot) {
                return $slotFromSuffix;
            }
        }

        return null;
    }
}
