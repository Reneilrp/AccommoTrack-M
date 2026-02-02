<?php

namespace App\Services;

use App\Models\Property;
use App\Models\Room;
use App\Models\Booking;
use App\Models\User;
use App\Models\TenantProfile;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnalyticsService
{
    /**
     * Get comprehensive dashboard analytics
     */
    public function getDashboardAnalytics(int $landlordId, ?int $propertyId = null, string $timeRange = 'month'): array
    {
        $dateRange = $this->getDateRange($timeRange);

        // Check if landlord has any properties first
        $hasProperties = Property::where('landlord_id', $landlordId)->exists();

        if (!$hasProperties) {
            // Return empty/default analytics structure
            return $this->getEmptyAnalytics();
        }

        return [
            'overview' => $this->calculateOverviewStats($landlordId, $propertyId),
            'revenue' => $this->calculateRevenueAnalytics($landlordId, $propertyId, $dateRange),
            'occupancy' => $this->calculateOccupancyAnalytics($landlordId, $propertyId),
            'roomTypes' => $this->calculateRoomTypeAnalytics($landlordId, $propertyId),
            'properties' => $this->calculatePropertyComparison($landlordId),
            'tenants' => $this->calculateTenantAnalytics($landlordId, $propertyId, $dateRange),
            'payments' => $this->calculatePaymentAnalytics($landlordId, $propertyId),
            'bookings' => $this->calculateBookingAnalytics($landlordId, $propertyId, $dateRange),
        ];
    }

    /**
     * Return empty analytics structure for landlords with no properties
     */
    protected function getEmptyAnalytics(): array
    {
        return [
            'overview' => [
                'total_properties' => 0,
                'total_rooms' => 0,
                'occupied_rooms' => 0,
                'available_rooms' => 0,
                'occupancy_rate' => 0,
                'total_revenue' => 0,
                'monthly_revenue' => 0,
                'active_tenants' => 0,
                'new_tenants_this_month' => 0,
            ],
            'revenue' => [
                'expected_monthly' => 0,
                'actual_monthly' => 0,
                'collection_rate' => 0,
                'monthly_trend' => [],
            ],
            'occupancy' => [
                'current_rate' => 0,
                'trend' => [],
            ],
            'roomTypes' => [],
            'properties' => [],
            'tenants' => [
                'total' => 0,
                'average_stay_months' => 0,
                'move_ins' => 0,
                'move_outs' => 0,
            ],
            'payments' => [
                'paid' => 0,
                'unpaid' => 0,
                'partial' => 0,
                'overdue' => 0,
                'payment_rate' => 0,
            ],
            'bookings' => [
                'total' => 0,
                'pending' => 0,
                'confirmed' => 0,
                'cancelled' => 0,
            ],
        ];
    }

    /**
     * Calculate date range based on time range parameter
     */
    public function getDateRange(string $timeRange): array
    {
        $end = Carbon::now();

        $start = match ($timeRange) {
            'week' => Carbon::now()->subWeek(),
            'month' => Carbon::now()->subMonth(),
            'quarter' => Carbon::now()->subQuarter(),
            'year' => Carbon::now()->subYear(),
            default => Carbon::now()->subMonth(),
        };

        return ['start' => $start, 'end' => $end];
    }

    /**
     * Calculate Overview Statistics
     */
    public function calculateOverviewStats(int $landlordId, ?int $propertyId = null): array
    {
        $query = Property::where('landlord_id', $landlordId);
        if ($propertyId) {
            $query->where('id', $propertyId);
        }

        $properties = $query->with('rooms')->get();

        $totalRooms = $properties->sum('total_rooms');
        $occupiedRooms = $properties->sum(fn($property) => $property->rooms->where('status', 'occupied')->count());
        $availableRooms = $properties->sum('available_rooms');
        $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0;

        // Revenue calculation
        $bookingsQuery = Booking::forLandlord($landlordId)->confirmed();

        if ($propertyId) {
            $bookingsQuery->where('property_id', $propertyId);
        }

        $totalRevenue = $bookingsQuery->sum('total_amount');
        $monthlyRevenue = (clone $bookingsQuery)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('total_amount');

        // Tenant stats
        $activeTenants = $this->countActiveTenants($landlordId, $propertyId);
        $newTenants = $this->countNewTenantsThisMonth($landlordId, $propertyId);

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
    public function calculateRevenueAnalytics(int $landlordId, ?int $propertyId, array $dateRange): array
    {
        $query = Booking::forLandlord($landlordId)
            ->confirmed()
            ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        // Monthly revenue trend
        $monthlyTrend = (clone $query)
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                DB::raw('SUM(total_amount) as revenue')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn($item) => [
                'month' => $item->month,
                'revenue' => (float) $item->revenue,
            ]);

        // Potential vs actual revenue
        $potentialRevenue = $this->calculatePotentialRevenue($landlordId, $propertyId);
        $actualRevenue = $query->sum('total_amount');

        return [
            'monthly_trend' => $monthlyTrend,
            'total_revenue' => round($actualRevenue, 2),
            'potential_revenue' => round($potentialRevenue, 2),
            'revenue_efficiency' => $potentialRevenue > 0
                ? round(($actualRevenue / $potentialRevenue) * 100, 1)
                : 0,
        ];
    }

    /**
     * Calculate Occupancy Analytics
     */
    public function calculateOccupancyAnalytics(int $landlordId, ?int $propertyId = null): array
    {
        $roomsQuery = Room::forLandlord($landlordId);

        if ($propertyId) {
            $roomsQuery->where('property_id', $propertyId);
        }

        $stats = $roomsQuery
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN status = "occupied" THEN 1 ELSE 0 END) as occupied'),
                DB::raw('SUM(CASE WHEN status = "available" THEN 1 ELSE 0 END) as available'),
                DB::raw('SUM(CASE WHEN status = "maintenance" THEN 1 ELSE 0 END) as maintenance')
            )
            ->first();

        $total = $stats->total ?? 0;
        $occupied = $stats->occupied ?? 0;

        return [
            'total_rooms' => $total,
            'occupied' => $occupied,
            'available' => $stats->available ?? 0,
            'maintenance' => $stats->maintenance ?? 0,
            'occupancy_rate' => $total > 0 ? round(($occupied / $total) * 100, 1) : 0,
        ];
    }

    /**
     * Calculate Room Type Analytics
     */
    public function calculateRoomTypeAnalytics(int $landlordId, ?int $propertyId = null): array
    {
        $query = Room::forLandlord($landlordId);

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        return $query
            ->select(
                'room_type',
                DB::raw('COUNT(*) as count'),
                DB::raw('AVG(monthly_rate) as avg_rate'),
                DB::raw('SUM(CASE WHEN status = "occupied" THEN 1 ELSE 0 END) as occupied')
            )
            ->groupBy('room_type')
            ->get()
            ->map(fn($item) => [
                'type' => $item->room_type,
                'label' => $this->getRoomTypeLabel($item->room_type),
                'count' => $item->count,
                'avg_rate' => round($item->avg_rate, 2),
                'occupied' => $item->occupied,
                'occupancy_rate' => $item->count > 0 ? round(($item->occupied / $item->count) * 100, 1) : 0,
            ])
            ->toArray();
    }

    /**
     * Calculate Property Comparison
     */
    public function calculatePropertyComparison(int $landlordId): array
    {
        return Property::where('landlord_id', $landlordId)
            ->withCount([
                'rooms',
                'rooms as occupied_rooms' => fn($q) => $q->where('status', 'occupied'),
                'rooms as available_rooms' => fn($q) => $q->where('status', 'available'),
            ])
            ->withSum(['bookings as total_revenue' => fn($q) => $q->whereIn('status', ['confirmed', 'completed'])], 'total_amount')
            ->get()
            ->map(fn($property) => [
                'id' => $property->id,
                'title' => $property->title,
                'total_rooms' => $property->rooms_count,
                'occupied_rooms' => $property->occupied_rooms,
                'available_rooms' => $property->available_rooms,
                'occupancy_rate' => $property->rooms_count > 0
                    ? round(($property->occupied_rooms / $property->rooms_count) * 100, 1)
                    : 0,
                'total_revenue' => round($property->total_revenue ?? 0, 2),
            ])
            ->toArray();
    }

    /**
     * Calculate Tenant Analytics
     */
    public function calculateTenantAnalytics(int $landlordId, ?int $propertyId, array $dateRange): array
    {
        $activeTenants = $this->countActiveTenants($landlordId, $propertyId);
        $newTenants = $this->countNewTenantsThisMonth($landlordId, $propertyId);

        // Average stay duration
        $avgStayDuration = DB::table('tenant_profiles')
            ->join('bookings', 'tenant_profiles.booking_id', '=', 'bookings.id')
            ->where('bookings.landlord_id', $landlordId)
            ->when($propertyId, fn($q) => $q->where('bookings.property_id', $propertyId))
            ->whereNotNull('tenant_profiles.move_in_date')
            ->whereNotNull('tenant_profiles.move_out_date')
            ->selectRaw('AVG(TIMESTAMPDIFF(MONTH, tenant_profiles.move_in_date, tenant_profiles.move_out_date)) as avg_months')
            ->value('avg_months');

        return [
            'active_tenants' => $activeTenants,
            'new_tenants' => $newTenants,
            'avg_stay_duration_months' => round($avgStayDuration ?? 0, 1),
        ];
    }

    /**
     * Calculate Payment Analytics
     */
    public function calculatePaymentAnalytics(int $landlordId, ?int $propertyId = null): array
    {
        $query = Booking::forLandlord($landlordId);

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        $stats = $query
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN payment_status = "paid" THEN 1 ELSE 0 END) as paid'),
                DB::raw('SUM(CASE WHEN payment_status = "partial" THEN 1 ELSE 0 END) as partial'),
                DB::raw('SUM(CASE WHEN payment_status = "unpaid" THEN 1 ELSE 0 END) as unpaid'),
                DB::raw('SUM(CASE WHEN payment_status = "paid" THEN total_amount ELSE 0 END) as collected'),
                DB::raw('SUM(CASE WHEN payment_status IN ("unpaid", "partial") THEN total_amount ELSE 0 END) as outstanding')
            )
            ->first();

        return [
            'total_bookings' => $stats->total ?? 0,
            'paid_bookings' => $stats->paid ?? 0,
            'partial_bookings' => $stats->partial ?? 0,
            'unpaid_bookings' => $stats->unpaid ?? 0,
            'collected_amount' => round($stats->collected ?? 0, 2),
            'outstanding_amount' => round($stats->outstanding ?? 0, 2),
            'collection_rate' => ($stats->total ?? 0) > 0
                ? round((($stats->paid ?? 0) / $stats->total) * 100, 1)
                : 0,
        ];
    }

    /**
     * Calculate Booking Analytics
     */
    public function calculateBookingAnalytics(int $landlordId, ?int $propertyId, array $dateRange): array
    {
        $query = Booking::forLandlord($landlordId)
            ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        $stats = $query
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending'),
                DB::raw('SUM(CASE WHEN status = "confirmed" THEN 1 ELSE 0 END) as confirmed'),
                DB::raw('SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed'),
                DB::raw('SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as cancelled')
            )
            ->first();

        $total = $stats->total ?? 0;

        return [
            'total' => $total,
            'pending' => $stats->pending ?? 0,
            'confirmed' => $stats->confirmed ?? 0,
            'completed' => $stats->completed ?? 0,
            'cancelled' => $stats->cancelled ?? 0,
            'conversion_rate' => $total > 0
                ? round((($stats->confirmed ?? 0) + ($stats->completed ?? 0)) / $total * 100, 1)
                : 0,
        ];
    }

    /**
     * Helper: Count active tenants
     */
    protected function countActiveTenants(int $landlordId, ?int $propertyId = null): int
    {
        return User::where('role', 'tenant')
            ->whereHas('room', function ($q) use ($landlordId, $propertyId) {
                $q->whereHas('property', function ($q2) use ($landlordId, $propertyId) {
                    $q2->where('landlord_id', $landlordId);
                    if ($propertyId) {
                        $q2->where('id', $propertyId);
                    }
                });
            })
            ->count();
    }

    /**
     * Helper: Count new tenants this month
     */
    protected function countNewTenantsThisMonth(int $landlordId, ?int $propertyId = null): int
    {
        return User::where('role', 'tenant')
            ->whereHas('tenantProfile', function ($q) {
                $q->where('status', 'active')
                    ->whereMonth('move_in_date', now()->month)
                    ->whereYear('move_in_date', now()->year);
            })
            ->whereHas('room.property', function ($q) use ($landlordId, $propertyId) {
                $q->where('landlord_id', $landlordId);
                if ($propertyId) {
                    $q->where('id', $propertyId);
                }
            })
            ->count();
    }

    /**
     * Helper: Calculate potential revenue
     */
    protected function calculatePotentialRevenue(int $landlordId, ?int $propertyId = null): float
    {
        $query = Room::forLandlord($landlordId);

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        return $query
            ->select(DB::raw('SUM(CASE
                WHEN billing_policy = "daily" THEN COALESCE(daily_rate, monthly_rate / 30) * 30
                ELSE monthly_rate
            END) as revenue'))
            ->value('revenue') ?? 0;
    }

    /**
     * Helper: Get room type label
     */
    protected function getRoomTypeLabel(string $type): string
    {
        return match ($type) {
            'single' => 'Single Room',
            'double' => 'Double Room',
            'quad' => 'Quad Room',
            'bedSpacer' => 'Bed Spacer',
            default => ucfirst($type),
        };
    }
}
