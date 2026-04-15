<?php
$file = 'app/Http/Controllers/Landlord/LandlordBookingController.php';
$content = file_get_contents($file);

$storeMethod = <<<'METHOD'
    public function store(StoreBookingRequest $request)
    {
        try {
            $validated = $request->validated();
            Log::info('Booking request received', $validated);

            $user = $request->user();
            $tenantId = $request->input('tenant_id');

            // If a tenant is logged in and creating a booking, use their ID
            if (! $tenantId && $user && $user->role === 'tenant') {
                $tenantId = $user->id;
            }

            if (isset($validated['items']) && count($validated['items']) > 0) {
                // Multi-room cart checkout
                if ($user && in_array($user->role, ['landlord', 'caretaker'], true)) {
                    $context = $this->resolveLandlordContext($request);
                    $this->ensureCaretakerCan($context, 'can_view_bookings');
                    
                    // Verify access to all rooms
                    foreach ($validated['items'] as $item) {
                        $room = \App\Models\Room::query()->select('id', 'property_id')->findOrFail($item['room_id']);
                        $this->checkPropertyAccess($context, (int) $room->property_id);
                    }
                }
                
                $result = $this->bookingService->createCartBookings($validated, $tenantId);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Cart checkout successful.',
                    'data' => [
                        'bookings' => $result['bookings'],
                        'reservation_invoice_id' => $result['reservation_invoice']?->id,
                        'booking_group_reference' => $result['booking_group_reference']
                    ]
                ], 201);
            } else {
                // Existing single checkout flow
                if ($user && in_array($user->role, ['landlord', 'caretaker'], true)) {
                    $context = $this->resolveLandlordContext($request);
                    $this->ensureCaretakerCan($context, 'can_view_bookings');

                    $room = \App\Models\Room::query()
                        ->select('id', 'property_id')
                        ->findOrFail($validated['room_id']);

                    $this->checkPropertyAccess($context, (int) $room->property_id);
                }

                $booking = $this->bookingService->createBooking(
                    $validated,
                    $tenantId
                );

                // Fetch the reservation invoice if one was generated
                $reservationInvoice = \App\Models\Invoice::where('booking_id', $booking->id)
                    ->where('description', 'like', 'Reservation Fee%')
                    ->where('status', 'pending')
                    ->first();

                $bookingPayload = $booking->load(['property', 'tenant', 'room', 'occupants'])
                    ->toArray();

                return response()->json([
                    'success' => true,
                    'message' => 'Booking created successfully.',
                    'data' => [
                        'booking' => $bookingPayload,
                        'reservation_invoice_id' => $reservationInvoice?->id,
                    ],
                ], 201);
            }
        } catch (\DomainException $e) {
            Log::warning('Booking validation failed', ['message' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => ['general' => [$e->getMessage()]],
            ], 422);
        } catch (\Exception $e) {
            Log::error('Booking creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create booking due to a server error.',
            ], 500);
        }
    }
METHOD;

$content = preg_replace('/public function store\(StoreBookingRequest.*?\{.*?(?=\n    \/\*\*)/s', $storeMethod . "\n", $content);
file_put_contents($file, $content);
echo "Patched LandlordBookingController.php\n";
?>
