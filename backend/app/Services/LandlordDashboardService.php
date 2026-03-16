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

        $activePropertiesQuery = Property::where('landlord_id', $landlordId)->where('current_status', Property::STATUS_ACTIVE);
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

    public function getRecentActivities(int $landlordId, ?array $assignedPropertyIds, bool $isCaretaker, ?int $propertyId, ?int $roomId = null): \Illuminate\Support\Collection
    {
        $activities = collect();
        
        $recentBookingsQuery = Booking::where('landlord_id', $landlordId)->with(['tenant', 'property', 'room'])->orderBy('created_at', 'desc');
        if ($roomId) $recentBookingsQuery->where('room_id', $roomId);
        elseif ($propertyId) $recentBookingsQuery->where('property_id', $propertyId);
        elseif ($assignedPropertyIds) $recentBookingsQuery->whereIn('property_id', $assignedPropertyIds);
        $activities = $activities->merge($recentBookingsQuery->limit(20)->get());

        $roomsQuery = Room::whereHas('property', function ($query) use ($landlordId, $propertyId, $assignedPropertyIds) {
            $query->where('landlord_id', $landlordId);
            if ($propertyId) $query->where('id', $propertyId);
            elseif ($assignedPropertyIds) $query->whereIn('id', $assignedPropertyIds);
        });
        if ($roomId) $roomsQuery->where('id', $roomId);

        $activities = $activities->merge((clone $roomsQuery)->where('updated_at', '>=', now()->subDays(10))->with(['property', 'currentTenant'])->orderBy('updated_at', 'desc')->limit(10)->get());
        $activities = $activities->merge((clone $roomsQuery)->where('created_at', '>=', now()->subDays(10))->with(['property'])->orderBy('created_at', 'desc')->limit(10)->get());

        if (!$isCaretaker) {
            if (!$roomId) {
                $propertyUpdatesQuery = Property::where('landlord_id', $landlordId)->where('updated_at', '>=', now()->subDays(10))->orderBy('updated_at', 'desc');
                if ($propertyId) $propertyUpdatesQuery->where('id', $propertyId);
                $activities = $activities->merge($propertyUpdatesQuery->limit(5)->get());
            }

            $invoiceQuery = \App\Models\Invoice::where('landlord_id', $landlordId)->where('updated_at', '>=', now()->subDays(10))->with(['property', 'booking.room'])->orderBy('updated_at', 'desc');
            if ($roomId) {
                $invoiceQuery->whereHas('booking', function($q) use ($roomId) {
                    $q->where('room_id', $roomId);
                });
            } elseif ($propertyId) {
                $invoiceQuery->where('property_id', $propertyId);
            }
            $activities = $activities->merge($invoiceQuery->limit(10)->get());
            
            $paymentsQuery = \App\Models\PaymentTransaction::whereHas('invoice', function ($q) use ($landlordId, $propertyId, $roomId) {
                $q->where('landlord_id', $landlordId);
                if ($roomId) {
                    $q->whereHas('booking', function($bq) use ($roomId) {
                        $bq->where('room_id', $roomId);
                    });
                } elseif ($propertyId) {
                    $q->where('property_id', $propertyId);
                }
            })->with(['invoice.booking.room','tenant'])->orderBy('created_at', 'desc');
            $activities = $activities->merge($paymentsQuery->limit(15)->get());

            // Add Maintenance Requests
            $maintenanceQuery = \App\Models\MaintenanceRequest::where('landlord_id', $landlordId)->with(['property', 'tenant', 'booking.room'])->orderBy('created_at', 'desc');
            if ($roomId) {
                $maintenanceQuery->whereHas('booking', function($q) use ($roomId) {
                    $q->where('room_id', $roomId);
                });
            } elseif ($propertyId) {
                $maintenanceQuery->where('property_id', $propertyId);
            }
            $activities = $activities->merge($maintenanceQuery->limit(10)->get());

            // Add Addon Requests (from booking_addons)
            $addonQuery = DB::table('booking_addons')
                ->join('addons', 'booking_addons.addon_id', '=', 'addons.id')
                ->join('bookings', 'booking_addons.booking_id', '=', 'bookings.id')
                ->join('users', 'bookings.tenant_id', '=', 'users.id')
                ->where('addons.property_id', '>', 0) // dummy where
                ->select([
                    'booking_addons.*',
                    'addons.name as addon_name',
                    'users.first_name',
                    'users.last_name',
                    'bookings.room_id'
                ]);
            
            if ($roomId) {
                $addonQuery->where('bookings.room_id', $roomId);
            } elseif ($propertyId) {
                $addonQuery->where('addons.property_id', $propertyId);
            }

            $addons = $addonQuery->orderBy('booking_addons.created_at', 'desc')->limit(10)->get();
            foreach ($addons as $addon) {
                $activities->push([
                    'id' => $addon->id,
                    'type' => 'addon',
                    'action' => 'Add-on Request ' . ucfirst($addon->status),
                    'description' => "{$addon->first_name} requested {$addon->addon_name}",
                    'status' => $addon->status,
                    'timestamp' => $addon->created_at,
                    'created_at' => $addon->created_at,
                    'icon' => 'sparkles',
                    'color' => $addon->status === 'pending' ? 'yellow' : 'green'
                ]);
            }
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
