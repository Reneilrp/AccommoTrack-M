<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

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

        if (! $hasProperties) {
            // Return empty/default analytics structure
            return $this->getEmptyAnalytics();
        }

        $overview = $this->calculateOverviewStats($landlordId, $propertyId);
        $revenue = $this->calculateRevenueAnalytics($landlordId, $propertyId, $dateRange, $timeRange);
        $payments = $this->calculatePaymentAnalytics($landlordId, $propertyId);
        $tenants = $this->calculateTenantAnalytics($landlordId, $propertyId, $dateRange);
        $properties = $this->calculatePropertyComparison($landlordId, $propertyId);
        $roomPerformance = $propertyId ? $this->calculateRoomPerformance($landlordId, $propertyId) : [];

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
        $query = Property::where('landlord_id', $landlordId);
        if ($propertyId) {
            $query->where('id', $propertyId);
        }

        $properties = $query->with(['rooms' => function ($q) {
            $q->withCount('tenants');
        }])->get();

        // Fix #1: Use actual room record count, not the configurable 'total_rooms' field
        $totalRooms = (int) $properties->sum(fn ($p) => $p->rooms->count());
        $occupiedSlots = (int) $properties->sum(fn ($property) => $property->rooms->sum('tenants_count'));
        $availableRooms = (int) $properties->sum(fn ($p) => $p->rooms->where('status', 'available')->count());
        $occupancyRate = $totalRooms > 0 ? round(($occupiedSlots / $totalRooms) * 100, 1) : 0;

        // Fix #4: Use actual collected payment amounts, not contracted booking amounts
        $paymentsQuery = Payment::forLandlord($landlordId)->where('status', 'paid');
        if ($propertyId) {
            $paymentsQuery->whereHas('booking', fn ($q) => $q->where('property_id', $propertyId));
        }
        $totalRevenue = $paymentsQuery->sum('amount');

        // Calculate Revenue Growth (Current Month vs Previous Month)
        $monthlyRevenue = (clone $paymentsQuery)
            ->whereMonth('payment_date', now()->month)
            ->whereYear('payment_date', now()->year)
            ->sum('amount');

        $prevMonthRevenue = (clone $paymentsQuery)
            ->whereMonth('payment_date', now()->subMonth()->month)
            ->whereYear('payment_date', now()->subMonth()->year)
            ->sum('amount');

        $revenueGrowth = 0;
        if ($prevMonthRevenue > 0) {
            $revenueGrowth = round((($monthlyRevenue - $prevMonthRevenue) / $prevMonthRevenue) * 100, 1);
        } elseif ($monthlyRevenue > 0) {
            $revenueGrowth = 100; // 100% growth if starting from zero
        }

        // Tenant stats
        $activeTenants = $this->countActiveTenants($landlordId, $propertyId);
        $newTenants = $this->countNewTenantsThisMonth($landlordId, $propertyId);

        return [
            'total_properties' => $properties->count(),
            'total_rooms' => $totalRooms,
            'occupied_rooms' => $occupiedSlots,
            'available_rooms' => $availableRooms,
            'occupancy_rate' => $occupancyRate,
            'total_revenue' => round($totalRevenue, 2),
            'monthly_revenue' => round($monthlyRevenue, 2),
            'revenue_growth_rate' => $revenueGrowth, // NEW
            'active_tenants' => $activeTenants,
            'new_tenants_this_month' => $newTenants,
            'revpar' => $totalRooms > 0 ? round($monthlyRevenue / $totalRooms, 2) : 0, // NEW
        ];
    }

    /**
     * Calculate Revenue Analytics with trends
     */
    public function calculateRevenueAnalytics(int $landlordId, ?int $propertyId, array $dateRange, string $timeRange = 'month'): array
    {
        $query = Booking::forLandlord($landlordId)
            ->confirmed()
            ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        // Determine grouping and label format based on time range
        $grouping = match ($timeRange) {
            'week' => 'DATE_FORMAT(created_at, "%Y-%m-%d") as period',
            'month' => 'CONCAT("Week ", FLOOR((DAY(created_at) - 1) / 7) + 1) as period',
            'year' => 'DATE_FORMAT(created_at, "%Y-%m") as period',
            default => 'DATE_FORMAT(created_at, "%Y-%m") as period',
        };

        // Get actual trend from DB
        $results = (clone $query)
            ->select(
                DB::raw($grouping),
                DB::raw('SUM(total_amount) as revenue')
            )
            ->groupBy(DB::raw(preg_replace('/ as period$/', '', $grouping)))
            ->orderBy('period')
            ->get()
            ->pluck('revenue', 'period')
            ->toArray();

        // Fill gaps to ensure current periods are shown even if 0
        $trend = [];
        if ($timeRange === 'week') {
            for ($i = 0; $i < 7; $i++) {
                $date = (clone $dateRange['start'])->addDays($i)->format('Y-m-d');
                $trend[] = ['month' => $date, 'revenue' => (float) ($results[$date] ?? 0)];
            }
        } elseif ($timeRange === 'month') {
            $maxWeek = (int) ceil(now()->day / 7);
            // Ensure we at least show up to the current week of the month
            for ($w = 1; $w <= max(4, $maxWeek); $w++) {
                $key = "Week $w";
                $trend[] = ['month' => $key, 'revenue' => (float) ($results[$key] ?? 0)];
            }
        } elseif ($timeRange === 'year') {
            for ($m = 1; $m <= 12; $m++) {
                $monthKey = now()->year.'-'.str_pad($m, 2, '0', STR_PAD_LEFT);
                $trend[] = ['month' => $monthKey, 'revenue' => (float) ($results[$monthKey] ?? 0)];
            }
        }

        // Expected (potential) vs actual revenue for current month
        $expectedMonthly = $this->calculatePotentialRevenue($landlordId, $propertyId);
        $actualMonthlyQuery = Booking::forLandlord($landlordId)
            ->confirmed()
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year);
        if ($propertyId) {
            $actualMonthlyQuery->where('property_id', $propertyId);
        }
        $actualMonthly = $actualMonthlyQuery->sum('total_amount');
        $collectionRate = $expectedMonthly > 0
            ? round(($actualMonthly / $expectedMonthly) * 100, 1)
            : 0;

        $totalRevenueQuery = Booking::forLandlord($landlordId)->confirmed();
        if ($propertyId) {
            $totalRevenueQuery->where('property_id', $propertyId);
        }

        // Income Breakdown: Rent vs Add-ons
        $addonRevenue = DB::table('booking_addons')
            ->whereIn('invoice_id', function($query) use ($landlordId, $propertyId, $dateRange) {
                $query->select('id')->from('invoices')
                    ->where('landlord_id', $landlordId)
                    ->where('status', 'paid')
                    ->whereBetween('paid_at', [$dateRange['start'], $dateRange['end']]);
                if ($propertyId) $query->where('property_id', $propertyId);
            })
            ->sum(DB::raw('quantity * price_at_booking'));

        $totalPeriodRevenue = $actualMonthly; // For 'month' range, this is same as actualMonthly
        if ($timeRange !== 'month') {
            $totalPeriodRevenue = Booking::forLandlord($landlordId)
                ->confirmed()
                ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
            if ($propertyId) $totalPeriodRevenue->where('property_id', $propertyId);
            $totalPeriodRevenue = $totalPeriodRevenue->sum('total_amount');
        }

        $rentRevenue = max(0, $totalPeriodRevenue - $addonRevenue);

        return [
            'monthly_trend' => $trend,
            'total_revenue' => round($totalRevenueQuery->sum('total_amount'), 2),
            'expected_monthly' => round($expectedMonthly, 2),
            'actual_monthly' => round($actualMonthly, 2),
            'collection_rate' => $collectionRate,
            'income_breakdown' => [ // NEW
                ['name' => 'Rent', 'value' => round($rentRevenue, 2)],
                ['name' => 'Add-ons', 'value' => round($addonRevenue, 2)],
            ]
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
                DB::raw('SUM(capacity) as total_slots'),
                DB::raw('SUM((SELECT COUNT(*) FROM room_tenant_assignments WHERE room_tenant_assignments.room_id = rooms.id AND room_tenant_assignments.status = "active")) as occupied_slots'),
                DB::raw('SUM(CASE WHEN status = "available" THEN 1 ELSE 0 END) as available_rooms'),
                DB::raw('SUM(CASE WHEN status = "maintenance" THEN 1 ELSE 0 END) as maintenance_rooms')
            )
            ->first();

        $totalSlots = (int) ($stats->total_slots ?? 0);
        $occupiedSlots = (int) ($stats->occupied_slots ?? 0);
        $availableRooms = (int) ($stats->available_rooms ?? 0);
        $maintenanceRooms = (int) ($stats->maintenance_rooms ?? 0);

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
        $query = Room::forLandlord($landlordId);

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        return $query
            ->select(
                'room_type',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(capacity) as total_slots'),
                DB::raw('SUM((SELECT COUNT(*) FROM room_tenant_assignments WHERE room_tenant_assignments.room_id = rooms.id AND room_tenant_assignments.status = "active")) as occupied_slots'),
                DB::raw('AVG(monthly_rate) as avg_rate')
            )
            ->groupBy('room_type')
            ->get()
            ->map(fn ($item) => [
                'type' => $item->room_type,
                'label' => $this->getRoomTypeLabel($item->room_type),
                'room_count' => (int) $item->count,
                'total_slots' => (int) $item->total_slots,
                'occupied_slots' => (int) $item->occupied_slots,
                'avg_rate' => round($item->avg_rate, 2),
                'occupancy_rate' => $item->total_slots > 0 ? round(($item->occupied_slots / $item->total_slots) * 100, 1) : 0,
            ])
            ->toArray();
    }

    /**
     * Calculate Room Performance for a specific property
     */
    public function calculateRoomPerformance(int $landlordId, int $propertyId): array
    {
        $currentMonth = now()->month;
        $currentYear = now()->year;

        $monthlyRevenueByRoom = Payment::forLandlord($landlordId)
            ->where('status', 'paid')
            ->whereMonth('payment_date', $currentMonth)
            ->whereYear('payment_date', $currentYear)
            ->whereHas('booking', function ($q) use ($propertyId) {
                $q->where('property_id', $propertyId);
            })
            ->whereNotNull('room_id')
            ->select('room_id', DB::raw('SUM(amount) as monthly_revenue'))
            ->groupBy('room_id')
            ->pluck('monthly_revenue', 'room_id');

        return Room::forLandlord($landlordId)
            ->where('property_id', $propertyId)
            ->withCount(['tenants as active_tenants' => function ($q) {
                $q->where('room_tenant_assignments.status', 'active');
            }])
            ->get()
            ->map(function ($room) use ($monthlyRevenueByRoom) {
                $monthlyRevenue = (float) ($monthlyRevenueByRoom[$room->id] ?? 0);

                return [
                    'id' => $room->id,
                    'name' => "Room " . ($room->room_number ?? $room->id),
                    'type' => $this->getRoomTypeLabel($room->room_type),
                    'capacity' => (int) $room->capacity,
                    'occupied' => (int) $room->active_tenants,
                    'revenue' => round($monthlyRevenue, 2),
                    'revpar' => $room->capacity > 0 ? round($monthlyRevenue / $room->capacity, 2) : 0,
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
    public function calculatePropertyComparison(int $landlordId, ?int $propertyId = null): array
    {
        $currentMonth = now()->month;
        $currentYear = now()->year;

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
            ->withSum(['payments as total_revenue' => fn ($q) => $q->where('payments.status', 'paid')], 'payments.amount')
            ->withSum(['payments as monthly_revenue' => fn ($q) => $q->where('payments.status', 'paid')
                ->whereMonth('payments.payment_date', $currentMonth)->whereYear('payments.payment_date', $currentYear)], 'payments.amount')
            ->get()
            ->map(function ($property) {
                // We need to get total slots and available rooms separately as they can't be done in one go with withCount
                $totalSlots = (int) $property->rooms->sum('capacity');
                $occupiedSlots = (int) $property->rooms->sum('tenants_count');
                $availableRooms = (int) $property->rooms->where('status', 'available')->count();

                return [
                    'id' => $property->id,
                    'name' => $property->title,
                    'title' => $property->title,
                    'total_rooms' => (int) $property->rooms_count,
                    'total_slots' => $totalSlots,
                    'occupied_slots' => $occupiedSlots,
                    'available_rooms' => $availableRooms,
                    'occupancy_rate' => $totalSlots > 0 ? round(($occupiedSlots / $totalSlots) * 100, 1) : 0,
                    'monthly_revenue' => round($property->monthly_revenue ?? 0, 2),
                    'total_revenue' => round($property->total_revenue ?? 0, 2),
                    'revpar' => $property->rooms_count > 0 ? round(($property->monthly_revenue ?? 0) / $property->rooms_count, 2) : 0, // NEW
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
        $query = Payment::forLandlord($landlordId);

        if ($propertyId) {
            $query->whereHas('booking', function ($q) use ($propertyId) {
                $q->where('property_id', $propertyId);
            });
        }

        $stats = $query
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN status = "paid" THEN 1 ELSE 0 END) as paid'),
                DB::raw('SUM(CASE WHEN status = "partial" THEN 1 ELSE 0 END) as partial'),
                DB::raw('SUM(CASE WHEN status = "overdue" OR (status = "pending" AND due_date < NOW()) THEN 1 ELSE 0 END) as overdue'),
                DB::raw('SUM(CASE WHEN status = "pending" AND due_date >= NOW() THEN 1 ELSE 0 END) as pending'),
                DB::raw('SUM(CASE WHEN status = "paid" THEN amount ELSE 0 END) as collected'),
                DB::raw('SUM(CASE WHEN status IN ("pending", "partial", "overdue") THEN amount ELSE 0 END) as outstanding')
            )
            ->first();

        $total = (int) ($stats->total ?? 0);
        $paid = (int) ($stats->paid ?? 0);
        $pending = (int) ($stats->pending ?? 0);
        $partial = (int) ($stats->partial ?? 0);
        $overdue = (int) ($stats->overdue ?? 0);

        $paymentRate = $total > 0 ? round(($paid / $total) * 100, 1) : 0;

        return [
            'paid' => $paid,
            'unpaid' => $pending, // Mapping 'pending' to 'unpaid' for frontend compatibility
            'partial' => $partial,
            'overdue' => $overdue,
            'payment_rate' => $paymentRate,
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
