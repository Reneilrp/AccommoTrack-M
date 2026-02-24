<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use Illuminate\Http\Request;
use App\Models\Property;
use App\Models\Room;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    use ResolvesLandlordAccess;

    /**
     * Get comprehensive dashboard statistics
     */
    public function getStats(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $landlordId = $context['landlord_id'];
            $isCaretaker = $context['is_caretaker'];
            $assignedPropertyIds = null;

            if ($isCaretaker && $context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
            }

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
            $addonQuery = \DB::table('booking_addons')
                ->join('addons', 'booking_addons.addon_id', '=', 'addons.id')
                ->join('properties', 'addons.property_id', '=', 'properties.id')
                ->where('properties.landlord_id', $landlordId);
            if ($assignedPropertyIds) $addonQuery->whereIn('addons.property_id', $assignedPropertyIds);
            $pendingAddons = $addonQuery->where('booking_addons.status', 'pending')->count();

            $response = [
                'properties' => [
                    'total' => $totalProperties,
                    'active' => $activeProperties,
                ],
                'rooms' => [
                    'total' => $totalRooms,
                    'occupied' => $occupiedRooms,
                    'available' => $availableRooms,
                    'maintenance' => $maintenanceRooms,
                    'occupancyRate' => $occupancyRate
                ],
                'tenants' => [
                    'active' => $activeTenants
                ],
                'bookings' => [
                    'pending' => $pendingBookings,
                    'confirmed' => $confirmedBookings
                ],
                'requests' => [
                    'maintenance' => $pendingMaintenance,
                    'addons' => $pendingAddons
                ]
            ];

            // Only include revenue stats for Landlords
            if (!$isCaretaker) {
                // Revenue Stats (This month)
                $monthlyRevenue = Booking::where('landlord_id', $landlordId)
                    ->where('status', 'confirmed')
                    ->where('payment_status', 'paid')
                    ->whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year)
                    ->sum('monthly_rent');

                // Total Revenue (All time from confirmed paid bookings)
                $totalRevenue = Booking::where('landlord_id', $landlordId)
                    ->where('status', 'confirmed')
                    ->where('payment_status', 'paid')
                    ->sum('total_amount');

                // Expected Revenue (Confirmed but unpaid/partial)
                $expectedRevenue = Booking::where('landlord_id', $landlordId)
                    ->where('status', 'confirmed')
                    ->whereIn('payment_status', ['unpaid', 'partial'])
                    ->sum('total_amount');

                $response['revenue'] = [
                    'monthly' => (float) $monthlyRevenue,
                    'total' => (float) $totalRevenue,
                    'expected' => (float) $expectedRevenue
                ];
            }

            return response()->json($response, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch dashboard stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get recent activities
     */
    public function getRecentActivities(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $landlordId = $context['landlord_id'];
            $isCaretaker = $context['is_caretaker'];
            $assignedPropertyIds = null;

            if ($isCaretaker && $context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
            }

            $propertyId = $request->query('property_id');
            // If caretaker, they can only filter by properties they are assigned to
            if ($isCaretaker && $propertyId && (!is_array($assignedPropertyIds) || !in_array((int)$propertyId, $assignedPropertyIds))) {
                $propertyId = null;
            }
            
            $activities = [];

            // Recent Bookings
            $recentBookingsQuery = Booking::where('landlord_id', $landlordId)
                ->with(['tenant', 'property', 'room'])
                ->orderBy('created_at', 'desc');
            
            if ($propertyId) $recentBookingsQuery->where('property_id', $propertyId);
            elseif ($assignedPropertyIds) $recentBookingsQuery->whereIn('property_id', $assignedPropertyIds);

            $recentBookings = $recentBookingsQuery->limit(20)
                ->get()
                ->map(function ($booking) {
                    return [
                        'id' => $booking->id,
                        'property_id' => $booking->property->id,
                        'type' => 'booking',
                        'action' => 'New booking request',
                        'description' => ($booking->tenant->first_name ?? 'Someone') . ' ' . ($booking->tenant->last_name ?? '') . ' requested to book ' . ($booking->property->title ?? 'a property') . ' - Room ' . ($booking->room->room_number ?? 'N/A'),
                        'status' => $booking->status,
                        'timestamp' => $booking->created_at,
                        'icon' => 'calendar',
                        'color' => $booking->status === 'pending' ? 'yellow' : ($booking->status === 'confirmed' ? 'green' : 'gray')
                    ];
                });

            // Recent Room Status Changes
            $recentRoomChangesQuery = Room::whereHas('property', function ($query) use ($landlordId, $propertyId, $assignedPropertyIds) {
                $query->where('landlord_id', $landlordId);
                if ($propertyId) $query->where('id', $propertyId);
                elseif ($assignedPropertyIds) $query->whereIn('id', $assignedPropertyIds);
            })
            ->where('updated_at', '>=', now()->subDays(10))
            ->with(['property', 'currentTenant'])
            ->orderBy('updated_at', 'desc');

            $recentRoomChanges = $recentRoomChangesQuery->limit(10)
            ->get()
            ->map(function ($room) {
                $description = 'Room ' . ($room->room_number ?? 'N/A') . ' in ' . ($room->property->title ?? 'a property') . ' ';
                if ($room->status === 'occupied' && $room->currentTenant) {
                    $description .= 'occupied by ' . ($room->currentTenant->first_name ?? 'Tenant') . ' ' . ($room->currentTenant->last_name ?? '');
                } else {
                    $description .= 'marked as ' . ($room->status ?? 'unknown');
                }

                return [
                    'id' => $room->id,
                    'property_id' => $room->property->id ?? null,
                    'type' => 'room',
                    'action' => 'Room status updated',
                    'description' => $description,
                    'status' => $room->status,
                    'timestamp' => $room->updated_at,
                    'icon' => 'home',
                    'color' => $room->status === 'available' ? 'green' : ($room->status === 'occupied' ? 'blue' : 'yellow')
                ];
            });

            // Recent Room Creations
            $recentRoomCreatesQuery = Room::whereHas('property', function ($query) use ($landlordId, $propertyId, $assignedPropertyIds) {
                $query->where('landlord_id', $landlordId);
                if ($propertyId) $query->where('id', $propertyId);
                elseif ($assignedPropertyIds) $query->whereIn('id', $assignedPropertyIds);
            })
            ->where('created_at', '>=', now()->subDays(10))
            ->with(['property'])
            ->orderBy('created_at', 'desc');

            $recentRoomCreates = $recentRoomCreatesQuery->limit(10)
            ->get()
            ->map(function ($room) {
                $actor = auth()->user();
                $actorName = $actor ? trim(($actor->first_name ?? '') . ' ' . ($actor->last_name ?? '')) : 'System';
                return [
                    'id' => $room->id,
                    'property_id' => $room->property->id ?? null,
                    'type' => 'room',
                    'action' => 'Room created',
                    'description' => 'Room ' . ($room->room_number ?? 'N/A') . ' added to ' . ($room->property->title ?? 'a property'),
                    'status' => $room->status,
                    'timestamp' => $room->created_at,
                    'icon' => 'plus',
                    'color' => 'green',
                    'by' => $actorName,
                ];
            });

            $activities = collect($recentBookings)
                ->merge($recentRoomChanges)
                ->merge($recentRoomCreates);

            // Only include non-financial management activities for landlords
            if (!$isCaretaker) {
                // Recent Property Updates
                $recentPropertyUpdatesQuery = Property::where('landlord_id', $landlordId)
                    ->where('updated_at', '>=', now()->subDays(10))
                    ->orderBy('updated_at', 'desc');
                
                if ($propertyId) $recentPropertyUpdatesQuery->where('id', $propertyId);

                $recentPropertyUpdates = $recentPropertyUpdatesQuery->limit(5)
                    ->get()
                    ->map(function ($property) {
                        $actor = auth()->user();
                        $actorName = $actor ? trim(($actor->first_name ?? '') . ' ' . ($actor->last_name ?? '')) : 'System';
                        return [
                            'id' => 'property-' . $property->id . '-' . strtotime($property->updated_at),
                            'property_id' => $property->id,
                            'type' => 'property',
                            'action' => 'Dorm profile updated',
                            'description' => 'Profile settings updated for ' . ($property->title ?? 'a property'),
                            'status' => null,
                            'timestamp' => $property->updated_at,
                            'icon' => 'settings',
                            'color' => 'blue',
                            'by' => $actorName,
                        ];
                    });

                // Recent Invoice updates
                $recentInvoiceUpdatesQuery = \App\Models\Invoice::where('landlord_id', $landlordId)
                    ->where('updated_at', '>=', now()->subDays(10))
                    ->with('property')
                    ->orderBy('updated_at', 'desc');

                if ($propertyId) $recentInvoiceUpdatesQuery->where('property_id', $propertyId);

                $recentInvoiceUpdates = $recentInvoiceUpdatesQuery->limit(10)
                    ->get()
                    ->map(function ($invoice) {
                        $desc = 'Invoice ' . ($invoice->reference ?? $invoice->id) . ' updated for ' . ($invoice->property?->title ?? 'property');
                        return [
                            'id' => 'invoice-' . $invoice->id,
                            'property_id' => $invoice->property?->id ?? null,
                            'type' => 'invoice',
                            'action' => 'Invoice updated',
                            'description' => $desc,
                            'status' => $invoice->status ?? null,
                            'timestamp' => $invoice->updated_at,
                            'icon' => 'file-text',
                            'color' => 'purple',
                        ];
                    });

                // Recent Payment Transactions
                $recentPaymentsQuery = \App\Models\PaymentTransaction::whereHas('invoice', function ($q) use ($landlordId, $propertyId) {
                        $q->where('landlord_id', $landlordId);
                        if ($propertyId) $q->where('property_id', $propertyId);
                    })
                    ->with(['invoice','tenant'])
                    ->orderBy('created_at', 'desc');

                $recentPayments = $recentPaymentsQuery->limit(15)
                    ->get()
                    ->map(function ($tx) {
                        $invoice = $tx->invoice;
                        $actorName = $tx->tenant ? trim(($tx->tenant->first_name ?? '') . ' ' . ($tx->tenant->last_name ?? '')) : 'Tenant';
                        return [
                            'id' => 'tx-' . $tx->id,
                            'property_id' => $invoice->property_id ?? null,
                            'type' => 'payment',
                            'action' => in_array($tx->status, ['succeeded', 'completed']) ? 'Payment received' : 'Payment recorded',
                            'description' => ($actorName) . ' paid ' . number_format(($tx->amount_cents / 100), 2) . ' ' . ($tx->currency ?? 'PHP') . ' for ' . ($invoice->reference ?? 'invoice'),
                            'status' => $tx->status,
                            'timestamp' => $tx->created_at,
                            'icon' => 'credit-card',
                            'color' => $tx->status === 'succeeded' ? 'green' : 'yellow',
                            'by' => $actorName,
                        ];
                    });

                $activities = $activities->merge($recentPropertyUpdates)
                    ->merge($recentInvoiceUpdates)
                    ->merge($recentPayments);
            }

            $activities = $activities->sortByDesc('timestamp');
            $limit = $propertyId ? 50 : 20;
            $activities = $activities->take($limit)->values();

            return response()->json($activities, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch recent activities',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get upcoming payments/check-outs
     */
    public function getUpcomingPayments(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $landlordId = $context['landlord_id'];
            $isCaretaker = $context['is_caretaker'];
            $assignedPropertyIds = null;

            if ($isCaretaker && $context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
            }

            // Get bookings with upcoming end dates (next 30 days)
            $upcomingCheckoutsQuery = Booking::where('landlord_id', $landlordId)
                ->where('status', 'confirmed')
                ->whereBetween('end_date', [now(), now()->addDays(30)])
                ->with(['tenant', 'property', 'room'])
                ->orderBy('end_date', 'asc');
            
            if ($assignedPropertyIds) $upcomingCheckoutsQuery->whereIn('property_id', $assignedPropertyIds);

            $upcomingCheckouts = $upcomingCheckoutsQuery->get()
                ->map(function ($booking) {
                    $daysLeft = now()->diffInDays($booking->end_date, false);
                    return [
                        'id' => $booking->id,
                        'tenantName' => ($booking->tenant->first_name ?? 'Tenant') . ' ' . ($booking->tenant->last_name ?? ''),
                        'propertyTitle' => $booking->property->title ?? 'Property',
                        'roomNumber' => $booking->room->room_number ?? 'N/A',
                        'endDate' => $booking->end_date->format('Y-m-d'),
                        'daysLeft' => (int) $daysLeft,
                        'urgency' => $daysLeft <= 7 ? 'high' : ($daysLeft <= 14 ? 'medium' : 'low')
                    ];
                });

            $unpaidBookings = [];
            // Only show unpaid bookings (financial) to Landlords
            if (!$isCaretaker) {
                $unpaidBookingsQuery = Booking::where('landlord_id', $landlordId)
                    ->where('status', 'confirmed')
                    ->whereIn('payment_status', ['unpaid', 'partial'])
                    ->with(['tenant', 'property', 'room'])
                    ->orderBy('start_date', 'asc');

                $unpaidBookings = $unpaidBookingsQuery->get()
                    ->map(function ($booking) {
                        return [
                            'id' => $booking->id,
                            'tenantName' => ($booking->tenant->first_name ?? 'Tenant') . ' ' . ($booking->tenant->last_name ?? ''),
                            'propertyTitle' => $booking->property->title ?? 'Property',
                            'roomNumber' => $booking->room->room_number ?? 'N/A',
                            'dueDate' => $booking->start_date->format('Y-m-d'),
                            'amount' => (float) $booking->total_amount,
                            'paymentStatus' => $booking->payment_status,
                            'type' => 'payment'
                        ];
                    });
            }

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
     * Get property performance
     */
    public function getPropertyPerformance(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $landlordId = $context['landlord_id'];
            $isCaretaker = $context['is_caretaker'];
            $assignedPropertyIds = null;

            if ($isCaretaker && $context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
            }

            $propertiesQuery = Property::where('landlord_id', $landlordId)->with(['rooms']);
            if ($assignedPropertyIds) $propertiesQuery->whereIn('id', $assignedPropertyIds);

            $properties = $propertiesQuery->get()
                ->map(function ($property) use ($isCaretaker) {
                    $totalRooms = $property->rooms->count();
                    $occupiedRooms = $property->rooms->where('status', 'occupied')->count();
                    $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0;

                    $data = [
                        'id' => $property->id,
                        'title' => $property->title,
                        'totalRooms' => $totalRooms,
                        'occupiedRooms' => $occupiedRooms,
                        'availableRooms' => $property->rooms->where('status', 'available')->count(),
                        'occupancyRate' => $occupancyRate,
                        'status' => $property->current_status
                    ];

                    // Hide revenue from caretakers
                    if (!$isCaretaker) {
                        $data['potentialRevenue'] = (float) $property->rooms->sum('monthly_rate');
                        $data['actualRevenue'] = (float) $property->rooms->where('status', 'occupied')->sum('monthly_rate');
                    }

                    return $data;
                })
                ->sortByDesc('occupancyRate')
                ->values();

            return response()->json($properties, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch property performance',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get revenue chart data (Last 6 months)
     */
    public function getRevenueChart(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->assertNotCaretaker($context); // Hard block financial chart

            $landlordId = $context['landlord_id'];
            $months = [];
            $revenue = [];

            // Get last 6 months data
            for ($i = 5; $i >= 0; $i--) {
                $date = now()->subMonths($i);
                $monthName = $date->format('M');
                
                $monthRevenue = Booking::where('landlord_id', $landlordId)
                    ->where('status', 'confirmed')
                    ->where('payment_status', 'paid')
                    ->whereMonth('created_at', $date->month)
                    ->whereYear('created_at', $date->year)
                    ->sum('monthly_rent');

                $months[] = $monthName;
                $revenue[] = (float) $monthRevenue;
            }

            return response()->json([
                'labels' => $months,
                'data' => $revenue
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch revenue chart',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
