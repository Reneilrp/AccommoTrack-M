<?php
$file = 'app/Services/BookingService.php';
$content = file_get_contents($file);

// 1. Add skip_reservation_invoice guard to createBooking
$createBookingReplacement = <<<'REPLACEMENT'
            // GENERATE RESERVATION FEE INVOICE IF REQUIRED
            if ($requiresReservationFee && empty($data['skip_reservation_invoice'])) {
                $reference = 'RES-' . date('Ymd') . '-' . strtoupper(Str::random(6));
REPLACEMENT;
$content = str_replace(
    '// GENERATE RESERVATION FEE INVOICE IF REQUIRED
            if ($requiresReservationFee) {
                $reference = \'RES-\' . date(\'Ymd\') . \'-\' . strtoupper(Str::random(6));', 
    $createBookingReplacement, 
    $content
);

// 2. Inject createCartBookings
$cartMethod = <<<'METHOD'
    /**
     * Create multiple bookings inside a Cart (one transaction).
     */
    public function createCartBookings(array $data, ?int $tenantId = null): array
    {
        $bookings = [];
        $totalReservationFee = 0;
        
        // Single group reference ties these cart bookings together
        $bookingGroupReference = 'GRP-' . date('Ymd') . '-' . strtoupper(Str::random(6));
        
        DB::beginTransaction();
        try {
            foreach ($data['items'] as $itemData) {
                $itemData['booking_mode'] = $data['booking_mode'] ?? 'normal';
                $itemData['notes'] = $data['notes'] ?? null;
                $itemData['payment_plan'] = $data['payment_plan'] ?? 'full';
                // Pass the image object down if any
                $itemData['receipt_image'] = $data['receipt_image'] ?? null; 
                $itemData['booking_group_reference'] = $bookingGroupReference;
                $itemData['skip_reservation_invoice'] = true;
                
                $booking = $this->createBooking($itemData, $tenantId);
                $bookings[] = $booking;
                
                $room = \App\Models\Room::with('property')->find($itemData['room_id']);
                $reservationFeeTemporarilyDisabled = \App\Models\SystemToggle::getBool(
                    'reservation_fee_disabled',
                    (bool) config('app.reservation_fee_disabled', false)
                );
                
                $reservationFeeEnabled = ! $reservationFeeTemporarilyDisabled
                    && (bool) ($room->property->require_reservation_fee ?? false);
                
                if ($reservationFeeEnabled && ($room->property->reservation_fee ?? 0) > 0) {
                    $startDate = \Carbon\Carbon::parse($itemData['start_date']);
                    $daysUntilMoveIn = max(0, \Carbon\Carbon::today()->diffInDays($startDate, false));
                    $threshold = max(0, (int) ($room->property->reservation_fee_gap_days ?? 3));
                    if ($daysUntilMoveIn > $threshold) {
                        $totalReservationFee += (float) $room->property->reservation_fee;
                    }
                }
            }
            
            $reservationInvoice = null;
            if ($totalReservationFee > 0) {
                $reference = 'RES-' . $bookingGroupReference;
                $firstBooking = $bookings[0];
                
                $reservationInvoice = \App\Models\Invoice::create([
                    'reference' => $reference,
                    'landlord_id' => $firstBooking->landlord_id,
                    'property_id' => $firstBooking->property_id,
                    'booking_id' => $firstBooking->id, 
                    'tenant_id' => $tenantId,
                    'description' => 'Cart Group Reservation Fee for ' . count($bookings) . ' rooms',
                    'invoice_type' => 'reservation_fee',
                    'amount_cents' => (int) round($totalReservationFee * 100),
                    'currency' => 'PHP',
                    'status' => 'pending',
                    'issued_at' => now(),
                    'due_date' => now()->addHours(24),
                    'booking_group_reference' => $bookingGroupReference,
                ]);
                
                $this->auditLogService->invoiceEvent('invoice.created', [
                    'subject_type' => 'invoice',
                    'subject_id' => $reservationInvoice->id,
                    'invoice_id' => $reservationInvoice->id,
                    'property_id' => $firstBooking->property_id,
                    'tenant_id' => $tenantId,
                    'status_before' => null,
                    'status_after' => $reservationInvoice->status,
                    'summary' => 'Consolidated Group Reservation fee invoice generated.',
                ]);
            }
            
            DB::commit();
            
            return [
                'bookings' => collect($bookings)->load(['property', 'tenant', 'room', 'occupants'])->toArray(),
                'reservation_invoice' => $reservationInvoice,
                'booking_group_reference' => $bookingGroupReference
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create Cart Booking group', ['error' => $e->getMessage()]);
            throw $e;
        }
    }
METHOD;

$content = preg_replace('/public function createBooking/', $cartMethod . "\n\n    public function createBooking", $content);

file_put_contents($file, $content);
echo "Patched BookingService.php with createCartBookings\n";
?>
