const fs = require('fs');

const file = 'app/Services/BookingService.php';
let content = fs.readFileSync(file, 'utf8');

const startStr = "    protected function generateProxyOccupantInvoices(Booking $booking, string $billingPolicy, int $invoiceSlots): void";
const endStr = "        }\n    }";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex) + endStr.length;

if (startIndex !== -1 && endIndex !== -1) {
    const newMethod = `    protected function generateProxyOccupantInvoices(Booking $booking, string $billingPolicy, int $invoiceSlots): void
    {
        $occupants = $booking->occupants()->get()->values();
        $invoiceSlots = max(1, $invoiceSlots);
        $effectiveMonthlyRent = $booking->resolveEffectiveMonthlyRent($invoiceSlots);
        $perOccupantAmount = $effectiveMonthlyRent / $invoiceSlots;

        if ($occupants->count() < $invoiceSlots) {
            Log::warning('Proxy booking has fewer occupant records than billed slots; using fallback labels.', [
                'booking_id' => $booking->id,
                'bed_count' => (int) ($booking->bed_count ?? 1),
                'occupants_count' => $occupants->count(),
                'invoice_slots' => $invoiceSlots,
            ]);
        }
        
        $recurringAddonAmount = 0;
        if ($billingPolicy !== 'daily' && $booking->payment_plan === 'monthly') {
            $recurringAddonAmount = $booking->addons()
                ->where('booking_addons.status', 'active')
                ->where('price_type', 'monthly')
                ->sum(DB::raw('booking_addons.price_at_booking * booking_addons.quantity'));
        }
        
        $perOccupantAddonAmount = (float) $recurringAddonAmount / $invoiceSlots;
        
        $subtotals = [];
        $totalAmount = 0;

        for ($index = 0; $index < $invoiceSlots; $index++) {
            /** @var \\App\\Models\\BookingOccupant|null $occupant */
            $occupant = $occupants->get($index);
            $occupantName = $occupant?->full_name ?? ('Occupant #'.($index + 1));
            
            if ($billingPolicy !== 'daily') {
                if (in_array($booking->payment_plan, ['full', 'promo_one_time'], true)) {
                    $amount = (float) $booking->total_amount / $invoiceSlots;
                } else {
                    $amount = $perOccupantAmount + $perOccupantAddonAmount;
                }
            } else {
                $amount = ((float) $booking->total_amount) / $invoiceSlots;
            }

            $totalAmount += $amount;
            $subtotals[] = [
                'description' => "Bed ({$occupantName})",
                'amount_cents' => (int) round($amount * 100),
                'occupant_id' => $occupant?->id,
                'occupant_name' => $occupantName,
                'occupant_slot' => $index + 1,
            ];
        }

        $reference = 'INV-'.date('Ymd').'-'.strtoupper(Str::random(6));
        $description = 'Consolidated Proxy Invoice';
        if ($billingPolicy !== 'daily' && in_array($booking->payment_plan, ['full', 'promo_one_time'], true)) {
           $description .= $booking->payment_plan === 'promo_one_time' ? ' (Promo)' : ' (Full)';
        } elseif ($billingPolicy === 'daily') {
           $description .= ' - Daily';
        }
        
        $generatedInvoice = \\App\\Models\\Invoice::create([
            'reference' => $reference,
            'landlord_id' => $booking->landlord_id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'description' => $description,
            'invoice_type' => 'rent',
            'amount_cents' => (int) round($totalAmount * 100),
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => Carbon::parse($booking->start_date)->addDays(3),
            'metadata' => [
                'occupant_id' => null,
                'occupant_name' => 'Merged',
                'proxy_booking' => true,
                'breakdown' => $subtotals
            ],
            'booking_group_reference' => $booking->booking_group_reference ?? null,
        ]);
        
        $this->auditLogService->invoiceEvent('invoice.created', [
            'subject_type' => 'invoice',
            'subject_id' => $generatedInvoice->id,
            'booking_id' => $booking->id,
            'invoice_id' => $generatedInvoice->id,
            'property_id' => $booking->property_id,
            'tenant_id' => $booking->tenant_id,
            'landlord_id' => $booking->landlord_id,
            'status_before' => null,
            'status_after' => $generatedInvoice->status,
            'summary' => "Consolidated Rent invoice generated for proxy group.",
            'metadata' => [
                'invoice_type' => $generatedInvoice->invoice_type,
                'amount_cents' => $generatedInvoice->amount_cents,
            ],
        ]);
    }`;
    
    content = content.substring(0, startIndex) + newMethod + content.substring(endIndex);
    fs.writeFileSync(file, content);
    console.log('Replaced proxy invoice generation with consolidated invoices!');
} else {
    console.log('Could not find bounds');
}
