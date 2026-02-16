<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Booking;
use App\Models\User;
use App\Models\Addon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TenantDashboardController extends Controller
{
    /**
     * Get comprehensive dashboard statistics for tenant (HomePage data)
     */
    public function getStats()
    {
        try {
            $tenantId = Auth::id();

            // Bookings Stats
            $activeBookings = Booking::where('tenant_id', $tenantId)
                ->whereIn('status', ['pending', 'confirmed'])
                ->count();

            $confirmedBookings = Booking::where('tenant_id', $tenantId)
                ->where('status', 'confirmed')
                ->count();

            $pendingBookings = Booking::where('tenant_id', $tenantId)
                ->where('status', 'pending')
                ->count();

            // Revenue/Payment Stats (This month - amounts tenant needs to pay)
            $monthlyDue = Booking::where('tenant_id', $tenantId)
                ->where('status', 'confirmed')
                ->whereIn('payment_status', ['unpaid', 'partial'])
                ->whereMonth('start_date', now()->month)
                ->whereYear('start_date', now()->year)
                ->sum('monthly_rent');

            // Total Due (All time unpaid/partial)
            $totalDue = Booking::where('tenant_id', $tenantId)
                ->where('status', 'confirmed')
                ->whereIn('payment_status', ['unpaid', 'partial'])
                ->sum('total_amount');

            // Paid Amount (All time)
            $totalPaid = Booking::where('tenant_id', $tenantId)
                ->where('status', 'confirmed')
                ->where('payment_status', 'paid')
                ->sum('total_amount');

            return response()->json([
                'bookings' => [
                    'active' => $activeBookings,
                    'confirmed' => $confirmedBookings,
                    'pending' => $pendingBookings
                ],
                'payments' => [
                    'monthlyDue' => (float) $monthlyDue,
                    'totalDue' => (float) $totalDue,
                    'totalPaid' => (float) $totalPaid
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch dashboard stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get recent activities for tenant
     */
    public function getRecentActivities()
    {
        try {
            $tenantId = Auth::id();
            $activities = [];

            // Recent Bookings (Last 10)
            $recentBookings = Booking::where('tenant_id', $tenantId)
                ->with(['landlord', 'property', 'room'])
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($booking) {
                    return [
                        'id' => $booking->id,
                        'type' => 'booking',
                        'action' => 'Booking update',
                        'description' => 'Your booking for ' . $booking->property->title . ' - Room ' . $booking->room->room_number . ' is ' . $booking->status,
                        'status' => $booking->status,
                        'timestamp' => $booking->created_at,
                        'icon' => 'calendar',
                        'color' => $booking->status === 'pending' ? 'yellow' : ($booking->status === 'confirmed' ? 'green' : 'gray')
                    ];
                });

            // Add more activity types if needed (e.g., payments when implemented)

            $activities = collect($recentBookings)
                ->sortByDesc('timestamp')
                ->take(10)
                ->values();

            return response()->json($activities, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch recent activities',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get upcoming payments/check-outs for tenant
     */
    public function getUpcomingPayments()
    {
        try {
            $tenantId = Auth::id();

            // Get bookings with upcoming end dates (next 30 days)
            $upcomingCheckouts = Booking::where('tenant_id', $tenantId)
                ->where('status', 'confirmed')
                ->whereBetween('end_date', [now(), now()->addDays(30)])
                ->with(['property', 'room'])
                ->orderBy('end_date', 'asc')
                ->get()
                ->map(function ($booking) {
                    $daysLeft = now()->diffInDays($booking->end_date, false);
                    
                    return [
                        'id' => $booking->id,
                        'propertyTitle' => $booking->property->title,
                        'roomNumber' => $booking->room->room_number,
                        'endDate' => $booking->end_date->format('Y-m-d'),
                        'daysLeft' => (int) $daysLeft,
                        'amount' => (float) $booking->monthly_rent,
                        'paymentStatus' => $booking->payment_status,
                        'urgency' => $daysLeft <= 7 ? 'high' : ($daysLeft <= 14 ? 'medium' : 'low')
                    ];
                });

            // Get unpaid bookings
            $unpaidBookings = Booking::where('tenant_id', $tenantId)
                ->where('status', 'confirmed')
                ->whereIn('payment_status', ['unpaid', 'partial'])
                ->with(['property', 'room'])
                ->orderBy('start_date', 'asc')
                ->get()
                ->map(function ($booking) {
                    return [
                        'id' => $booking->id,
                        'propertyTitle' => $booking->property->title,
                        'roomNumber' => $booking->room->room_number,
                        'dueDate' => $booking->start_date->format('Y-m-d'),
                        'amount' => (float) $booking->total_amount,
                        'paymentStatus' => $booking->payment_status,
                        'type' => 'payment'
                    ];
                });

            return response()->json([
                'upcomingCheckouts' => $upcomingCheckouts,
                'unpaidBookings' => $unpaidBookings
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch upcoming payments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get the current active stay/booking for the tenant
     * This is the main endpoint for the "My Stay" dashboard
     */
    public function getCurrentStay()
    {
        try {
            $tenantId = Auth::id();
            $today = now();

            // Find the active booking (confirmed and within date range)
            $booking = Booking::where('tenant_id', $tenantId)
                ->where('status', 'confirmed')
                ->where('start_date', '<=', $today)
                ->where('end_date', '>=', $today)
                ->with([
                    'room.images',
                    'property.landlord',
                    'property.images',
                    'landlord',
                    'review',
                    'addons' => function ($query) {
                        $query->wherePivotIn('status', ['approved', 'active', 'pending']);
                    },
                    'payments' => function ($query) {
                        $query->orderBy('payment_date', 'desc');
                    },
                    'invoices' => function ($query) {
                        $query->orderBy('due_date', 'desc');
                    }
                ])
                ->first();

            if (!$booking) {
                // Check if there's an upcoming confirmed booking
                $upcomingBooking = Booking::where('tenant_id', $tenantId)
                    ->where('status', 'confirmed')
                    ->where('start_date', '>', $today)
                    ->with(['room', 'property.landlord', 'landlord'])
                    ->orderBy('start_date', 'asc')
                    ->first();

                return response()->json([
                    'hasActiveStay' => false,
                    'upcomingBooking' => $upcomingBooking ? [
                        'id' => $upcomingBooking->id,
                        'property' => $upcomingBooking->property->title,
                        'room' => $upcomingBooking->room->room_number,
                        'startDate' => $upcomingBooking->start_date->format('Y-m-d'),
                        'daysUntil' => $today->diffInDays($upcomingBooking->start_date)
                    ] : null
                ], 200);
            }

            // Calculate addon totals
            $monthlyAddonTotal = $booking->addons
                ->where('price_type', 'monthly')
                ->whereIn('pivot.status', ['active'])
                ->sum(function ($addon) {
                    return $addon->pivot->price_at_booking * $addon->pivot->quantity;
                });

            $pendingAddonCount = $booking->addons
                ->where('pivot.status', 'pending')
                ->count();

            // Get available addons for this property (that tenant hasn't requested)
            $requestedAddonIds = $booking->addons->pluck('id')->toArray();
            $availableAddons = Addon::where('property_id', $booking->property_id)
                ->where('is_active', true)
                ->whereNotIn('id', $requestedAddonIds)
                ->get()
                ->map(function ($addon) {
                    return [
                        'id' => $addon->id,
                        'name' => $addon->name,
                        'description' => $addon->description,
                        'price' => (float) $addon->price,
                        'priceType' => $addon->price_type,
                        'priceTypeLabel' => $addon->price_type_label,
                        'addonType' => $addon->addon_type,
                        'addonTypeLabel' => $addon->addon_type_label,
                        'hasStock' => $addon->hasStock(),
                        'stock' => $addon->stock
                    ];
                });

            // Format addons by category
            $activeAddons = $booking->addons
                ->whereIn('pivot.status', ['active', 'approved'])
                ->map(function ($addon) {
                    return [
                        'id' => $addon->id,
                        'pivotId' => $addon->pivot->id,
                        'name' => $addon->name,
                        'price' => (float) $addon->pivot->price_at_booking,
                        'quantity' => $addon->pivot->quantity,
                        'priceType' => $addon->price_type,
                        'priceTypeLabel' => $addon->price_type_label,
                        'addonType' => $addon->addon_type,
                        'status' => $addon->pivot->status,
                        'approvedAt' => $addon->pivot->approved_at
                    ];
                });

            $pendingAddons = $booking->addons
                ->where('pivot.status', 'pending')
                ->map(function ($addon) {
                    return [
                        'id' => $addon->id,
                        'pivotId' => $addon->pivot->id,
                        'name' => $addon->name,
                        'price' => (float) $addon->pivot->price_at_booking,
                        'quantity' => $addon->pivot->quantity,
                        'priceType' => $addon->price_type,
                        'priceTypeLabel' => $addon->price_type_label,
                        'addonType' => $addon->addon_type,
                        'status' => $addon->pivot->status,
                        'requestNote' => $addon->pivot->request_note,
                        'requestedAt' => $addon->pivot->created_at
                    ];
                });

            return response()->json([
                'hasActiveStay' => true,
                'booking' => [
                    'id' => $booking->id,
                    'bookingReference' => $booking->booking_reference,
                    'startDate' => $booking->start_date->format('Y-m-d'),
                    'endDate' => $booking->end_date->format('Y-m-d'),
                    'totalMonths' => $booking->total_months,
                    'monthlyRent' => (float) $booking->monthly_rent,
                    'totalAmount' => (float) $booking->total_amount,
                    'paymentStatus' => $booking->payment_status,
                    'hasReview' => (bool) $booking->review,
                    'daysRemaining' => $today->diffInDays($booking->end_date),
                    'monthsRemaining' => $today->diffInMonths($booking->end_date)
                ],
                'room' => [
                    'id' => $booking->room->id,
                    'roomNumber' => $booking->room->room_number,
                    'roomType' => $booking->room->room_type ?? null,
                    'floor' => $booking->room->floor_level ?? null,
                    'images' => $booking->room->images ?? []
                ],
                'property' => [
                    'id' => $booking->property->id,
                    'title' => $booking->property->title,
                    'address' => $booking->property->full_address,
                    'image' => $booking->property->image_url
                ],
                'landlord' => [
                    'id' => $booking->landlord->id,
                    'name' => $booking->landlord->name,
                    'email' => $booking->landlord->email,
                    'phone' => $booking->landlord->phone_number ?? null
                ],
                'addons' => [
                    'active' => $activeAddons->values(),
                    'pending' => $pendingAddons->values(),
                    'available' => $availableAddons,
                    'monthlyTotal' => (float) $monthlyAddonTotal,
                    'pendingCount' => $pendingAddonCount
                ],
                'financials' => [
                    'monthlyRent' => (float) $booking->monthly_rent,
                    'monthlyAddons' => (float) $monthlyAddonTotal,
                    'monthlyTotal' => (float) ($booking->monthly_rent + $monthlyAddonTotal),
                    'payments' => $booking->payments->take(5)->map(function ($payment) {
                        return [
                            'id' => $payment->id,
                            'amount' => (float) $payment->amount,
                            'status' => $payment->status,
                            'paymentDate' => $payment->payment_date,
                            'paymentMethod' => $payment->payment_method ?? null
                        ];
                    }),
                    'invoices' => $booking->invoices->take(5)->map(function ($invoice) {
                        return [
                            'id' => $invoice->id,
                            'amount' => (float) ($invoice->total_cents / 100),
                            'status' => $invoice->status,
                            'dueDate' => $invoice->due_date,
                            'description' => $invoice->description ?? null
                        ];
                    })
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch current stay',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get booking history (completed/past bookings)
     */
    public function getHistory()
    {
        try {
            $tenantId = Auth::id();
            $today = now();

            // Get all past bookings (ended or cancelled)
            $pastBookings = Booking::where('tenant_id', $tenantId)
                ->where(function ($query) use ($today) {
                    $query->where('end_date', '<', $today)
                          ->orWhere('status', 'cancelled')
                          ->orWhere('status', 'completed');
                })
                ->with([
                    'room',
                    'property',
                    'landlord',
                    'addons' => function ($query) {
                        $query->wherePivotIn('status', ['active', 'completed']);
                    },
                    'payments',
                    'invoices',
                    'review'
                ])
                ->orderBy('end_date', 'desc')
                ->paginate(10);

            $formattedBookings = $pastBookings->getCollection()->map(function ($booking) {
                $totalPaid = $booking->payments->where('status', 'completed')->sum('amount');
                $addonTotal = $booking->addons->sum(function ($addon) {
                    return $addon->pivot->price_at_booking * $addon->pivot->quantity;
                });

                return [
                    'id' => $booking->id,
                    'bookingReference' => $booking->booking_reference,
                    'property' => [
                        'id' => $booking->property->id,
                        'title' => $booking->property->title,
                        'image' => $booking->property->image_url
                    ],
                    'room' => [
                        'id' => $booking->room->id,
                        'roomNumber' => $booking->room->room_number
                    ],
                    'landlord' => [
                        'name' => $booking->landlord->name
                    ],
                    'period' => [
                        'startDate' => $booking->start_date->format('Y-m-d'),
                        'endDate' => $booking->end_date->format('Y-m-d'),
                        'totalMonths' => $booking->total_months
                    ],
                    'status' => $booking->status,
                    'financials' => [
                        'monthlyRent' => (float) $booking->monthly_rent,
                        'totalAmount' => (float) $booking->total_amount,
                        'addonTotal' => (float) $addonTotal,
                        'totalPaid' => (float) $totalPaid,
                        'paymentsCount' => $booking->payments->count()
                    ],
                    'addons' => $booking->addons->map(function ($addon) {
                        return [
                            'name' => $addon->name,
                            'price' => (float) $addon->pivot->price_at_booking,
                            'priceType' => $addon->price_type
                        ];
                    }),
                    'cancelledAt' => $booking->cancelled_at,
                    'cancellationReason' => $booking->cancellation_reason,
                    'review' => $booking->review ? ['id' => $booking->review->id, 'rating' => $booking->review->rating] : null
                ];
            });

            return response()->json([
                'bookings' => $formattedBookings,
                'pagination' => [
                    'currentPage' => $pastBookings->currentPage(),
                    'lastPage' => $pastBookings->lastPage(),
                    'perPage' => $pastBookings->perPage(),
                    'total' => $pastBookings->total()
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch booking history',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available addons for current active booking (tenant)
     */
    public function getAvailableAddons()
    {
        try {
            $tenantId = Auth::id();
            $today = now();

            $booking = Booking::where('tenant_id', $tenantId)
                ->where('status', 'confirmed')
                ->where('start_date', '<=', $today)
                ->where('end_date', '>=', $today)
                ->first();

            if (!$booking) {
                return response()->json(['message' => 'No active booking found'], 404);
            }

            $requestedAddonIds = $booking->addons->pluck('id')->toArray();
            $availableAddons = Addon::where('property_id', $booking->property_id)
                ->where('is_active', true)
                ->whereNotIn('id', $requestedAddonIds)
                ->get()
                ->map(function ($addon) {
                    return [
                        'id' => $addon->id,
                        'name' => $addon->name,
                        'description' => $addon->description,
                        'price' => (float) $addon->price,
                        'price_type' => $addon->price_type,
                        'addon_type' => $addon->addon_type,
                        'has_stock' => $addon->hasStock(),
                        'stock' => $addon->stock
                    ];
                });

            return response()->json(['available' => $availableAddons], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch available addons', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get addon requests (pending/active) for current active booking
     */
    public function getAddonRequests()
    {
        try {
            $tenantId = Auth::id();
            $today = now();

            $booking = Booking::where('tenant_id', $tenantId)
                ->where('status', 'confirmed')
                ->where('start_date', '<=', $today)
                ->where('end_date', '>=', $today)
                ->with(['addons'])
                ->first();

            if (!$booking) {
                return response()->json(['message' => 'No active booking found'], 404);
            }

            $pending = $booking->addons
                ->where('pivot.status', 'pending')
                ->map(function ($addon) {
                    return [
                        'id' => $addon->id,
                        'pivot_id' => $addon->pivot->id,
                        'name' => $addon->name,
                        'quantity' => $addon->pivot->quantity,
                        'price' => (float) $addon->pivot->price_at_booking,
                        'request_note' => $addon->pivot->request_note,
                        'requested_at' => $addon->pivot->created_at
                    ];
                })->values();

            $active = $booking->addons
                ->whereIn('pivot.status', ['active', 'approved'])
                ->map(function ($addon) {
                    return [
                        'id' => $addon->id,
                        'pivot_id' => $addon->pivot->id,
                        'name' => $addon->name,
                        'quantity' => $addon->pivot->quantity,
                        'price' => (float) $addon->pivot->price_at_booking,
                        'status' => $addon->pivot->status,
                        'approved_at' => $addon->pivot->approved_at
                    ];
                })->values();

            return response()->json(['pending' => $pending, 'active' => $active], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch addon requests', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Request an addon for the current booking
     */
    public function requestAddon(Request $request)
    {
        try {
            $tenantId = Auth::id();
            $today = now();

            $request->validate([
                'addon_id' => 'required|exists:addons,id',
                'quantity' => 'integer|min:1|max:10',
                'note' => 'nullable|string|max:500'
            ]);

            // Get active booking
            $booking = Booking::where('tenant_id', $tenantId)
                ->where('status', 'confirmed')
                ->where('start_date', '<=', $today)
                ->where('end_date', '>=', $today)
                ->first();

            if (!$booking) {
                return response()->json([
                    'message' => 'No active booking found'
                ], 404);
            }

            // Get the addon and validate it belongs to the property
            $addon = Addon::where('id', $request->addon_id)
                ->where('property_id', $booking->property_id)
                ->where('is_active', true)
                ->first();

            if (!$addon) {
                return response()->json([
                    'message' => 'Addon not found or not available for this property'
                ], 404);
            }

            // Check if already requested
            $existingRequest = $booking->addons()
                ->where('addon_id', $addon->id)
                ->wherePivotNotIn('status', ['rejected', 'cancelled', 'completed'])
                ->first();

            if ($existingRequest) {
                return response()->json([
                    'message' => 'You already have an active request for this addon'
                ], 422);
            }

            // Check stock for rentals
            if ($addon->addon_type === 'rental' && !$addon->hasStock()) {
                return response()->json([
                    'message' => 'This addon is currently out of stock'
                ], 422);
            }

            // Create the addon request
            $booking->addons()->attach($addon->id, [
                'quantity' => $request->quantity ?? 1,
                'price_at_booking' => $addon->price,
                'status' => 'pending',
                'request_note' => $request->note,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'message' => 'Addon request submitted successfully',
                'addon' => [
                    'id' => $addon->id,
                    'name' => $addon->name,
                    'price' => (float) $addon->price,
                    'priceType' => $addon->price_type,
                    'status' => 'pending'
                ]
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to request addon',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel a pending addon request
     */
    public function cancelAddonRequest(Request $request, $addonId)
    {
        try {
            $tenantId = Auth::id();
            $today = now();

            // Get active booking
            $booking = Booking::where('tenant_id', $tenantId)
                ->where('status', 'confirmed')
                ->where('start_date', '<=', $today)
                ->where('end_date', '>=', $today)
                ->first();

            if (!$booking) {
                return response()->json([
                    'message' => 'No active booking found'
                ], 404);
            }

            // Find the pending addon request
            $addonRequest = $booking->addons()
                ->where('addon_id', $addonId)
                ->wherePivot('status', 'pending')
                ->first();

            if (!$addonRequest) {
                return response()->json([
                    'message' => 'No pending request found for this addon'
                ], 404);
            }

            // Update status to cancelled
            $booking->addons()->updateExistingPivot($addonId, [
                'status' => 'cancelled',
                'updated_at' => now()
            ]);

            return response()->json([
                'message' => 'Addon request cancelled successfully'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to cancel addon request',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}