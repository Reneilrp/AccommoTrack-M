<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Booking;
use App\Models\User;
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
}