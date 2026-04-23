<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentTransaction;
use App\Models\Property;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    /**
     * Get comprehensive dashboard analytics
     */
    public function getDashboardAnalytics(int $landlordId, ?int $propertyId = null, string $timeRange = 'month'): array
    {
        $cacheKey = "landlord_analytics_{$landlordId}_" . ($propertyId ?? 'all') . "_{$timeRange}";

        return \Illuminate\Support\Facades\Cache::remember($cacheKey, 3600, function() use ($landlordId, $propertyId, $timeRange) {
            $dateRange = $this->getDateRange($timeRange);

            // Check if landlord has any properties first
            $hasProperties = Property::where('landlord_id', $landlordId)->exists();

            if (! $hasProperties) {
                // Return empty/default analytics structure
                return $this->getEmptyAnalytics();
            }

            $overview = $this->calculateOverviewStats($landlordId, $propertyId);
            $revenue = $this->calculateRevenueAnalytics($landlordId, $propertyId, $dateRange, $timeRange);
            $payments = $this->calculatePaymentAnalytics($landlordId, $propertyId);
            $tenants = $this->calculateTenantAnalytics($landlordId, $propertyId, $dateRange);
            $properties = $this->calculatePropertyComparison($landlordId, $propertyId, $dateRange);
            $roomPerformance = $propertyId ? $this->calculateRoomPerformance($landlordId, $propertyId, $dateRange) : [];

            return [
                'overview' => $overview,
                'revenue' => [
                    'expected_monthly' => $revenue['expected_monthly'] ?? 0,
                    'actual_monthly' => $revenue['actual_monthly'] ?? 0,
                    'collection_rate' => $revenue['collection_rate'] ?? 0,
                    'monthly_trend' => $revenue['monthly_trend'] ?? [],
                    'income_breakdown' => $revenue['income_breakdown'] ?? [],
                ],
                'occupancy' => $this->calculateOccupancyAnalytics($landlordId, $propertyId),
                'roomTypes' => $this->calculateRoomTypeAnalytics($landlordId, $propertyId),
                'properties' => $properties,
                'room_performance' => $roomPerformance,
                'tenants' => $tenants,
                'payments' => $payments,
                'bookings' => $this->calculateBookingAnalytics($landlordId, $propertyId, $dateRange),
            ];
        });
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
                'revenue_growth_rate' => 0,
                'active_tenants' => 0,
                'new_tenants_this_month' => 0,
                'revpar' => 0,
            ],
            'revenue' => [
                'expected_monthly' => 0,
                'actual_monthly' => 0,
                'collection_rate' => 0,
                'monthly_trend' => [],
                'income_breakdown' => [
                    ['name' => 'Rent', 'value' => 0],
                    ['name' => 'Add-ons', 'value' => 0],
                ],
            ],
            'occupancy' => [
                'total_slots' => 0,
                'occupied_slots' => 0,
                'available_rooms' => 0,
                'maintenance_rooms' => 0,
                'occupancy_rate' => 0,
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
                'completed' => 0,
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
            'week' => Carbon::now()->subDays(6)->startOfDay(), // Last 7 days including today
            'month' => Carbon::now()->startOfMonth(),         // Current calendar month
            'year' => Carbon::now()->startOfYear(),           // Current calendar year
            default => Carbon::now()->startOfMonth(),
        };

        return ['start' => $start, 'end' => $end];
    }

    /**
     * Calculate Overview Statistics
     */
    public function calculateOverviewStats(int $landlordId, ?int $propertyId = null): array
    {
        $propertyQuery = Property::where('landlord_id', $landlordId);
        if ($propertyId) {
            $propertyQuery->where('id', $propertyId);
        }
        $propertyIds = (clone $propertyQuery)->pluck('id');

        // 1. Combine Room and Occupancy stats into one query
        $roomStats = Room::whereIn('property_id', $propertyIds)
            ->selectRaw("
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'available' THEN 1 END) as available
            ")
            ->first();

        $occupiedSlots = DB::table('room_tenant_assignments')
            ->join('rooms', 'room_tenant_assignments.room_id', '=', 'rooms.id')
            ->whereIn('rooms.property_id', $propertyIds)
            ->where('room_tenant_assignments.status', 'active')
            ->count();

        $totalRooms = (int)($roomStats->total ?? 0);
        $availableRooms = (int)($roomStats->available ?? 0);
        $occupancyRate = $totalRooms > 0 ? round(($occupiedSlots / $totalRooms) * 100, 1) : 0;

        // 2. Combine Revenue calculations (Total, Monthly, Previous Month) into one query
        $now = now();
        $prevMonth = now()->subMonth();
        
        $revenueStats = $this->baseCollectedInvoiceQuery($landlordId, $propertyId)
            ->selectRaw("
                SUM(amount_cents) as total_cents,
                SUM(CASE WHEN paid_at >= '{$now->startOfMonth()}' AND paid_at <= '{$now->endOfMonth()}' THEN amount_cents ELSE 0 END) as monthly_cents,
                SUM(CASE WHEN paid_at >= '{$prevMonth->startOfMonth()}' AND paid_at <= '{$prevMonth->endOfMonth()}' THEN amount_cents ELSE 0 END) as prev_monthly_cents
            ")
            ->first();

        $totalRevenue = (float)($revenueStats->total_cents ?? 0);
        $monthlyRevenue = (float)($revenueStats->monthly_cents ?? 0);
        $prevMonthRevenue = (float)($revenueStats->prev_monthly_cents ?? 0);

        $revenueGrowth = 0;
        if ($prevMonthRevenue > 0) {
            $revenueGrowth = round((($monthlyRevenue - $prevMonthRevenue) / $prevMonthRevenue) * 100, 1);
        } elseif ($monthlyRevenue > 0) {
            $revenueGrowth = 100;
        }

        // Tenant stats
        $activeTenants = $this->countActiveTenants($landlordId, $propertyId);
        $newTenants = $this->countNewTenantsThisMonth($landlordId, $propertyId);

        return [
            'total_properties' => $propertyIds->count(),
            'total_rooms' => $totalRooms,
            'occupied_rooms' => $occupiedSlots,
            'available_rooms' => $availableRooms,
            'occupancy_rate' => $occupancyRate,
            'total_revenue' => round($totalRevenue, 2),
            'monthly_revenue' => round($monthlyRevenue, 2),
            'revenue_growth_rate' => $revenueGrowth,
            'active_tenants' => $activeTenants,
            'new_tenants_this_month' => $newTenants,
            'revpar' => $totalRooms > 0 ? round($monthlyRevenue / $totalRooms, 2) : 0,
        ];
    }

    /**
     * Calculate Revenue Analytics with trends
     */
    public function calculateRevenueAnalytics(int $landlordId, ?int $propertyId, array $dateRange, string $timeRange = 'month'): array
    {
        $collectedInRangeQuery = $this->baseCollectedInvoiceQuery($landlordId, $propertyId)
            ->whereBetween('paid_at', [$dateRange['start'], $dateRange['end']]);

        // Determine grouping and label format based on time range
        $grouping = match ($timeRange) {
            'week' => 'DATE_FORMAT(paid_at, "%Y-%m-%d") as period',
            'month' => 'CONCAT("Week ", FLOOR((DAY(paid_at) - 1) / 7) + 1) as period',
            'year' => 'DATE_FORMAT(paid_at, "%Y-%m") as period',
            default => 'DATE_FORMAT(paid_at, "%Y-%m") as period',
        };

        // Cash-basis trend from paid invoices.
        $resultsCents = (clone $collectedInRangeQuery)
            ->select(
                DB::raw($grouping),
                DB::raw('SUM(amount_cents) as revenue_cents')
            )
            ->groupBy(DB::raw(preg_replace('/ as period$/', '', $grouping)))
            ->orderBy('period')
            ->get()
            ->pluck('revenue_cents', 'period')
            ->toArray();

        // Fill gaps to ensure current periods are shown even if 0
        $trend = [];
        if ($timeRange === 'week') {
            for ($i = 0; $i < 7; $i++) {
                $date = (clone $dateRange['start'])->addDays($i)->format('Y-m-d');
                $trend[] = ['month' => $date, 'revenue' => (float) ($resultsCents[$date] ?? 0)];
            }
        } elseif ($timeRange === 'month') {
            $maxWeek = (int) ceil(now()->day / 7);
            // Ensure we at least show up to the current week of the month
            for ($w = 1; $w <= max(4, $maxWeek); $w++) {
                $key = "Week $w";
                $trend[] = ['month' => $key, 'revenue' => (float) ($resultsCents[$key] ?? 0)];
            }
        } elseif ($timeRange === 'year') {
            for ($m = 1; $m <= 12; $m++) {
                $monthKey = now()->year.'-'.str_pad($m, 2, '0', STR_PAD_LEFT);
                $trend[] = ['month' => $monthKey, 'revenue' => (float) ($resultsCents[$monthKey] ?? 0)];
            }
        }

        // 2. Combine multiple Revenue sums (Monthly, Total, Period) into one query
        $now = now();
        $revenueStats = $this->baseCollectedInvoiceQuery($landlordId, $propertyId)
            ->selectRaw("
                SUM(amount_cents) as total_cents,
                SUM(CASE WHEN paid_at >= '{$now->startOfMonth()}' AND paid_at <= '{$now->endOfMonth()}' THEN amount_cents ELSE 0 END) as monthly_cents,
                SUM(CASE WHEN paid_at >= '{$dateRange['start']}' AND paid_at <= '{$dateRange['end']}' THEN amount_cents ELSE 0 END) as period_cents
            ")
            ->first();

        $totalRevenue = (float)($revenueStats->total_cents ?? 0);
        $actualMonthly = (float)($revenueStats->monthly_cents ?? 0);
        $totalPeriodRevenue = (float)($revenueStats->period_cents ?? 0);

        // Expected (potential) vs actual collected revenue for current month.
        $expectedMonthly = $this->calculatePotentialRevenue($landlordId, $propertyId);

        $collectionRate = $expectedMonthly > 0
            ? round(($actualMonthly / $expectedMonthly) * 100, 1)
            : 0;

        // Income Breakdown: Rent vs Add-ons
        $addonRevenue = DB::table('booking_addons')
            ->whereIn('invoice_id', function ($query) use ($landlordId, $propertyId, $dateRange) {
                $query->select('id')->from('invoices')
                    ->where('landlord_id', $landlordId)
                    ->where('status', 'paid')
                    ->whereBetween('paid_at', [$dateRange['start'], $dateRange['end']]);
                if ($propertyId) {
                    $query->where('property_id', $propertyId);
                }
            })
            ->sum(DB::raw('quantity * price_at_booking'));

        $rentRevenue = max(0, $totalPeriodRevenue - $addonRevenue);

        return [
            'monthly_trend' => $trend,
            'total_revenue' => round($totalRevenue, 2),
            'expected_monthly' => round($expectedMonthly, 2),
            'actual_monthly' => round($actualMonthly, 2),
            'collection_rate' => $collectionRate,
            'income_breakdown' => [ // NEW
                ['name' => 'Rent', 'value' => round($rentRevenue, 2)],
                ['name' => 'Add-ons', 'value' => round($addonRevenue, 2)],
            ],
        ];
    }

    /**
     * Cash-basis collected revenue query.
     */
    protected function baseCollectedInvoiceQuery(int $landlordId, ?int $propertyId = null)
    {
        $query = Invoice::query()
            ->where('landlord_id', $landlordId)
            ->whereIn('status', ['paid', 'transferred'])
            ->whereNotNull('paid_at');

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        return $query;
    }

    /**
     * Calculate Occupancy Analytics
     */
    public function calculateOccupancyAnalytics(int $landlordId, ?int $propertyId = null): array
    {
        $roomQuery = DB::table('rooms')
            ->join('properties', 'rooms.property_id', '=', 'properties.id')
            ->where('properties.landlord_id', $landlordId);

        if ($propertyId) {
            $roomQuery->where('rooms.property_id', $propertyId);
        }

        $propertyIds = (clone $roomQuery)->select('rooms.property_id');

        $totalSlots = (int) (clone $roomQuery)->sum('capacity');
        $availableRooms = (int) (clone $roomQuery)->where('rooms.status', 'available')->count();
        $maintenanceRooms = (int) (clone $roomQuery)->where('rooms.status', 'maintenance')->count();

        $occupiedSlots = (int) DB::table('room_tenant_assignments')
            ->whereIn('room_id', (clone $roomQuery)->select('rooms.id'))
            ->where('status', 'active')
            ->count();

        return [
            'total_slots' => $totalSlots,
            'occupied_slots' => $occupiedSlots,
            'available_rooms' => $availableRooms,
            'maintenance_rooms' => $maintenanceRooms,
            'occupancy_rate' => $totalSlots > 0 ? round(($occupiedSlots / $totalSlots) * 100, 1) : 0,
        ];
    }

    /**
     * Calculate Room Type Analytics
     */
    public function calculateRoomTypeAnalytics(int $landlordId, ?int $propertyId = null): array
    {
        $stats = DB::table('rooms')
            ->join('properties', 'rooms.property_id', '=', 'properties.id')
            ->where('properties.landlord_id', $landlordId)
            ->when($propertyId, function ($q) use ($propertyId) {
                $q->where('rooms.property_id', $propertyId);
            })
            ->select(
                'rooms.room_type',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(rooms.capacity) as total_slots'),
                DB::raw('AVG(rooms.monthly_rate) as avg_rate')
            )
            ->groupBy('rooms.room_type')
            ->get();

        $occupiedByType = DB::table('room_tenant_assignments')
            ->join('rooms', 'room_tenant_assignments.room_id', '=', 'rooms.id')
            ->join('properties', 'rooms.property_id', '=', 'properties.id')
            ->where('properties.landlord_id', $landlordId)
            ->where('room_tenant_assignments.status', 'active')
            ->when($propertyId, function ($q) use ($propertyId) {
                $q->where('rooms.property_id', $propertyId);
            })
            ->select('rooms.room_type', DB::raw('COUNT(*) as occupied_slots'))
            ->groupBy('rooms.room_type')
            ->pluck('occupied_slots', 'rooms.room_type');

        return $stats->map(function ($item) use ($occupiedByType) {
                $occupiedSlots = (int) ($occupiedByType[$item->room_type] ?? 0);

                return [
                    'type' => $item->room_type,
                    'label' => $this->getRoomTypeLabel($item->room_type),
                    'room_count' => (int) $item->count,
                    'total_slots' => (int) $item->total_slots,
                    'occupied_slots' => $occupiedSlots,
                    'avg_rate' => round($item->avg_rate, 2),
                    'occupancy_rate' => $item->total_slots > 0 ? round(($occupiedSlots / $item->total_slots) * 100, 1) : 0,
                ];
            })
            ->toArray();
    }

    /**
     * Calculate Room Performance for a specific property
     */
    public function calculateRoomPerformance(int $landlordId, int $propertyId, ?array $dateRange = null): array
    {
        $dateRange = $dateRange ?: $this->getDateRange('month');
        $periodStart = $dateRange['start']->copy()->startOfDay();
        $periodEnd = $dateRange['end']->copy()->endOfDay();

        $periodRevenueByRoom = Invoice::query()
            ->where('invoices.landlord_id', $landlordId)
            ->where('invoices.property_id', $propertyId)
            ->where('invoices.status', 'paid')
            ->whereNotNull('invoices.paid_at')
            ->whereBetween('invoices.paid_at', [$periodStart, $periodEnd])
            ->join('bookings', 'invoices.booking_id', '=', 'bookings.id')
            ->whereNotNull('bookings.room_id')
            ->select('bookings.room_id', DB::raw('SUM(invoices.amount_cents) as period_revenue_cents'))
            ->groupBy('bookings.room_id')
            ->pluck('period_revenue_cents', 'room_id');

        return Room::forLandlord($landlordId)
            ->where('property_id', $propertyId)
            ->withCount(['tenants as active_tenants' => function ($q) {
                $q->where('room_tenant_assignments.status', 'active');
            }])
            ->get()
            ->map(function ($room) use ($periodRevenueByRoom) {
                $periodRevenue = (float) ($periodRevenueByRoom[$room->id] ?? 0);

                return [
                    'id' => $room->id,
                    'name' => 'Room '.($room->room_number ?? $room->id),
                    'type' => $this->getRoomTypeLabel($room->room_type),
                    'capacity' => (int) $room->capacity,
                    'occupied' => (int) $room->active_tenants,
                    'revenue' => round($periodRevenue, 2),
                    'revpar' => $room->capacity > 0 ? round($periodRevenue / $room->capacity, 2) : 0,
                    'occupancy_rate' => $room->capacity > 0 ? round(($room->active_tenants / $room->capacity) * 100, 1) : 0,
                ];
            })
            ->sortByDesc('revpar')
            ->values()
            ->toArray();
    }

    /**
     * Calculate Property Comparison
     */
    public function calculatePropertyComparison(int $landlordId, ?int $propertyId = null, ?array $dateRange = null): array
    {
        $dateRange = $dateRange ?: $this->getDateRange('month');
        $periodStart = $dateRange['start']->copy()->startOfDay();
        $periodEnd = $dateRange['end']->copy()->endOfDay();

        $query = Property::where('landlord_id', $landlordId);

        if ($propertyId) {
            $query->where('id', $propertyId);
        }

        return $query
            ->withCount([
                'rooms',
            ])
            ->with(['rooms' => function ($q) {
                $q->withCount('tenants');
            }])
            ->get()
            ->map(function ($property) use ($periodStart, $periodEnd) {
                // We need to get total slots and available rooms separately as they can't be done in one go with withCount
                $totalSlots = (int) $property->rooms->sum('capacity');
                $occupiedSlots = (int) $property->rooms->sum('tenants_count');
                $availableRooms = (int) $property->rooms->where('status', 'available')->count();

                $baseCollectedInvoiceQuery = Invoice::query()
                    ->where('property_id', $property->id)
                    ->where('status', 'paid')
                    ->whereNotNull('paid_at');

                $totalRevenueCents = (int) (clone $baseCollectedInvoiceQuery)->sum('amount_cents');
                $periodRevenueCents = (int) (clone $baseCollectedInvoiceQuery)
                    ->whereBetween('paid_at', [$periodStart, $periodEnd])
                    ->sum('amount_cents');

                return [
                    'id' => $property->id,
                    'name' => $property->title,
                    'title' => $property->title,
                    'total_rooms' => (int) $property->rooms_count,
                    'total_slots' => $totalSlots,
                    'occupied_slots' => $occupiedSlots,
                    'available_rooms' => $availableRooms,
                    'occupancy_rate' => $totalSlots > 0 ? round(($occupiedSlots / $totalSlots) * 100, 1) : 0,
                    'monthly_revenue' => (float)$periodRevenueCents,
                    'total_revenue' => (float)$totalRevenueCents,
                    'revpar' => $property->rooms_count > 0 ? (float)($periodRevenueCents / $property->rooms_count) : 0,
                ];
            })
            ->toArray();
    }

    /**
     * Calculate Tenant Analytics
     */
    public function calculateTenantAnalytics(int $landlordId, ?int $propertyId, array $dateRange): array
    {
        $activeTenants = $this->countActiveTenants($landlordId, $propertyId);
        $newTenants = $this->countNewTenantsThisMonth($landlordId, $propertyId);

        // Fix #2: Average stay via bookings directly — tenant_profiles.booking_id is nullable
        // and misses manually assigned tenants; use start/end_date from bookings instead.
        $avgStayQuery = Booking::forLandlord($landlordId)
            ->whereIn('status', ['confirmed', 'completed', 'partial-completed'])
            ->whereNotNull('start_date')
            ->whereNotNull('end_date');
        if ($propertyId) {
            $avgStayQuery->where('property_id', $propertyId);
        }
        $avgStayDuration = $avgStayQuery
            ->selectRaw('AVG(TIMESTAMPDIFF(MONTH, start_date, end_date)) as avg_months')
            ->value('avg_months');

        $moveIns = $this->countMoveInsInPeriod($landlordId, $propertyId, $dateRange);
        $moveOuts = $this->countMoveOutsInPeriod($landlordId, $propertyId, $dateRange);

        return [
            'total' => $activeTenants,
            'average_stay_months' => round($avgStayDuration ?? 0, 1),
            'move_ins' => $moveIns,
            'move_outs' => $moveOuts,
        ];
    }

    /**
     * Calculate Payment Analytics
     */
    public function calculatePaymentAnalytics(int $landlordId, ?int $propertyId = null): array
    {
        $query = Invoice::where('landlord_id', $landlordId);

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        $stats = $query
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(CASE WHEN status = "paid" THEN 1 ELSE 0 END) as paid')
            ->selectRaw('SUM(CASE WHEN status = "partial" THEN 1 ELSE 0 END) as partial')
            ->selectRaw("SUM(CASE WHEN status = 'overdue' OR (status = 'pending' AND due_date < CURDATE()) THEN 1 ELSE 0 END) as overdue")
            ->selectRaw("SUM(CASE WHEN status = 'pending' AND due_date >= CURDATE() THEN 1 ELSE 0 END) as pending")
            ->selectRaw('SUM(amount_cents) as total_cents')
            ->first();

        // Calculate collected from transactions
        $collectedQuery = PaymentTransaction::where('status', 'succeeded')
            ->whereHas('invoice', function ($q) use ($landlordId, $propertyId) {
                $q->where('landlord_id', $landlordId);
                if ($propertyId) {
                    $q->where('property_id', $propertyId);
                }
            });

        $collectedCents = (int) $collectedQuery->sum('amount_cents');

        $total = (int) ($stats->total ?? 0);
        $paid = (int) ($stats->paid ?? 0);
        $pending = (int) ($stats->pending ?? 0);
        $partial = (int) ($stats->partial ?? 0);
        $overdue = (int) ($stats->overdue ?? 0);

        $paymentRate = $total > 0 ? round(($paid / $total) * 100, 1) : 0;

        return [
            'paid' => $paid,
            'unpaid' => $pending,
            'partial' => $partial,
            'overdue' => $overdue,
            'payment_rate' => $paymentRate,
            'collected' => (float)$collectedCents,
            'outstanding' => (float)(($stats->total_cents ?? 0) - $collectedCents),
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

        $total = (int) ($stats->total ?? 0);

        return [
            'total' => $total,
            'pending' => (int) ($stats->pending ?? 0),
            'confirmed' => (int) ($stats->confirmed ?? 0),
            'completed' => (int) ($stats->completed ?? 0),
            'cancelled' => (int) ($stats->cancelled ?? 0),
            'conversion_rate' => $total > 0
                ? round(((($stats->confirmed ?? 0) + ($stats->completed ?? 0)) / $total) * 100, 1)
                : 0,
        ];
    }

    /**
     * Helper: Count active tenant assignments (room occupancies)
     */
    protected function countActiveTenants(int $landlordId, ?int $propertyId = null): int
    {
        $query = DB::table('room_tenant_assignments')
            ->join('rooms', 'room_tenant_assignments.room_id', '=', 'rooms.id')
            ->join('properties', 'rooms.property_id', '=', 'properties.id')
            ->where('properties.landlord_id', $landlordId)
            ->where('room_tenant_assignments.status', 'active');

        if ($propertyId) {
            $query->where('properties.id', $propertyId);
        }

        return $query->count();
    }

    /**
     * Helper: Count new tenant assignments this month
     */
    protected function countNewTenantsThisMonth(int $landlordId, ?int $propertyId = null): int
    {
        $query = DB::table('room_tenant_assignments')
            ->join('rooms', 'room_tenant_assignments.room_id', '=', 'rooms.id')
            ->join('properties', 'rooms.property_id', '=', 'properties.id')
            ->where('properties.landlord_id', $landlordId)
            ->where('room_tenant_assignments.status', 'active')
            ->whereMonth('room_tenant_assignments.created_at', now()->month)
            ->whereYear('room_tenant_assignments.created_at', now()->year);

        if ($propertyId) {
            $query->where('properties.id', $propertyId);
        }

        return $query->count();
    }

    /**
     * Fix #2: Count move-ins using booking start_date directly,
     * avoiding the nullable tenant_profiles.booking_id join.
     */
    protected function countMoveInsInPeriod(int $landlordId, ?int $propertyId, array $dateRange): int
    {
        $q = Booking::forLandlord($landlordId)
            ->whereIn('status', ['confirmed', 'completed', 'partial-completed'])
            ->whereNotNull('start_date')
            ->whereBetween('start_date', [
                $dateRange['start']->format('Y-m-d'),
                $dateRange['end']->format('Y-m-d'),
            ]);
        if ($propertyId) {
            $q->where('property_id', $propertyId);
        }

        return $q->count();
    }

    /**
     * Fix #2: Count move-outs using booking end_date directly.
     */
    protected function countMoveOutsInPeriod(int $landlordId, ?int $propertyId, array $dateRange): int
    {
        $q = Booking::forLandlord($landlordId)
            ->whereIn('status', ['completed', 'cancelled'])
            ->whereNotNull('end_date')
            ->whereBetween('end_date', [
                $dateRange['start']->format('Y-m-d'),
                $dateRange['end']->format('Y-m-d'),
            ]);
        if ($propertyId) {
            $q->where('property_id', $propertyId);
        }

        return $q->count();
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

        return (float) ($query
            ->select(DB::raw('SUM(CASE
                WHEN billing_policy = "daily" THEN COALESCE(daily_rate, monthly_rate / 30) * 30
                ELSE monthly_rate
            END) as revenue'))
            ->value('revenue') ?? 0);
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
