<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Property;
use App\Models\Room;
use App\Models\Booking;
use App\Models\User;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    /**
     * Get comprehensive analytics dashboard data
     */
    public function getDashboardAnalytics(Request $request)
    {
        try {
            $landlordId = Auth::id();
            $propertyId = $request->query('property_id'); 
            $timeRange = $request->query('time_range', 'month');

            // Date range calculation
            $dateRange = $this->getDateRange($timeRange);

            $data = [
                'overview' => $this->calculateOverviewStats($landlordId, $propertyId),
                'revenue' => $this->calculateRevenueAnalytics($landlordId, $propertyId, $dateRange),
                'occupancy' => $this->calculateOccupancyAnalytics($landlordId, $propertyId),
                'roomTypes' => $this->calculateRoomTypeAnalytics($landlordId, $propertyId),
                'properties' => $this->calculatePropertyComparison($landlordId),
                'tenants' => $this->calculateTenantAnalytics($landlordId, $propertyId, $dateRange),
                'payments' => $this->calculatePaymentAnalytics($landlordId, $propertyId),
                'bookings' => $this->calculateBookingAnalytics($landlordId, $propertyId, $dateRange),
            ];

            return response()->json($data, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Overview Statistics (Public endpoint)
     */
    public function getOverviewStats(Request $request)
    {
        try {
            $landlordId = Auth::id();
            $propertyId = $request->query('property_id');
            
            $data = $this->calculateOverviewStats($landlordId, $propertyId);
            
            return response()->json($data, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch overview stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Revenue Analytics (Public endpoint)
     */
    public function getRevenueAnalytics(Request $request)
    {
        try {
            $landlordId = Auth::id();
            $propertyId = $request->query('property_id');
            $timeRange = $request->query('time_range', 'month');
            $dateRange = $this->getDateRange($timeRange);
            
            $data = $this->calculateRevenueAnalytics($landlordId, $propertyId, $dateRange);
            
            return response()->json($data, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch revenue analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Occupancy Analytics (Public endpoint)
     */
    public function getOccupancyAnalytics(Request $request)
    {
        try {
            $landlordId = Auth::id();
            $propertyId = $request->query('property_id');
            
            $data = $this->calculateOccupancyAnalytics($landlordId, $propertyId);
            
            return response()->json($data, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch occupancy analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Room Type Analytics (Public endpoint)
     */
    public function getRoomTypeAnalytics(Request $request)
    {
        try {
            $landlordId = Auth::id();
            $propertyId = $request->query('property_id');
            
            $data = $this->calculateRoomTypeAnalytics($landlordId, $propertyId);
            
            return response()->json($data, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch room type analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Property Comparison (Public endpoint)
     */
    public function getPropertyComparison(Request $request)
    {
        try {
            $landlordId = Auth::id();
            
            $data = $this->calculatePropertyComparison($landlordId);
            
            return response()->json($data, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch property comparison',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Tenant Analytics (Public endpoint)
     */
    public function getTenantAnalytics(Request $request)
    {
        try {
            $landlordId = Auth::id();
            $propertyId = $request->query('property_id');
            $timeRange = $request->query('time_range', 'month');
            $dateRange = $this->getDateRange($timeRange);
            
            $data = $this->calculateTenantAnalytics($landlordId, $propertyId, $dateRange);
            
            return response()->json($data, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch tenant analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Payment Analytics (Public endpoint)
     */
    public function getPaymentAnalytics(Request $request)
    {
        try {
            $landlordId = Auth::id();
            $propertyId = $request->query('property_id');
            
            $data = $this->calculatePaymentAnalytics($landlordId, $propertyId);
            
            return response()->json($data, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch payment analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Booking Analytics (Public endpoint)
     */
    public function getBookingAnalytics(Request $request)
    {
        try {
            $landlordId = Auth::id();
            $propertyId = $request->query('property_id');
            $timeRange = $request->query('time_range', 'month');
            $dateRange = $this->getDateRange($timeRange);
            
            $data = $this->calculateBookingAnalytics($landlordId, $propertyId, $dateRange);
            
            return response()->json($data, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch booking analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ====================================================================
    // PRIVATE CALCULATION METHODS
    // ====================================================================

    /**
     * Calculate Overview Statistics
     */
    private function calculateOverviewStats($landlordId, $propertyId = null)
    {
        $query = Property::where('landlord_id', $landlordId);
        if ($propertyId) {
            $query->where('id', $propertyId);
        }

        $properties = $query->with('rooms')->get();

        $totalRooms = $properties->sum('total_rooms');
        $occupiedRooms = $properties->sum(function($property) {
            return $property->rooms->where('status', 'occupied')->count();
        });
        $availableRooms = $properties->sum('available_rooms');
        $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0;

        // Revenue calculation (from bookings)
        $bookingsQuery = Booking::where('landlord_id', $landlordId)
            ->whereIn('status', ['confirmed', 'completed', 'partial-completed']);
        
        if ($propertyId) {
            $bookingsQuery->where('property_id', $propertyId);
        }

        $totalRevenue = $bookingsQuery->sum('total_amount');
        $monthlyRevenue = (clone $bookingsQuery)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('total_amount');

        // Tenant stats
        $activeTenants = User::where('role', 'tenant')
            ->whereHas('room', function($q) use ($landlordId, $propertyId) {
                $q->whereHas('property', function($q2) use ($landlordId, $propertyId) {
                    $q2->where('landlord_id', $landlordId);
                    if ($propertyId) {
                        $q2->where('id', $propertyId);
                    }
                });
            })
            ->count();

        // New tenants this month
        $newTenants = User::where('role', 'tenant')
            ->whereHas('tenantProfile', function($q) {
                $q->where('status', 'active')
                  ->whereMonth('move_in_date', now()->month)
                  ->whereYear('move_in_date', now()->year);
            })
            ->whereHas('room.property', function($q) use ($landlordId, $propertyId) {
                $q->where('landlord_id', $landlordId);
                if ($propertyId) {
                    $q->where('id', $propertyId);
                }
            })
            ->count();

        return [
            'total_properties' => $properties->count(),
            'total_rooms' => $totalRooms,
            'occupied_rooms' => $occupiedRooms,
            'available_rooms' => $availableRooms,
            'occupancy_rate' => $occupancyRate,
            'total_revenue' => round($totalRevenue, 2),
            'monthly_revenue' => round($monthlyRevenue, 2),
            'active_tenants' => $activeTenants,
            'new_tenants_this_month' => $newTenants,
        ];
    }

    /**
     * Calculate Revenue Analytics with trends
     */
    private function calculateRevenueAnalytics($landlordId, $propertyId, $dateRange)
    {
        $query = Booking::where('landlord_id', $landlordId)
            ->whereIn('status', ['confirmed', 'completed', 'partial-completed'])
            ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        // Group by month for trends
        $monthlyRevenue = (clone $query)
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                DB::raw('SUM(total_amount) as revenue')
            )
            ->groupBy('month')
            ->orderBy('month', 'asc')
            ->get()
            ->map(function($item) {
                return [
                    'month' => Carbon::parse($item->month)->format('M Y'),
                    'revenue' => round($item->revenue, 2)
                ];
            });

        // Expected vs Actual
        $expectedRevenue = Room::whereHas('property', function($q) use ($landlordId, $propertyId) {
                $q->where('landlord_id', $landlordId);
                if ($propertyId) {
                    $q->where('id', $propertyId);
                }
            })
            ->where('status', 'occupied')
            ->sum('monthly_rate');

        $actualRevenue = $query->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('total_amount');

        return [
            'monthly_trend' => $monthlyRevenue,
            'expected_monthly' => round($expectedRevenue, 2),
            'actual_monthly' => round($actualRevenue, 2),
            'collection_rate' => $expectedRevenue > 0 ? round(($actualRevenue / $expectedRevenue) * 100, 1) : 0
        ];
    }

    /**
     * Calculate Occupancy Analytics
     */
    private function calculateOccupancyAnalytics($landlordId, $propertyId)
    {
        $query = Room::whereHas('property', function($q) use ($landlordId, $propertyId) {
            $q->where('landlord_id', $landlordId);
            if ($propertyId) {
                $q->where('id', $propertyId);
            }
        });

        $total = $query->count();
        $occupied = (clone $query)->where('status', 'occupied')->count();
        $available = (clone $query)->where('status', 'available')->count();
        $maintenance = (clone $query)->where('status', 'maintenance')->count();

        return [
            'total' => $total,
            'occupied' => $occupied,
            'available' => $available,
            'maintenance' => $maintenance,
            'occupancy_rate' => $total > 0 ? round(($occupied / $total) * 100, 1) : 0,
        ];
    }

    /**
     * Calculate Room Type Performance Analytics
     */
    private function calculateRoomTypeAnalytics($landlordId, $propertyId)
    {
        $query = Room::whereHas('property', function($q) use ($landlordId, $propertyId) {
            $q->where('landlord_id', $landlordId);
            if ($propertyId) {
                $q->where('id', $propertyId);
            }
        });

        $roomTypes = $query->select(
                'room_type',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN status = "occupied" THEN 1 ELSE 0 END) as occupied'),
                DB::raw('SUM(CASE WHEN status = "available" THEN 1 ELSE 0 END) as available'),
                DB::raw('SUM(CASE WHEN status = "occupied" THEN monthly_rate ELSE 0 END) as revenue')
            )
            ->groupBy('room_type')
            ->get()
            ->map(function($item) {
                return [
                    'type' => $this->getRoomTypeLabel($item->room_type),
                    'type_key' => $item->room_type,
                    'total' => $item->total,
                    'occupied' => $item->occupied,
                    'available' => $item->available,
                    'revenue' => round($item->revenue, 2),
                    'occupancy_rate' => $item->total > 0 ? round(($item->occupied / $item->total) * 100, 1) : 0
                ];
            });

        return $roomTypes;
    }

    /**
     * Calculate Property Comparison
     */
    private function calculatePropertyComparison($landlordId)
    {
        $properties = Property::where('landlord_id', $landlordId)
            ->with('rooms')
            ->get()
            ->map(function($property) {
                $totalRooms = $property->rooms->count();
                $occupiedRooms = $property->rooms->where('status', 'occupied')->count();
                $revenue = $property->rooms->where('status', 'occupied')->sum('monthly_rate');

                return [
                    'id' => $property->id,
                    'name' => $property->title,
                    'total_rooms' => $totalRooms,
                    'occupied_rooms' => $occupiedRooms,
                    'available_rooms' => $property->available_rooms,
                    'occupancy_rate' => $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0,
                    'monthly_revenue' => round($revenue, 2),
                ];
            });

        return $properties;
    }

    /**
     * Calculate Tenant Analytics
     */
    private function calculateTenantAnalytics($landlordId, $propertyId, $dateRange)
    {
        $baseQuery = User::where('role', 'tenant')
            ->whereHas('room.property', function($q) use ($landlordId, $propertyId) {
                $q->where('landlord_id', $landlordId);
                if ($propertyId) {
                    $q->where('id', $propertyId);
                }
            });

        $activeTenants = (clone $baseQuery)
            ->whereHas('tenantProfile', function($q) {
                $q->where('status', 'active');
            })
            ->count();

        $inactiveTenants = (clone $baseQuery)
            ->whereHas('tenantProfile', function($q) {
                $q->where('status', 'inactive');
            })
            ->count();

        // Move-ins this period
        $moveIns = (clone $baseQuery)
            ->whereHas('tenantProfile', function($q) use ($dateRange) {
                $q->whereBetween('move_in_date', [$dateRange['start'], $dateRange['end']]);
            })
            ->count();

        // Move-outs this period
        $moveOuts = User::where('role', 'tenant')
            ->whereHas('tenantProfile', function($q) use ($dateRange) {
                $q->where('status', 'inactive')
                  ->whereBetween('move_out_date', [$dateRange['start'], $dateRange['end']]);
            })
            ->count();

        // Average stay duration (in months)
        $avgStayDuration = DB::table('tenant_profiles')
            ->whereNotNull('move_in_date')
            ->whereNotNull('move_out_date')
            ->selectRaw('AVG(TIMESTAMPDIFF(MONTH, move_in_date, move_out_date)) as avg_months')
            ->value('avg_months');

        return [
            'active' => $activeTenants,
            'inactive' => $inactiveTenants,
            'move_ins' => $moveIns,
            'move_outs' => $moveOuts,
            'average_stay_months' => round($avgStayDuration ?? 0, 1),
        ];
    }

    /**
     * Calculate Payment Analytics
     */
    private function calculatePaymentAnalytics($landlordId, $propertyId)
    {
        $query = Booking::where('landlord_id', $landlordId);
        
        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        $paid = (clone $query)->where('payment_status', 'paid')->count();
        $unpaid = (clone $query)->where('payment_status', 'unpaid')->count();
        $partial = (clone $query)->where('payment_status', 'partial')->count();
        $overdue = (clone $query)
            ->where('payment_status', 'unpaid')
            ->where('end_date', '<', now())
            ->count();

        $total = $paid + $unpaid + $partial;

        return [
            'paid' => $paid,
            'unpaid' => $unpaid,
            'partial' => $partial,
            'overdue' => $overdue,
            'payment_rate' => $total > 0 ? round(($paid / $total) * 100, 1) : 0,
        ];
    }

    /**
     * Calculate Booking Analytics
     */
    private function calculateBookingAnalytics($landlordId, $propertyId, $dateRange)
    {
        $query = Booking::where('landlord_id', $landlordId)
            ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        $pending = (clone $query)->where('status', 'pending')->count();
        $confirmed = (clone $query)->where('status', 'confirmed')->count();
        $completed = (clone $query)->whereIn('status', ['completed', 'partial-completed'])->count();
        $cancelled = (clone $query)->where('status', 'cancelled')->count();

        return [
            'pending' => $pending,
            'confirmed' => $confirmed,
            'completed' => $completed,
            'cancelled' => $cancelled,
            'total' => $pending + $confirmed + $completed + $cancelled,
        ];
    }

    /**
     * Helper: Get date range based on time period
     */
    private function getDateRange($timeRange)
    {
        switch ($timeRange) {
            case 'week':
                return [
                    'start' => now()->startOfWeek(),
                    'end' => now()->endOfWeek()
                ];
            case 'year':
                return [
                    'start' => now()->startOfYear(),
                    'end' => now()->endOfYear()
                ];
            case 'month':
            default:
                return [
                    'start' => now()->startOfMonth(),
                    'end' => now()->endOfMonth()
                ];
        }
    }

    /**
     * Helper: Get room type label
     */
    private function getRoomTypeLabel($roomType)
    {
        return [
            'single' => 'Single Room',
            'double' => 'Double Room',
            'quad' => 'Quad Room',
            'bedSpacer' => 'Bed Spacer'
        ][$roomType] ?? ucfirst($roomType);
    }
}