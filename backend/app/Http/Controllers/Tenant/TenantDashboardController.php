<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Services\TenantDashboardService;
use App\Services\UserCounterService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class TenantDashboardController extends Controller
{
    protected TenantDashboardService $dashboardService;

    private function extractSuggestedPriceFromNote(?string $note): ?float
    {
        if (! is_string($note) || trim($note) === '') {
            return null;
        }

        if (! preg_match('/suggested\s*price\s*:\s*₱?\s*([\d,]+(?:\.\d+)?)/i', $note, $matches)) {
            return null;
        }

        $rawValue = str_replace(',', '', $matches[1] ?? '');
        if ($rawValue === '' || ! is_numeric($rawValue)) {
            return null;
        }

        $price = (float) $rawValue;

        return $price > 0 ? $price : null;
    }

    private function resolveAddonEffectivePrice($addon): int
    {
        $pivotPrice = (int) ($addon->pivot->price_at_booking_cents ?? 0);
        if ($pivotPrice > 0) {
            return $pivotPrice;
        }

        $addonPrice = (int) ($addon->price_cents ?? 0);
        if ($addonPrice > 0) {
            return $addonPrice;
        }

        $suggestedPrice = $this->extractSuggestedPriceFromNote($addon->pivot->request_note ?? null);
        if (! is_null($suggestedPrice) && $suggestedPrice > 0) {
            return (int) round($suggestedPrice * 100);
        }

        return 0;
    }

    private function buildReservationPolicyPayload($booking): array
    {
        $thresholdDays = max(0, (int) ($booking->property->reservation_fee_gap_days ?? 3));
        $issuedDate = ($booking->created_at ?? now())->copy()->startOfDay();
        $moveInDate = $booking->start_date
            ? $booking->start_date->copy()->startOfDay()
            : null;
        $daysGap = $moveInDate
            ? max(0, $issuedDate->diffInDays($moveInDate, false))
            : 0;

        $reservationFeeEnabled = (bool) ($booking->property->require_reservation_fee ?? false);
        $reservationFeeAmount = (float) ($booking->property->reservation_fee ?? 0);
        $reservationFeeConfigured = $reservationFeeEnabled && $reservationFeeAmount > 0;
        $feeRequired = $reservationFeeConfigured && $daysGap > $thresholdDays;

        if (! $reservationFeeConfigured) {
            $message = 'No reservation fee is configured for this property.';
        } elseif ($feeRequired) {
            $message = "Reservation fee is required because move-in is {$daysGap} days after booking date.";
        } else {
            $message = "No reservation fee is required because move-in is within {$thresholdDays} days from booking date.";
        }

        return [
            'fee_required' => $feeRequired,
            'fee_amount' => $reservationFeeAmount,
            'days_gap' => $daysGap,
            'threshold_days' => $thresholdDays,
            'comparator' => 'days_gap > threshold_days',
            'booking_issued_date' => $issuedDate->toDateString(),
            'move_in_date' => $moveInDate?->toDateString(),
            'message' => $message,
        ];
    }

    private function resolveBookingRentSnapshot($booking, ?int $resolvedOccupantCount = null): array
    {
        $resolvedSlots = $booking->resolveOccupiedSlots($resolvedOccupantCount);
        $monthlyRent = (float) $booking->resolveEffectiveMonthlyRent($resolvedSlots);

        $billingPolicy = strtolower((string) ($booking->room->billing_policy ?? 'monthly'));
        $unitPrice = $billingPolicy === 'daily'
            ? (float) ($booking->room->daily_rate ?? ($monthlyRent / 30))
            : $monthlyRent;

        return [
            'monthly_rent' => $monthlyRent,
            'unit_price' => $unitPrice,
            'billing_policy' => $billingPolicy,
        ];
    }

    public function __construct(TenantDashboardService $dashboardService, UserCounterService $counterService)
    {
        $this->dashboardService = $dashboardService;
        $this->counterService = $counterService;
    }

    public function getStats()
    {
        try {
            $tenantId = Auth::id();
            $stats = $this->dashboardService->getStats($tenantId);

            return response()->json($stats, 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch dashboard stats', 'error' => $e->getMessage()], 500);
        }
    }

    public function getRecentActivities()
    {
        try {
            $activities = $this->dashboardService->getRecentActivities(Auth::id());

            return response()->json($activities->values(), 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch recent activities', 'error' => $e->getMessage()], 500);
        }
    }

    public function getUpcomingPayments()
    {
        try {
            $data = $this->dashboardService->getUpcomingPayments(Auth::id());
            return response()->json($this->formatUpcomingPayments($data), 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch upcoming payments', 'error' => $e->getMessage()], 500);
        }
    }

    private function formatUpcomingPayments(array $data): array
    {
        $upcomingCheckouts = $data['upcomingCheckouts']->map(function ($booking) {
            $daysLeft = $booking->end_date ? now()->diffInDays($booking->end_date, false) : null;
            $rentSnapshot = $this->resolveBookingRentSnapshot($booking);

            return [
                'id' => $booking->id, 'propertyTitle' => $booking->property?->title ?? 'N/A', 'roomNumber' => $booking->room?->room_number ?? 'N/A',
                'endDate' => $booking->end_date ? $booking->end_date->format('Y-m-d') : null,
                'daysLeft' => $daysLeft !== null ? (int) $daysLeft : null,
                'amount' => (float) $rentSnapshot['monthly_rent'], 'paymentStatus' => $booking->payment_status,
                'urgency' => $daysLeft === null ? 'low' : ($daysLeft <= 7 ? 'high' : ($daysLeft <= 14 ? 'medium' : 'low')),
            ];
        });

        $unpaidBookings = $data['unpaidBookings']->map(function ($booking) {
            return [
                'id' => $booking->id, 'propertyTitle' => $booking->property?->title ?? 'N/A', 'roomNumber' => $booking->room?->room_number ?? 'N/A',
                'dueDate' => $booking->start_date->format('Y-m-d'), 'amount' => (float) $booking->total_amount,
                'paymentStatus' => $booking->payment_status, 'type' => 'payment',
            ];
        });

        return ['upcomingCheckouts' => $upcomingCheckouts, 'unpaidBookings' => $unpaidBookings];
    }

    public function getDashboardBundle(Request $request)
    {
        try {
            $tenantId = Auth::id();

            // 1. Core dashboard stats
            $stats = $this->dashboardService->getStats($tenantId);

            // 2. Recent activities
            $activities = $this->dashboardService->getRecentActivities($tenantId)->values();

            // 3. Upcoming payments/check-ins
            $upcomingRaw = $this->dashboardService->getUpcomingPayments($tenantId);
            $upcoming = $this->formatUpcomingPayments($upcomingRaw);

            // 4. Stay details
            $stayData = $this->getStayDetailsInternal($tenantId);

            // 5. Payment breakdown (Invoke standalone controller method)
            $paymentController = app(\App\Http\Controllers\Tenant\TenantPaymentController::class);
            $breakdownResponse = $paymentController->getBreakdown($request);
            $breakdown = $breakdownResponse->getData(true);

            $bundle = [
                'stats' => $stats,
                'activities' => $activities,
                'upcoming' => $upcoming,
                'stay' => $stayData,
                'breakdown' => $breakdown['data'] ?? ['upcoming_months' => []],
            ];

            return response()->json([
                'success' => true,
                'data' => $bundle,
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch dashboard bundle', 'error' => $e->getMessage()], 500);
        }
    }

    public function getCurrentStay()
    {
        try {
            $data = $this->getStayDetailsInternal(Auth::id());
            return response()->json($data, 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch current stays', 'error' => $e->getMessage()], 500);
        }
    }

    private function getStayDetailsInternal(int $tenantId): array
    {
        $bookings = $this->dashboardService->getActiveStays($tenantId);
        $upcomingBooking = $this->dashboardService->getUpcomingBooking($tenantId);
        $pendingCheckIns = $this->dashboardService->getPendingCheckInBookings($tenantId);

        $formattedUpcoming = $upcomingBooking ? [
            'id' => $upcomingBooking->id, 'property' => $upcomingBooking->property?->title ?? 'N/A',
            'room' => $upcomingBooking->room?->room_number ?? 'N/A', 'startDate' => $upcomingBooking->start_date->format('Y-m-d'),
            'daysUntil' => max(0, (int) now()->startOfDay()->diffInDays($upcomingBooking->start_date->copy()->startOfDay(), false)),
        ] : null;

        $formattedPendingCheckIns = $pendingCheckIns->map(function ($b) {
            $startDate = \Carbon\Carbon::parse($b->start_date)->startOfDay();
            $today = now()->startOfDay();
            $daysOverdue = max(0, (int) $startDate->diffInDays($today, false));

            return [
                'id' => $b->id, 'property' => $b->property?->title ?? 'N/A',
                'room' => $b->room?->room_number ?? 'N/A', 'startDate' => $b->start_date->format('Y-m-d'),
                'daysOverdue' => $daysOverdue,
                'property_id' => $b->property_id,
                'propertyId' => $b->property_id,
                'status' => $b->status,
                'isOverdue' => $daysOverdue > 0,
            ];
        });

        if ($bookings->isEmpty()) {
            return [
                'hasActiveStay' => false,
                'stays' => [],
                'upcomingBooking' => $formattedUpcoming,
                'pendingCheckIns' => $formattedPendingCheckIns,
            ];
        }

        // --- OPTIMIZATION: Bulk fetch available addons for all stay properties ---
        $propertyIds = $bookings->pluck('property_id')->unique()->toArray();
        $allAvailableAddons = \App\Models\Addon::whereIn('property_id', $propertyIds)
            ->where('is_active', true)
            ->get()
            ->groupBy('property_id');

        $stays = $bookings->map(function ($booking) use ($allAvailableAddons) {
            $monthlyAddonTotal = $booking->addons->where('price_type', 'monthly')
                ->whereIn('pivot.status', ['active', 'approved'])
                ->sum(function ($a) {
                    $priceCents = $this->resolveAddonEffectivePrice($a);
                    return ($priceCents * ((int) ($a->pivot->quantity ?? 1))) / 100;
                });

            $resolvedBedCount = max(1, (int) ($booking->bed_count ?? 1));
            $resolvedOccupantCount = (int) ($booking->occupants_count ?? 0);
            if ($resolvedOccupantCount <= 0 && $booking->booking_mode === 'proxy') {
                $resolvedOccupantCount = $resolvedBedCount;
            }
            $rentSnapshot = $this->resolveBookingRentSnapshot($booking, $resolvedOccupantCount);

            $availableAddons = $allAvailableAddons->get($booking->property_id, collect())
                ->whereNotIn('id', $booking->addons->pluck('id')->toArray())
                ->values();

            return [
                'booking' => [
                    'id' => $booking->id, 'bookingReference' => $booking->booking_reference,
                    'status' => $booking->status,
                    'startDate' => $booking->start_date->format('Y-m-d'), 'endDate' => $booking->end_date ? $booking->end_date->format('Y-m-d') : null,
                    'start_date' => $booking->start_date->format('Y-m-d'), 'end_date' => $booking->end_date ? $booking->end_date->format('Y-m-d') : null,
                    'bookingMode' => $booking->booking_mode,
                    'booking_mode' => $booking->booking_mode,
                    'bedCount' => $resolvedBedCount,
                    'bed_count' => $resolvedBedCount,
                    'occupantCount' => $resolvedOccupantCount,
                    'occupant_count' => $resolvedOccupantCount,
                    'occupants' => $booking->occupants->map(fn($o) => [
                        'id' => $o->id, 'first_name' => $o->first_name, 'last_name' => $o->last_name,
                        'phone' => $o->phone, 'email' => $o->email,
                    ])->values(),
                    'totalMonths' => $booking->total_months, 'monthlyRent' => (float) $rentSnapshot['monthly_rent'],
                    'total_months' => $booking->total_months, 'monthly_rent' => (float) $rentSnapshot['monthly_rent'],
                    'billing_policy' => $booking->room->billing_policy ?? 'monthly',
                    'unit_price' => (float) $rentSnapshot['unit_price'],
                    'totalAmount' => (float) $booking->total_amount, 'paymentStatus' => $booking->payment_status,
                    'total_amount' => (float) $booking->total_amount, 'payment_status' => $booking->payment_status,
                    'contract_mode' => $booking->contract_mode,
                    'contractMode' => $booking->contract_mode,
                    'next_billing_date' => $booking->next_billing_date ? $booking->next_billing_date->format('Y-m-d') : null,
                    'billing_day' => $booking->billing_day,
                    'notice_given_at' => $booking->notice_given_at ? $booking->notice_given_at->toISOString() : null,
                    'hasReview' => (bool) $booking->review,
                    'isOverdue' => $booking->end_date ? (now()->gt($booking->end_date) && ! in_array($booking->status, ['completed', 'cancelled'])) : false,
                    'due_day' => (int) $booking->start_date->format('d'),
                    'daysRemaining' => $booking->end_date
                        ? (now()->diffInDays($booking->end_date, false) < 0 ? 0 : (int) floor(now()->diffInDays($booking->end_date)))
                        : null,
                    'daysStayed' => now()->diffInDays($booking->start_date, false) > 0 ? 0 : (int) floor(abs(now()->diffInDays($booking->start_date, false))),
                ],
                'room' => [
                    'id' => $booking->room->id, 'roomNumber' => $booking->room->room_number,
                    'room_number' => $booking->room->room_number, 'capacity' => (int) ($booking->room->capacity ?? 0),
                    'roomType' => $booking->room->room_type ?? null, 'floor' => $booking->room->floor_level ?? null,
                ],
                'property' => [
                    'id' => $booking->property->id, 'title' => $booking->property->title,
                    'address' => $booking->property->full_address, 'image' => $booking->property->image_url,
                    'transfer_limit' => (int) ($booking->property->transfer_limit ?? 1),
                    'transfer_fee' => (float) ($booking->property->transfer_fee ?? 0),
                ],
                'landlord' => ['id' => $booking->landlord->id, 'name' => $booking->landlord->name, 'email' => $booking->landlord->email],
                'addons' => [
                    'active' => $booking->addons->whereIn('pivot.status', ['active', 'approved'])->map(function ($a) {
                        $priceCents = $this->resolveAddonEffectivePrice($a);
                        $a->price_cents = $priceCents;
                        return $a;
                    })->values(),
                    'pending' => $booking->addons->where('pivot.status', 'pending')->map(function ($a) {
                        $priceCents = $this->resolveAddonEffectivePrice($a);
                        $a->price_cents = $priceCents;
                        return $a;
                    })->values(),
                    'available' => $availableAddons, 'monthlyTotal' => (float) $monthlyAddonTotal,
                    'pendingCount' => $booking->addons->where('pivot.status', 'pending')->count(),
                ],
                'financials' => [
                    'monthlyRent' => (float) $rentSnapshot['monthly_rent'], 'monthlyAddons' => (float) $monthlyAddonTotal,
                    'monthlyTotal' => (float) ($rentSnapshot['monthly_rent'] + $monthlyAddonTotal),
                    'invoices' => $booking->invoices->map(function ($invoice) {
                        return [
                            'id' => $invoice->id,
                            'invoice_number' => $invoice->invoice_number,
                            'amount' => (float) (($invoice->total_cents ?? $invoice->amount_cents) / 100),
                            'status' => $invoice->status,
                            'description' => $invoice->description,
                            'date' => $invoice->issued_at ?: $invoice->created_at,
                            'due_date' => $invoice->due_date,
                            'dueDate' => $invoice->due_date,
                            'metadata' => $invoice->metadata,
                            'transactions' => $invoice->transactions->map(fn($tx) => [
                                'id' => $tx->id, 'amount' => (float) ($tx->amount_cents / 100),
                                'status' => $tx->status, 'method' => $tx->method, 'date' => $tx->created_at->format('M d, Y H:i'),
                            ]),
                        ];
                    }),
                ],
            ];
        });

        return [
            'hasActiveStay' => true,
            'stays' => $stays,
            'upcomingBooking' => $formattedUpcoming,
            'pendingCheckIns' => $formattedPendingCheckIns,
        ];
    }

    public function getHistory()
    {
        try {
            $pastBookings = $this->dashboardService->getHistory(Auth::id());
            $formattedBookings = $pastBookings->getCollection()->map(function ($booking) {
                $property = $booking->property;
                $room = $booking->room;
                $landlord = $booking->landlord;

                $propertyId = $property?->id ?? $booking->property_id;
                $propertyTitle = $property?->title ?? 'Property unavailable';
                $propertyImage = $property?->image_url;
                $roomId = $room?->id ?? $booking->room_id;
                $roomNumber = $room?->room_number ?? 'N/A';
                $landlordName = trim((string) ($landlord?->full_name ?? (($landlord?->first_name ?? '').' '.($landlord?->last_name ?? ''))));
                $landlordName = $landlordName !== '' ? $landlordName : ($landlord?->name ?? 'Landlord');
                $startDate = $booking->start_date ? $booking->start_date->format('Y-m-d') : null;
                $endDate = $booking->end_date ? $booking->end_date->format('Y-m-d') : null;
                $hasReview = ! is_null($booking->review);
                $rentSnapshot = $this->resolveBookingRentSnapshot($booking);

                $totalPaid = $booking->payments->where('status', 'completed')->sum('amount');
                $addonTotal = $booking->addons->sum(function ($a) {
                    $priceCents = $this->resolveAddonEffectivePrice($a);

                    return ($priceCents * ((int) ($a->pivot->quantity ?? 1))) / 100;
                });

                // Build a timeline of activities
                $activityLog = collect();

                // 1. Booking Requested (Created)
                $activityLog->push([
                    'type' => 'event',
                    'action' => 'Booking Requested',
                    'timestamp' => $booking->created_at,
                    'description' => 'You submitted a booking request for '.$propertyTitle,
                    'status' => 'pending',
                ]);

                // 2. Booking Confirmed
                if ($booking->confirmed_at) {
                    $activityLog->push([
                        'type' => 'event',
                        'action' => 'Booking Confirmed',
                        'timestamp' => $booking->confirmed_at,
                        'description' => 'Landlord confirmed your stay.',
                        'status' => 'confirmed',
                    ]);
                }

                // 3. Successful Payments (from invoices -> transactions)
                $booking->invoices->each(function ($invoice) use (&$activityLog) {
                    $invoice->transactions->where('status', 'succeeded')->each(function ($tx) use (&$activityLog, $invoice) {
                        $activityLog->push([
                            'type' => 'payment',
                            'action' => 'Payment Successful',
                            'timestamp' => $tx->created_at,
                            'description' => 'Paid ₱'.number_format($tx->amount_cents / 100, 2).' via '.ucfirst($tx->method).' for '.($invoice->description ?: 'Accommodation Fee'),
                            'status' => 'paid',
                            'amount' => (float) ($tx->amount_cents / 100),
                        ]);
                    });
                });

                // 4. Booking Cancelled
                if ($booking->status === 'cancelled' && $booking->cancelled_at) {
                    $activityLog->push([
                        'type' => 'event',
                        'action' => 'Booking Cancelled',
                        'timestamp' => $booking->cancelled_at,
                        'description' => 'Booking was cancelled. Reason: '.($booking->cancellation_reason ?: 'No reason provided'),
                        'status' => 'cancelled',
                    ]);
                }

                // Sort activity by timestamp
                $sortedActivity = $activityLog->sortBy('timestamp')->values();

                return [
                    'id' => $booking->id, 'bookingReference' => $booking->booking_reference,
                    'booking_reference' => $booking->booking_reference,
                    'property_id' => $propertyId,
                    'property_title' => $propertyTitle,
                    'property_image' => $propertyImage,
                    'property' => ['id' => $propertyId, 'title' => $propertyTitle, 'image' => $propertyImage],
                    'room' => ['id' => $roomId, 'roomNumber' => $roomNumber],
                    'landlord' => ['name' => $landlordName],
                    'period' => [
                        'startDate' => $startDate,
                        'endDate' => $endDate,
                        'totalMonths' => $booking->total_months,
                    ],
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'status' => $booking->status,
                    'reservation_policy' => $this->buildReservationPolicyPayload($booking),
                    'billing_policy' => $booking->room?->billing_policy ?? 'monthly',
                    'unit_price' => (float) $rentSnapshot['unit_price'],
                    'confirmedAt' => $booking->confirmed_at,
                    'noticeGivenAt' => $booking->notice_given_at,
                    'activityLog' => $sortedActivity,
                    'financials' => ['monthlyRent' => (float) $rentSnapshot['monthly_rent'], 'totalAmount' => (float) $booking->total_amount, 'addonTotal' => (float) $addonTotal, 'totalPaid' => (float) $totalPaid, 'paymentsCount' => $booking->payments->count()],
                    'addons' => $booking->addons->map(function ($a) {
                        $priceCents = $this->resolveAddonEffectivePrice($a);

                        return [
                            'name' => $a->name,
                            'price' => (float) ($priceCents / 100),
                            'priceType' => $a->price_type,
                        ];
                    }),
                    'cancelledAt' => $booking->cancelled_at, 'cancellationReason' => $booking->cancellation_reason,
                    'has_review' => $hasReview,
                    'hasReview' => $hasReview,
                    'review' => $booking->review ? ['id' => $booking->review->id, 'rating' => $booking->review->rating] : null,
                ];
            });

            return response()->json([
                'data' => $formattedBookings->values(),
                'current_page' => $pastBookings->currentPage(),
                'last_page' => $pastBookings->lastPage(),
                'per_page' => $pastBookings->perPage(),
                'total' => $pastBookings->total(),
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch booking history', 'error' => $e->getMessage()], 500);
        }
    }

    public function getAvailableAddons()
    {
        try {
            $availableAddons = $this->dashboardService->getAvailableAddonsForActiveBooking(Auth::id());
            if ($availableAddons === null) {
                return response()->json(['message' => 'No active booking found'], 404);
            }

            return response()->json(['available' => $availableAddons], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch available addons', 'error' => $e->getMessage()], 500);
        }
    }

    public function getAddonRequests()
    {
        try {
            $booking = $this->dashboardService->getAddonRequestsForActiveBooking(Auth::id());
            if (! $booking) {
                return response()->json(['message' => 'No active booking found'], 404);
            }

            return response()->json([
                'pending' => $booking->addons->where('pivot.status', 'pending')->map(function ($a) {
                    $priceCents = $this->resolveAddonEffectivePrice($a);
                    if ($priceCents > 0) {
                        $a->pivot->price_at_booking_cents = $priceCents;
                        $a->price_cents = $priceCents;
                    }

                    return $a;
                })->values(),
                'active' => $booking->addons->whereIn('pivot.status', ['active', 'approved'])->map(function ($a) {
                    $priceCents = $this->resolveAddonEffectivePrice($a);
                    if ($priceCents > 0) {
                        $a->pivot->price_at_booking_cents = $priceCents;
                        $a->price_cents = $priceCents;
                    }

                    return $a;
                })->values(),
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch addon requests', 'error' => $e->getMessage()], 500);
        }
    }

    public function requestAddon(Request $request)
    {
        try {
            $validated = $request->validate([
                'booking_id' => 'nullable|integer|exists:bookings,id',
                'is_custom' => 'boolean',
                'addon_id' => 'required_without:is_custom|exists:addons,id',
                'name' => 'required_if:is_custom,true|string|max:255',
                'price_type' => 'required_if:is_custom,true|in:one_time,monthly',
                'addon_type' => 'required_if:is_custom,true|in:rental,fee',
                'quantity' => 'integer|min:1|max:10',
                'note' => 'nullable|string|max:500',
                'suggested_price' => 'nullable|numeric|min:0',
            ]);
            $addon = $this->dashboardService->requestAddonForActiveBooking(Auth::id(), $validated);

            // BROADCAST COUNTERS to Landlord
            try {
                $booking = \App\Models\Booking::find($addon->pivot->booking_id);
                if ($booking) {
                    $this->counterService->broadcastCounters((int) $booking->landlord_id);
                }
            } catch (\Exception $e) {
                \Log::warning('Failed to broadcast addon request counters', ['error' => $e->getMessage()]);
            }

            return response()->json(['success' => true, 'message' => 'Addon request submitted successfully', 'addon' => $addon], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() >= 400 && $e->getCode() < 500 ? $e->getCode() : 500);
        }
    }

    public function cancelAddonRequest(Request $request, $addonId)
    {
        try {
            $result = $this->dashboardService->cancelAddonRequestForActiveBooking(Auth::id(), $addonId);

            // BROADCAST COUNTERS to Landlord
            try {
                $booking = \App\Models\Booking::where('tenant_id', Auth::id())
                    ->whereIn('status', ['confirmed', 'active', 'completed', 'partial-completed'])
                    ->first();
                if ($booking) {
                    $this->counterService->broadcastCounters((int) $booking->landlord_id);
                }
            } catch (\Exception $e) {
                \Log::warning('Failed to broadcast addon cancel counters', ['error' => $e->getMessage()]);
            }

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => $result['message'] ?? 'Addon request cancelled successfully',
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() >= 400 && $e->getCode() < 500 ? $e->getCode() : 500);
        }
    }
}
