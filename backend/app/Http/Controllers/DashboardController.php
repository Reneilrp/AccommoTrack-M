<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Property;
use App\Models\Room;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Get comprehensive dashboard statistics
     */
    public function getStats()
    {
        try {
            $landlordId = Auth::id();

            // Properties Stats
            $totalProperties = Property::where('landlord_id', $landlordId)->count();
            $activeProperties = Property::where('landlord_id', $landlordId)
                ->where('current_status', 'active')
                ->count();

            // Rooms Stats
            $totalRooms = Room::whereHas('property', function ($query) use ($landlordId) {
                $query->where('landlord_id', $landlordId);
            })->count();

            $occupiedRooms = Room::whereHas('property', function ($query) use ($landlordId) {
                $query->where('landlord_id', $landlordId);
            })->where('status', 'occupied')->count();

            $availableRooms = Room::whereHas('property', function ($query) use ($landlordId) {
                $query->where('landlord_id', $landlordId);
            })->where('status', 'available')->count();

            $maintenanceRooms = Room::whereHas('property', function ($query) use ($landlordId) {
                $query->where('landlord_id', $landlordId);
            })->where('status', 'maintenance')->count();

            // Occupancy Rate
            $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0;

            // Tenants Stats
            $activeTenants = Room::whereHas('property', function ($query) use ($landlordId) {
                $query->where('landlord_id', $landlordId);
            })
            ->where('status', 'occupied')
            ->whereNotNull('current_tenant_id')
            ->distinct('current_tenant_id')
            ->count('current_tenant_id');

            // Bookings Stats
            $pendingBookings = Booking::where('landlord_id', $landlordId)
                ->where('status', 'pending')
                ->count();

            $confirmedBookings = Booking::where('landlord_id', $landlordId)
                ->where('status', 'confirmed')
                ->count();

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

            return response()->json([
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
                'revenue' => [
                    'monthly' => (float) $monthlyRevenue,
                    'total' => (float) $totalRevenue,
                    'expected' => (float) $expectedRevenue
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
     * Get recent activities
     */
    public function getRecentActivities()
    {
        try {
            $landlordId = Auth::id();
            $activities = [];

            // Recent Bookings (Last 10)
            $recentBookings = Booking::where('landlord_id', $landlordId)
                ->with(['tenant', 'property', 'room'])
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($booking) {
                    return [
                        'id' => $booking->id,
                        'property_id' => $booking->property->id,
                        'type' => 'booking',
                        'action' => 'New booking request',
                        'description' => $booking->tenant->first_name . ' ' . $booking->tenant->last_name . ' requested to book ' . $booking->property->title . ' - Room ' . $booking->room->room_number,
                        'status' => $booking->status,
                        'timestamp' => $booking->created_at,
                        'icon' => 'calendar',
                        'color' => $booking->status === 'pending' ? 'yellow' : ($booking->status === 'confirmed' ? 'green' : 'gray')
                    ];
                });

            // Recent Room Status Changes (Last 5 days)
            $recentRoomChanges = Room::whereHas('property', function ($query) use ($landlordId) {
                $query->where('landlord_id', $landlordId);
            })
            ->where('updated_at', '>=', now()->subDays(5))
            ->with(['property', 'currentTenant'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($room) {
                $description = 'Room ' . $room->room_number . ' in ' . $room->property->title . ' ';
                if ($room->status === 'occupied' && $room->currentTenant) {
                    $description .= 'occupied by ' . $room->currentTenant->first_name . ' ' . $room->currentTenant->last_name;
                } else {
                    $description .= 'marked as ' . $room->status;
                }

                return [
                    'id' => $room->id,
                    'property_id' => $room->property->id,
                    'type' => 'room',
                    'action' => 'Room status updated',
                    'description' => $description,
                    'status' => $room->status,
                    'timestamp' => $room->updated_at,
                    'icon' => 'home',
                    'color' => $room->status === 'available' ? 'green' : ($room->status === 'occupied' ? 'blue' : 'yellow')
                ];
            });

            // Recent Room Creations (Last 5 days) - show when a new room was added
            $recentRoomCreates = Room::whereHas('property', function ($query) use ($landlordId) {
                $query->where('landlord_id', $landlordId);
            })
            ->where('created_at', '>=', now()->subDays(5))
            ->with(['property'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($room) {
                $actor = auth()->user();
                $actorName = $actor ? trim(($actor->first_name ?? '') . ' ' . ($actor->last_name ?? '')) : 'System';
                return [
                    'id' => $room->id,
                    'property_id' => $room->property->id,
                    'type' => 'room',
                    'action' => 'Room created',
                    'description' => 'Room ' . $room->room_number . ' added to ' . $room->property->title,
                    'status' => $room->status,
                    'timestamp' => $room->created_at,
                    'icon' => 'plus',
                    'color' => 'green',
                    'by' => $actorName,
                ];
            });

            // Recent Property Updates (Dorm profile settings changed)
            $recentPropertyUpdates = Property::where('landlord_id', $landlordId)
                ->where('updated_at', '>=', now()->subDays(5))
                ->orderBy('updated_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($property) {
                    $actor = auth()->user();
                    $actorName = $actor ? trim(($actor->first_name ?? '') . ' ' . ($actor->last_name ?? '')) : 'System';
                    return [
                        'id' => 'property-' . $property->id . '-' . strtotime($property->updated_at),
                        'property_id' => $property->id,
                        'type' => 'property',
                        'action' => 'Dorm profile updated',
                        'description' => 'Profile settings updated for ' . $property->title,
                        'status' => null,
                        'timestamp' => $property->updated_at,
                        'icon' => 'settings',
                        'color' => 'blue',
                        'by' => $actorName,
                    ];
                });

            // Recent Invoice updates (e.g., due date changed)
            $recentInvoiceUpdates = \App\Models\Invoice::where('landlord_id', $landlordId)
                ->where('updated_at', '>=', now()->subDays(5))
                ->with('property')
                ->orderBy('updated_at', 'desc')
                ->limit(8)
                ->get()
                ->map(function ($invoice) {
                    $actor = auth()->user();
                    $actorName = $actor ? trim(($actor->first_name ?? '') . ' ' . ($actor->last_name ?? '')) : 'System';
                    $desc = 'Invoice ' . ($invoice->reference ?? $invoice->id) . ' updated for ' . ($invoice->property?->title ?? 'property');
                    if ($invoice->due_date) {
                        $desc .= ' — due ' . $invoice->due_date->format('Y-m-d');
                    }
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
                        'by' => $actorName,
                    ];
                });

            // Recent Payment Transactions (payments recorded/received)
            $recentPayments = \App\Models\PaymentTransaction::whereHas('invoice', function ($q) use ($landlordId) {
                    $q->where('landlord_id', $landlordId);
                })
                ->with(['invoice','tenant'])
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($tx) {
                    $invoice = $tx->invoice;
                    $propertyId = $invoice->property_id ?? null;
                    $actorName = $tx->tenant ? trim(($tx->tenant->first_name ?? '') . ' ' . ($tx->tenant->last_name ?? '')) : 'Tenant';
                    $action = in_array($tx->status, ['succeeded', 'completed']) ? 'Payment received' : 'Payment recorded';
                    $color = $tx->status === 'succeeded' ? 'green' : ($tx->status === 'pending_offline' ? 'yellow' : 'gray');
                    return [
                        'id' => 'tx-' . $tx->id,
                        'property_id' => $propertyId,
                        'type' => 'payment',
                        'action' => $action,
                        'description' => ($actorName) . ' paid ' . number_format(($tx->amount_cents / 100), 2) . ' ' . ($tx->currency ?? 'PHP') . ' for ' . ($invoice->reference ?? 'invoice'),
                        'status' => $tx->status,
                        'timestamp' => $tx->created_at,
                        'icon' => 'credit-card',
                        'color' => $color,
                        'by' => $actorName,
                    ];
                });

            // Merge recent collections: bookings, room changes, room creations,
            // property updates, invoice updates, and payments; sort by timestamp
            $activities = collect($recentBookings)
                ->merge($recentRoomChanges)
                ->merge($recentRoomCreates)
                ->merge($recentPropertyUpdates)
                ->merge($recentInvoiceUpdates)
                ->merge($recentPayments)
                ->sortByDesc('timestamp')
                ->take(20)
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
     * Get upcoming payments/check-outs
     */
    public function getUpcomingPayments()
    {
        try {
            $landlordId = Auth::id();

            // Get bookings with upcoming end dates (next 30 days)
            $upcomingCheckouts = Booking::where('landlord_id', $landlordId)
                ->where('status', 'confirmed')
                ->whereBetween('end_date', [now(), now()->addDays(30)])
                ->with(['tenant', 'property', 'room'])
                ->orderBy('end_date', 'asc')
                ->get()
                ->map(function ($booking) {
                    $daysLeft = now()->diffInDays($booking->end_date, false);
                    
                    return [
                        'id' => $booking->id,
                        'tenantName' => $booking->tenant->first_name . ' ' . $booking->tenant->last_name,
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
            $unpaidBookings = Booking::where('landlord_id', $landlordId)
                ->where('status', 'confirmed')
                ->whereIn('payment_status', ['unpaid', 'partial'])
                ->with(['tenant', 'property', 'room'])
                ->orderBy('start_date', 'asc')
                ->get()
                ->map(function ($booking) {
                    return [
                        'id' => $booking->id,
                        'tenantName' => $booking->tenant->first_name . ' ' . $booking->tenant->last_name,
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
     * Get revenue chart data (Last 6 months)
     */
    public function getRevenueChart()
    {
        try {
            $landlordId = Auth::id();
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

    /**
     * Get property performance
     */
    public function getPropertyPerformance()
    {
        try {
            $landlordId = Auth::id();

            $properties = Property::where('landlord_id', $landlordId)
                ->with(['rooms'])
                ->get()
                ->map(function ($property) {
                    $totalRooms = $property->rooms->count();
                    $occupiedRooms = $property->rooms->where('status', 'occupied')->count();
                    $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0;

                    // Calculate total potential revenue and actual revenue respecting billing_policy
                    $potentialRevenue = $property->rooms->sum(function($r) {
                        if (($r->billing_policy ?? 'monthly') === 'daily') {
                            $prorate = $r->prorate_base ?? 30;
                            $daily = $r->daily_rate !== null ? (float)$r->daily_rate : (($r->monthly_rate !== null && $prorate) ? ((float)$r->monthly_rate / $prorate) : 0);
                            return $daily * $prorate;
                        }
                        return (float)$r->monthly_rate;
                    });
                    $actualRevenue = $property->rooms->where('status', 'occupied')->sum(function($r) {
                        if (($r->billing_policy ?? 'monthly') === 'daily') {
                            $prorate = $r->prorate_base ?? 30;
                            $daily = $r->daily_rate !== null ? (float)$r->daily_rate : (($r->monthly_rate !== null && $prorate) ? ((float)$r->monthly_rate / $prorate) : 0);
                            return $daily * $prorate;
                        }
                        return (float)$r->monthly_rate;
                    });

                    return [
                        'id' => $property->id,
                        'title' => $property->title,
                        'totalRooms' => $totalRooms,
                        'occupiedRooms' => $occupiedRooms,
                        'availableRooms' => $property->rooms->where('status', 'available')->count(),
                        'occupancyRate' => $occupancyRate,
                        'potentialRevenue' => (float) $potentialRevenue,
                        'actualRevenue' => (float) $actualRevenue,
                        'status' => $property->current_status
                    ];
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
}