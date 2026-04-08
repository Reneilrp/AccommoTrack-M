<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Services\TenantDashboardService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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

    private function resolveAddonEffectivePrice($addon): float
    {
        $pivotPrice = (float) ($addon->pivot->price_at_booking ?? 0);
        if ($pivotPrice > 0) {
            return $pivotPrice;
        }

        $addonPrice = (float) ($addon->price ?? 0);
        if ($addonPrice > 0) {
            return $addonPrice;
        }

        $suggestedPrice = $this->extractSuggestedPriceFromNote($addon->pivot->request_note ?? null);
        if (! is_null($suggestedPrice) && $suggestedPrice > 0) {
            return $suggestedPrice;
        }

        return 0.0;
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

    public function __construct(TenantDashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
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
            $recentBookings = $this->dashboardService->getRecentActivities(Auth::id());
            $activities = collect($recentBookings)->map(function ($booking) {
                return [
                    'id' => $booking->id, 'type' => 'booking', 'action' => 'Booking update',
                    'description' => 'Your booking for '.$booking->property->title.' - Room '.$booking->room->room_number.' is '.$booking->status,
                    'status' => $booking->status, 'timestamp' => $booking->created_at, 'icon' => 'calendar',
                    'color' => $booking->status === 'pending' ? 'yellow' : ($booking->status === 'confirmed' ? 'green' : 'gray'),
                ];
            });

            return response()->json($activities->values(), 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch recent activities', 'error' => $e->getMessage()], 500);
        }
    }

    public function getUpcomingPayments()
    {
        try {
            $data = $this->dashboardService->getUpcomingPayments(Auth::id());

            $upcomingCheckouts = $data['upcomingCheckouts']->map(function ($booking) {
                $daysLeft = $booking->end_date ? now()->diffInDays($booking->end_date, false) : null;

                return [
                    'id' => $booking->id, 'propertyTitle' => $booking->property->title, 'roomNumber' => $booking->room->room_number,
                    'endDate' => $booking->end_date ? $booking->end_date->format('Y-m-d') : null,
                    'daysLeft' => $daysLeft !== null ? (int) $daysLeft : null,
                    'amount' => (float) $booking->monthly_rent, 'paymentStatus' => $booking->payment_status,
                    'urgency' => $daysLeft === null ? 'low' : ($daysLeft <= 7 ? 'high' : ($daysLeft <= 14 ? 'medium' : 'low')),
                ];
            });

            $unpaidBookings = $data['unpaidBookings']->map(function ($booking) {
                return [
                    'id' => $booking->id, 'propertyTitle' => $booking->property->title, 'roomNumber' => $booking->room->room_number,
                    'dueDate' => $booking->start_date->format('Y-m-d'), 'amount' => (float) $booking->total_amount,
                    'paymentStatus' => $booking->payment_status, 'type' => 'payment',
                ];
            });

            return response()->json(['upcomingCheckouts' => $upcomingCheckouts, 'unpaidBookings' => $unpaidBookings], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch upcoming payments', 'error' => $e->getMessage()], 500);
        }
    }

    public function getCurrentStay()
    {
        try {
            $tenantId = Auth::id();
            $bookings = $this->dashboardService->getActiveStays($tenantId);
            $upcomingBooking = $this->dashboardService->getUpcomingBooking($tenantId);
            $pendingCheckIns = $this->dashboardService->getPendingCheckInBookings($tenantId);

            $formattedUpcoming = $upcomingBooking ? [
                'id' => $upcomingBooking->id, 'property' => $upcomingBooking->property->title,
                'room' => $upcomingBooking->room->room_number, 'startDate' => $upcomingBooking->start_date->format('Y-m-d'),
                'daysUntil' => max(0, (int) now()->startOfDay()->diffInDays($upcomingBooking->start_date->copy()->startOfDay(), false)),
            ] : null;

            $formattedPendingCheckIns = $pendingCheckIns->map(function ($b) {
                $startDate = \Carbon\Carbon::parse($b->start_date)->startOfDay();
                $today = now()->startOfDay();
                $daysOverdue = max(0, (int) $startDate->diffInDays($today, false));

                return [
                    'id' => $b->id, 'property' => $b->property->title,
                    'room' => $b->room->room_number, 'startDate' => $b->start_date->format('Y-m-d'),
                    'daysOverdue' => $daysOverdue,
                    'property_id' => $b->property_id,
                    'propertyId' => $b->property_id,
                    'status' => $b->status,
                    'isOverdue' => true
                ];
            });

            if ($bookings->isEmpty()) {
                return response()->json([
                    'hasActiveStay' => false,
                    'stays' => [],
                    'upcomingBooking' => $formattedUpcoming,
                    'pendingCheckIns' => $formattedPendingCheckIns,
                ], 200);
            }

            $stays = $bookings->map(function ($booking) {
                $monthlyAddonTotal = $booking->addons->where('price_type', 'monthly')
                    ->whereIn('pivot.status', ['active', 'approved'])
                    ->sum(function ($a) {
                        $price = $this->resolveAddonEffectivePrice($a);

                        return $price * ((float) ($a->pivot->quantity ?? 1));
                    });

                // For multiple stays, we might want to fetch available addons per property
                // But for now let's use the standard service call which finds the "first" active booking context
                // Or better, let's just use the current booking's property context directly here.
                $availableAddons = \App\Models\Addon::where('property_id', $booking->property_id)
                    ->where('is_active', true)
                    ->whereNotIn('id', $booking->addons->pluck('id')->toArray())
                    ->get();

                return [
                    'booking' => [
                        'id' => $booking->id, 'bookingReference' => $booking->booking_reference,
                        'status' => $booking->status,
                        'startDate' => $booking->start_date->format('Y-m-d'), 'endDate' => $booking->end_date ? $booking->end_date->format('Y-m-d') : null,
                        'start_date' => $booking->start_date->format('Y-m-d'), 'end_date' => $booking->end_date ? $booking->end_date->format('Y-m-d') : null,
                        'totalMonths' => $booking->total_months, 'monthlyRent' => (float) $booking->monthly_rent,
                        'total_months' => $booking->total_months, 'monthly_rent' => (float) $booking->monthly_rent,
                        'billing_policy' => $booking->room->billing_policy ?? 'monthly',
                        'unit_price' => (float) ($booking->room->billing_policy === 'daily' ? ($booking->room->daily_rate ?? ($booking->monthly_rent / 30)) : $booking->monthly_rent),
                        'totalAmount' => (float) $booking->total_amount, 'paymentStatus' => $booking->payment_status,
                        'total_amount' => (float) $booking->total_amount, 'payment_status' => $booking->payment_status,
                        'contract_mode' => $booking->contract_mode,
                        'contractMode' => $booking->contract_mode,
                        'next_billing_date' => $booking->next_billing_date ? $booking->next_billing_date->format('Y-m-d') : null,
                        'billing_day' => $booking->billing_day,
                        'notice_given_at' => $booking->notice_given_at ? $booking->notice_given_at->toISOString() : null,
                        'hasReview' => (bool) $booking->review,
                        'isOverdue' => $booking->end_date ? (now()->gt($booking->end_date) && !in_array($booking->status, ['completed', 'cancelled'])) : false,
                        'due_day' => (int) $booking->start_date->format('d'),
                        'daysRemaining' => $booking->end_date
                            ? (now()->diffInDays($booking->end_date, false) < 0 ? 0 : (int) floor(now()->diffInDays($booking->end_date)))
                            : null,
                        'daysStayed' => now()->diffInDays($booking->start_date, false) > 0 ? 0 : (int) floor(abs(now()->diffInDays($booking->start_date, false))),
                        'monthsRemaining' => $booking->end_date ? now()->diffInMonths($booking->end_date) : null,
                    ],
                    'room' => [
                        'id' => $booking->room->id,
                        'roomNumber' => $booking->room->room_number,
                        'room_number' => $booking->room->room_number,
                        'roomType' => $booking->room->room_type ?? null,
                        'room_type' => $booking->room->room_type ?? null,
                        'require_1month_advance' => $booking->room->requiresAdvance(),
                        'advance_feature_enabled' => $booking->room->requiresAdvance(),
                        'advance_feature_status' => $booking->room->requiresAdvance() ? 'enabled' : 'disabled',
                        'requires_advance' => $booking->room->requiresAdvance(),
                        'requiresAdvance' => $booking->room->requiresAdvance(),
                        'floor' => $booking->room->floor_level ?? null, 'images' => $booking->room->images ?? [],
                    ],
                    'property' => [
                        'id' => $booking->property->id,
                        'title' => $booking->property->title,
                        'address' => $booking->property->full_address,
                        'full_address' => $booking->property->full_address,
                        'image' => $booking->property->image_url,
                    ],
                    'landlord' => ['id' => $booking->landlord->id, 'name' => $booking->landlord->name, 'email' => $booking->landlord->email, 'phone' => $booking->landlord->phone_number ?? null],
                    'addons' => [
                        'active' => $booking->addons->whereIn('pivot.status', ['active', 'approved'])->map(function ($a) {
                            $price = $this->resolveAddonEffectivePrice($a);
                            if ($price > 0) {
                                $a->pivot->price_at_booking = $price;
                                $a->price = $price;
                            }

                            return $a;
                        })->values(),
                        'pending' => $booking->addons->where('pivot.status', 'pending')->map(function ($a) {
                            $price = $this->resolveAddonEffectivePrice($a);
                            if ($price > 0) {
                                $a->pivot->price_at_booking = $price;
                                $a->price = $price;
                            }

                            return $a;
                        })->values(),
                        'available' => $availableAddons, 'monthlyTotal' => (float) $monthlyAddonTotal,
                        'pendingCount' => $booking->addons->where('pivot.status', 'pending')->count(),
                    ],
                    'financials' => [
                        'monthlyRent' => (float) $booking->monthly_rent, 'monthlyAddons' => (float) $monthlyAddonTotal,
                        'billing_policy' => $booking->room->billing_policy ?? 'monthly',
                        'unit_price' => (float) ($booking->room->billing_policy === 'daily' ? ($booking->room->daily_rate ?? ($booking->monthly_rent / 30)) : $booking->monthly_rent),
                        'monthlyTotal' => (float) ($booking->monthly_rent + $monthlyAddonTotal),
                        'invoices' => $booking->invoices->map(function ($invoice) use ($booking) {
                            $metadata = is_array($invoice->metadata) ? $invoice->metadata : [];
                            $rawLineItems = collect($metadata['line_items'] ?? $metadata['lineItems'] ?? []);
                            $invoiceTotalCents = (int) ($invoice->total_cents ?? $invoice->amount_cents ?? 0);

                            $normalizedLineItems = $rawLineItems
                                ->map(function ($item) {
                                    $itemArr = is_array($item) ? $item : [];
                                    $quantity = (float) ($itemArr['quantity'] ?? 1);
                                    $unitAmount = (float) ($itemArr['unit_amount'] ?? $itemArr['unitAmount'] ?? 0);
                                    $totalAmount = (float) ($itemArr['total_amount'] ?? $itemArr['totalAmount'] ?? ($unitAmount * $quantity));

                                    return [
                                        'type' => $itemArr['type'] ?? 'charge',
                                        'label' => $itemArr['label'] ?? 'Charge',
                                        'quantity' => $quantity,
                                        'unit_amount' => $unitAmount,
                                        'total_amount' => $totalAmount,
                                        'billed_days' => (int) ($itemArr['billed_days'] ?? $itemArr['billedDays'] ?? 0),
                                    ];
                                })
                                ->values();

                            if ($normalizedLineItems->isEmpty()) {
                                $addonItems = collect($metadata['addons'] ?? [])->map(function ($addon) {
                                    $addonArr = is_array($addon) ? $addon : [];
                                    $quantity = (float) ($addonArr['quantity'] ?? 1);
                                    $totalAmount = (float) (($addonArr['price'] ?? 0) / 100);

                                    return [
                                        'type' => 'addon',
                                        'label' => $addonArr['addon_name'] ?? 'Add-on',
                                        'quantity' => $quantity,
                                        'unit_amount' => $quantity > 0 ? ($totalAmount / $quantity) : $totalAmount,
                                        'total_amount' => $totalAmount,
                                        'billed_days' => 0,
                                    ];
                                })->values();

                                $addonsTotalCents = (int) round($addonItems->sum(function ($item) {
                                    return (float) ($item['total_amount'] ?? 0) * 100;
                                }));
                                $baseTotalCents = max(0, $invoiceTotalCents - $addonsTotalCents);
                                $billingPolicy = $booking->room->billing_policy ?? 'monthly';
                                $unitPrice = (float) ($billingPolicy === 'daily'
                                    ? ($booking->room->daily_rate ?? ($booking->monthly_rent / 30))
                                    : $booking->monthly_rent);
                                $inferredDays = $billingPolicy === 'daily' && $unitPrice > 0
                                    ? max(1, (int) round(($baseTotalCents / 100) / $unitPrice))
                                    : 0;

                                $baseItem = [
                                    'type' => $billingPolicy === 'daily' ? 'daily_rent' : 'base_rent',
                                    'label' => $billingPolicy === 'daily' ? 'Daily Room Charges' : 'Base Rent',
                                    'quantity' => $billingPolicy === 'daily' ? $inferredDays : 1,
                                    'unit_amount' => $billingPolicy === 'daily' ? $unitPrice : (float) ($baseTotalCents / 100),
                                    'total_amount' => (float) ($baseTotalCents / 100),
                                    'billed_days' => $inferredDays,
                                ];

                                $normalizedLineItems = collect([$baseItem])
                                    ->merge($addonItems)
                                    ->values();
                            }

                            return [
                                'id' => $invoice->id,
                                'amount' => (float) ($invoice->total_cents ?? $invoice->amount_cents) / 100,
                                'status' => $invoice->status,
                                'description' => $invoice->description,
                                'date' => $invoice->issued_at ? $invoice->issued_at->format('M d, Y') : $invoice->created_at->format('M d, Y'),
                                'dueDate' => $invoice->due_date ? $invoice->due_date->format('M d, Y') : null,
                                'metadata' => $metadata,
                                'line_items' => $normalizedLineItems,
                                'transactions' => $invoice->transactions->map(function ($tx) {
                                    return [
                                        'id' => $tx->id,
                                        'amount' => (float) $tx->amount_cents / 100,
                                        'status' => $tx->status,
                                        'method' => $tx->method,
                                        'date' => $tx->created_at->format('M d, Y H:i'),
                                    ];
                                }),
                            ];
                        }),
                    ],
                ];
            });

            return response()->json([
                'hasActiveStay' => true,
                'stays' => $stays,
                'pendingCheckIns' => $formattedPendingCheckIns,
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch current stays', 'error' => $e->getMessage()], 500);
        }
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

                $totalPaid = $booking->payments->where('status', 'completed')->sum('amount');
                $addonTotal = $booking->addons->sum(function ($a) {
                    $price = $this->resolveAddonEffectivePrice($a);

                    return $price * ((float) ($a->pivot->quantity ?? 1));
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
                    'unit_price' => (float) ($booking->room?->billing_policy === 'daily' ? ($booking->room->daily_rate ?? ($booking->monthly_rent / 30)) : $booking->monthly_rent),
                    'confirmedAt' => $booking->confirmed_at,
                    'noticeGivenAt' => $booking->notice_given_at,
                    'activityLog' => $sortedActivity,
                    'financials' => ['monthlyRent' => (float) $booking->monthly_rent, 'totalAmount' => (float) $booking->total_amount, 'addonTotal' => (float) $addonTotal, 'totalPaid' => (float) $totalPaid, 'paymentsCount' => $booking->payments->count()],
                    'addons' => $booking->addons->map(function ($a) {
                        $price = $this->resolveAddonEffectivePrice($a);

                        return [
                            'name' => $a->name,
                            'price' => $price,
                            'priceType' => $a->price_type,
                        ];
                    }),
                    'cancelledAt' => $booking->cancelled_at, 'cancellationReason' => $booking->cancellation_reason,
                    'has_review' => $hasReview,
                    'hasReview' => $hasReview,
                    'review' => $booking->review ? ['id' => $booking->review->id, 'rating' => $booking->review->rating] : null,
                ];
            });

            return response()->json(['bookings' => $formattedBookings, 'pagination' => ['currentPage' => $pastBookings->currentPage(), 'lastPage' => $pastBookings->lastPage(), 'perPage' => $pastBookings->perPage(), 'total' => $pastBookings->total()]], 200);
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
                    $price = $this->resolveAddonEffectivePrice($a);
                    if ($price > 0) {
                        $a->pivot->price_at_booking = $price;
                        $a->price = $price;
                    }

                    return $a;
                })->values(),
                'active' => $booking->addons->whereIn('pivot.status', ['active', 'approved'])->map(function ($a) {
                    $price = $this->resolveAddonEffectivePrice($a);
                    if ($price > 0) {
                        $a->pivot->price_at_booking = $price;
                        $a->price = $price;
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

            return response()->json(['success' => true, 'message' => 'Addon request submitted successfully', 'addon' => $addon], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() >= 400 && $e->getCode() < 500 ? $e->getCode() : 500);
        }
    }

    public function cancelAddonRequest(Request $request, $addonId)
    {
        try {
            $result = $this->dashboardService->cancelAddonRequestForActiveBooking(Auth::id(), $addonId);

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
