<?php

namespace App\Services;

use App\Models\Property;
use App\Models\Room;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class LandlordDashboardService
{
    public function getStats(int $landlordId, ?array $assignedPropertyIds, bool $isCaretaker): array
    {
        // Properties Stats
        $totalPropertiesQuery = Property::where('landlord_id', $landlordId);
        if ($assignedPropertyIds) $totalPropertiesQuery->whereIn('id', $assignedPropertyIds);
        $totalProperties = $totalPropertiesQuery->count();

        $activePropertiesQuery = Property::where('landlord_id', $landlordId)->where('current_status', 'active');
        if ($assignedPropertyIds) $activePropertiesQuery->whereIn('id', $assignedPropertyIds);
        $activeProperties = $activePropertiesQuery->count();

        // Rooms Stats
        $roomsBaseQuery = Room::whereHas('property', function ($query) use ($landlordId, $assignedPropertyIds) {
            $query->where('landlord_id', $landlordId);
            if ($assignedPropertyIds) $query->whereIn('id', $assignedPropertyIds);
        });

        $totalRooms = (clone $roomsBaseQuery)->count();
        $occupiedRooms = (clone $roomsBaseQuery)->where('status', 'occupied')->count();
        $availableRooms = (clone $roomsBaseQuery)->where('status', 'available')->count();
        $maintenanceRooms = (clone $roomsBaseQuery)->where('status', 'maintenance')->count();

        // Occupancy Rate
        $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0;

        // Tenants Stats
        $activeTenants = (clone $roomsBaseQuery)
            ->where('status', 'occupied')
            ->whereNotNull('current_tenant_id')
            ->distinct('current_tenant_id')
            ->count('current_tenant_id');

        // Bookings Stats
        $bookingsBaseQuery = Booking::where('landlord_id', $landlordId);
        if ($assignedPropertyIds) $bookingsBaseQuery->whereIn('property_id', $assignedPropertyIds);

        $pendingBookings = (clone $bookingsBaseQuery)->where('status', 'pending')->count();
        $confirmedBookings = (clone $bookingsBaseQuery)->where('status', 'confirmed')->count();

        // Maintenance Stats
        $maintenanceQuery = \App\Models\MaintenanceRequest::where('landlord_id', $landlordId);
        if ($assignedPropertyIds) $maintenanceQuery->whereIn('property_id', $assignedPropertyIds);
        $pendingMaintenance = (clone $maintenanceQuery)->where('status', 'pending')->count();

        // Addon Request Stats
        $addonQuery = DB::table('booking_addons')
            ->join('addons', 'booking_addons.addon_id', '=', 'addons.id')
            ->join('properties', 'addons.property_id', '=', 'properties.id')
            ->where('properties.landlord_id', $landlordId);
        if ($assignedPropertyIds) $addonQuery->whereIn('addons.property_id', $assignedPropertyIds);
        $pendingAddons = $addonQuery->where('booking_addons.status', 'pending')->count();

        $response = [
            'properties' => ['total' => $totalProperties, 'active' => $activeProperties],
            'rooms' => ['total' => $totalRooms, 'occupied' => $occupiedRooms, 'available' => $availableRooms, 'maintenance' => $maintenanceRooms, 'occupancyRate' => $occupancyRate],
            'tenants' => ['active' => $activeTenants],
            'bookings' => ['pending' => $pendingBookings, 'confirmed' => $confirmedBookings],
            'requests' => ['maintenance' => $pendingMaintenance, 'addons' => $pendingAddons]
        ];

        if (!$isCaretaker) {
            $monthlyRevenue = Booking::where('landlord_id', $landlordId)->where('status', 'confirmed')->where('payment_status', 'paid')->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->sum('monthly_rent');
            $totalRevenue = Booking::where('landlord_id', $landlordId)->where('status', 'confirmed')->where('payment_status', 'paid')->sum('total_amount');
            $expectedRevenue = Booking::where('landlord_id', $landlordId)->where('status', 'confirmed')->whereIn('payment_status', ['unpaid', 'partial'])->sum('total_amount');
            $response['revenue'] = ['monthly' => (float) $monthlyRevenue, 'total' => (float) $totalRevenue, 'expected' => (float) $expectedRevenue];
        }

        return $response;
    }

    public function getRecentActivities(int $landlordId, ?array $assignedPropertyIds, bool $isCaretaker, ?int $propertyId): \Illuminate\Support\Collection
    {
        $activities = collect();
        
        $recentBookingsQuery = Booking::where('landlord_id', $landlordId)->with(['tenant', 'property', 'room'])->orderBy('created_at', 'desc');
        if ($propertyId) $recentBookingsQuery->where('property_id', $propertyId);
        elseif ($assignedPropertyIds) $recentBookingsQuery->whereIn('property_id', $assignedPropertyIds);
        $activities = $activities->merge($recentBookingsQuery->limit(20)->get());

        $roomsQuery = Room::whereHas('property', function ($query) use ($landlordId, $propertyId, $assignedPropertyIds) {
            $query->where('landlord_id', $landlordId);
            if ($propertyId) $query->where('id', $propertyId);
            elseif ($assignedPropertyIds) $query->whereIn('id', $assignedPropertyIds);
        });

        $activities = $activities->merge((clone $roomsQuery)->where('updated_at', '>=', now()->subDays(10))->with(['property', 'currentTenant'])->orderBy('updated_at', 'desc')->limit(10)->get());
        $activities = $activities->merge((clone $roomsQuery)->where('created_at', '>=', now()->subDays(10))->with(['property'])->orderBy('created_at', 'desc')->limit(10)->get());

        if (!$isCaretaker) {
            $propertyUpdatesQuery = Property::where('landlord_id', $landlordId)->where('updated_at', '>=', now()->subDays(10))->orderBy('updated_at', 'desc');
            if ($propertyId) $propertyUpdatesQuery->where('id', $propertyId);
            $activities = $activities->merge($propertyUpdatesQuery->limit(5)->get());

            $invoiceQuery = \App\Models\Invoice::where('landlord_id', $landlordId)->where('updated_at', '>=', now()->subDays(10))->with('property')->orderBy('updated_at', 'desc');
            if ($propertyId) $invoiceQuery->where('property_id', $propertyId);
            $activities = $activities->merge($invoiceQuery->limit(10)->get());
            
            $paymentsQuery = \App\Models\PaymentTransaction::whereHas('invoice', function ($q) use ($landlordId, $propertyId) {
                $q->where('landlord_id', $landlordId);
                if ($propertyId) $q->where('property_id', $propertyId);
            })->with(['invoice','tenant'])->orderBy('created_at', 'desc');
            $activities = $activities->merge($paymentsQuery->limit(15)->get());
        }

        return $activities->sortByDesc('created_at')->values();
    }
    
    public function getUpcomingPayments(int $landlordId, ?array $assignedPropertyIds, bool $isCaretaker)
    {
        $checkoutsQuery = Booking::where('landlord_id', $landlordId)
            ->where('status', 'confirmed')
            ->whereBetween('end_date', [now(), now()->addDays(30)])
            ->with(['tenant', 'property', 'room'])
            ->orderBy('end_date', 'asc');
        if ($assignedPropertyIds) $checkoutsQuery->whereIn('property_id', $assignedPropertyIds);
        
        $unpaidBookings = [];
        if (!$isCaretaker) {
            $unpaidBookings = Booking::where('landlord_id', $landlordId)
                ->where('status', 'confirmed')
                ->whereIn('payment_status', ['unpaid', 'partial'])
                ->with(['tenant', 'property', 'room'])
                ->orderBy('start_date', 'asc')->get();
        }
        
        return [
            'upcomingCheckouts' => $checkoutsQuery->get(),
            'unpaidBookings' => $unpaidBookings,
        ];
    }
    
    public function getPropertyPerformance(int $landlordId, ?array $assignedPropertyIds)
    {
        $propertiesQuery = Property::where('landlord_id', $landlordId)->with(['rooms']);
        if ($assignedPropertyIds) $propertiesQuery->whereIn('id', $assignedPropertyIds);
        return $propertiesQuery->get();
    }

    public function getRevenueChart(int $landlordId)
    {
        $revenueData = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthName = $date->format('M');
            $monthRevenue = Booking::where('landlord_id', $landlordId)
                ->where('status', 'confirmed')
                ->where('payment_status', 'paid')
                ->whereMonth('created_at', $date->month)
                ->whereYear('created_at', $date->year)
                ->sum('monthly_rent');
            $revenueData[$monthName] = (float) $monthRevenue;
        }
        return $revenueData;
    }
}
