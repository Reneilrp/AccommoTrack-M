<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;

use App\Services\TenantDashboardService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TenantDashboardController extends Controller
{
    protected TenantDashboardService $dashboardService;

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
                    'description' => 'Your booking for ' . $booking->property->title . ' - Room ' . $booking->room->room_number . ' is ' . $booking->status,
                    'status' => $booking->status, 'timestamp' => $booking->created_at, 'icon' => 'calendar',
                    'color' => $booking->status === 'pending' ? 'yellow' : ($booking->status === 'confirmed' ? 'green' : 'gray')
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
                $daysLeft = now()->diffInDays($booking->end_date, false);
                return [
                    'id' => $booking->id, 'propertyTitle' => $booking->property->title, 'roomNumber' => $booking->room->room_number,
                    'endDate' => $booking->end_date->format('Y-m-d'), 'daysLeft' => (int) $daysLeft,
                    'amount' => (float) $booking->monthly_rent, 'paymentStatus' => $booking->payment_status,
                    'urgency' => $daysLeft <= 7 ? 'high' : ($daysLeft <= 14 ? 'medium' : 'low')
                ];
            });

            $unpaidBookings = $data['unpaidBookings']->map(function ($booking) {
                return [
                    'id' => $booking->id, 'propertyTitle' => $booking->property->title, 'roomNumber' => $booking->room->room_number,
                    'dueDate' => $booking->start_date->format('Y-m-d'), 'amount' => (float) $booking->total_amount,
                    'paymentStatus' => $booking->payment_status, 'type' => 'payment'
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
            $booking = $this->dashboardService->getCurrentStay($tenantId);

            if (!$booking) {
                $upcomingBooking = $this->dashboardService->getUpcomingBooking($tenantId);
                return response()->json([
                    'hasActiveStay' => false,
                    'upcomingBooking' => $upcomingBooking ? [
                        'id' => $upcomingBooking->id, 'property' => $upcomingBooking->property->title,
                        'room' => $upcomingBooking->room->room_number, 'startDate' => $upcomingBooking->start_date->format('Y-m-d'),
                        'daysUntil' => now()->diffInDays($upcomingBooking->start_date)
                    ] : null
                ], 200);
            }

            $monthlyAddonTotal = $booking->addons->where('price_type', 'monthly')->whereIn('pivot.status', ['active'])->sum(fn ($a) => $a->pivot->price_at_booking * $a->pivot->quantity);
            $availableAddons = $this->dashboardService->getAvailableAddonsForActiveBooking($tenantId);

            return response()->json([
                'hasActiveStay' => true,
                'booking' => [
                    'id' => $booking->id, 'bookingReference' => $booking->booking_reference,
                    'startDate' => $booking->start_date->format('Y-m-d'), 'endDate' => $booking->end_date->format('Y-m-d'),
                    'totalMonths' => $booking->total_months, 'monthlyRent' => (float) $booking->monthly_rent,
                    'totalAmount' => (float) $booking->total_amount, 'paymentStatus' => $booking->payment_status,
                    'hasReview' => (bool) $booking->review, 'daysRemaining' => now()->diffInDays($booking->end_date),
                    'monthsRemaining' => now()->diffInMonths($booking->end_date)
                ],
                'room' => ['id' => $booking->room->id, 'roomNumber' => $booking->room->room_number, 'roomType' => $booking->room->room_type ?? null, 'floor' => $booking->room->floor_level ?? null, 'images' => $booking->room->images ?? []],
                'property' => ['id' => $booking->property->id, 'title' => $booking->property->title, 'address' => $booking->property->full_address, 'image' => $booking->property->image_url],
                'landlord' => ['id' => $booking->landlord->id, 'name' => $booking->landlord->name, 'email' => $booking->landlord->email, 'phone' => $booking->landlord->phone_number ?? null],
                'addons' => [
                    'active' => $booking->addons->whereIn('pivot.status', ['active', 'approved'])->values(),
                    'pending' => $booking->addons->where('pivot.status', 'pending')->values(),
                    'available' => $availableAddons, 'monthlyTotal' => (float) $monthlyAddonTotal,
                    'pendingCount' => $booking->addons->where('pivot.status', 'pending')->count()
                ],
                'financials' => [
                    'monthlyRent' => (float) $booking->monthly_rent, 'monthlyAddons' => (float) $monthlyAddonTotal,
                    'monthlyTotal' => (float) ($booking->monthly_rent + $monthlyAddonTotal),
                    'invoices' => $booking->invoices
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch current stay', 'error' => $e->getMessage()], 500);
        }
    }

    public function getHistory()
    {
        try {
            $pastBookings = $this->dashboardService->getHistory(Auth::id());
            $formattedBookings = $pastBookings->getCollection()->map(function ($booking) {
                $totalPaid = $booking->payments->where('status', 'completed')->sum('amount');
                $addonTotal = $booking->addons->sum(fn ($a) => $a->pivot->price_at_booking * $a->pivot->quantity);
                return [
                    'id' => $booking->id, 'bookingReference' => $booking->booking_reference,
                    'property' => ['id' => $booking->property->id, 'title' => $booking->property->title, 'image' => $booking->property->image_url],
                    'room' => ['id' => $booking->room->id, 'roomNumber' => $booking->room->room_number],
                    'landlord' => ['name' => $booking->landlord->name],
                    'period' => ['startDate' => $booking->start_date->format('Y-m-d'), 'endDate' => $booking->end_date->format('Y-m-d'), 'totalMonths' => $booking->total_months],
                    'status' => $booking->status,
                    'financials' => ['monthlyRent' => (float) $booking->monthly_rent, 'totalAmount' => (float) $booking->total_amount, 'addonTotal' => (float) $addonTotal, 'totalPaid' => (float) $totalPaid, 'paymentsCount' => $booking->payments->count()],
                    'addons' => $booking->addons->map(fn($a) => ['name' => $a->name, 'price' => (float) $a->pivot->price_at_booking, 'priceType' => $a->price_type]),
                    'cancelledAt' => $booking->cancelled_at, 'cancellationReason' => $booking->cancellation_reason,
                    'review' => $booking->review ? ['id' => $booking->review->id, 'rating' => $booking->review->rating] : null
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
            if (!$booking) {
                return response()->json(['message' => 'No active booking found'], 404);
            }
            return response()->json([
                'pending' => $booking->addons->where('pivot.status', 'pending')->values(),
                'active' => $booking->addons->whereIn('pivot.status', ['active', 'approved'])->values()
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch addon requests', 'error' => $e->getMessage()], 500);
        }
    }

    public function requestAddon(Request $request)
    {
        try {
            $validated = $request->validate([
                'addon_id' => 'required|exists:addons,id',
                'quantity' => 'integer|min:1|max:10',
                'note' => 'nullable|string|max:500'
            ]);
            $addon = $this->dashboardService->requestAddonForActiveBooking(Auth::id(), $validated);
            return response()->json(['message' => 'Addon request submitted successfully', 'addon' => $addon], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() >= 400 && $e->getCode() < 500 ? $e->getCode() : 500);
        }
    }

    public function cancelAddonRequest(Request $request, $addonId)
    {
        try {
            $this->dashboardService->cancelAddonRequestForActiveBooking(Auth::id(), $addonId);
            return response()->json(['message' => 'Addon request cancelled successfully'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() >= 400 && $e->getCode() < 500 ? $e->getCode() : 500);
        }
    }
}