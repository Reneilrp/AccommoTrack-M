<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;

use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Services\LandlordDashboardService;
use Illuminate\Http\Request;

class LandlordDashboardController extends Controller
{
    use ResolvesLandlordAccess;

    protected LandlordDashboardService $dashboardService;

    public function __construct(LandlordDashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    public function getStats(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $assignedPropertyIds = ($context['is_caretaker'] && $context['assignment']) ? $context['assignment']->getAssignedPropertyIds() : null;
            
            $stats = $this->dashboardService->getStats(
                $context['landlord_id'],
                $assignedPropertyIds,
                $context['is_caretaker']
            );

            return response()->json($stats, 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch dashboard stats', 'error' => $e->getMessage()], 500);
        }
    }

    public function getRecentActivities(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $assignedPropertyIds = ($context['is_caretaker'] && $context['assignment']) ? $context['assignment']->getAssignedPropertyIds() : null;
            $propertyId = $request->query('property_id');
            if ($context['is_caretaker'] && $propertyId && !in_array((int)$propertyId, $assignedPropertyIds)) {
                $propertyId = null;
            }

            $activities = $this->dashboardService->getRecentActivities(
                $context['landlord_id'],
                $assignedPropertyIds,
                $context['is_caretaker'],
                $propertyId
            );
            // Transformation logic standardized for Mobile activity maps
            $formattedActivities = $activities->map(function ($item) {
                if ($item instanceof \App\Models\Booking) {
                    return [
                        'id' => $item->id, 'type' => 'booking',
                        'action' => 'New booking request',
                        'description' => ($item->tenant->first_name ?? 'Someone') . ' requested ' . ($item->property->title ?? 'Property') . ' - Room ' . ($item->room->room_number ?? 'N/A'),
                        'status' => $item->status, 'timestamp' => $item->created_at, 'icon' => 'calendar', 'color' => $item->status === 'pending' ? 'yellow' : 'green'
                    ];
                }
                if ($item instanceof \App\Models\Room) {
                    $isNew = $item->created_at->diffInMinutes($item->updated_at) < 5;
                    return [
                        'id' => $item->id, 'type' => 'room',
                        'action' => $isNew ? 'New Room Added' : 'Room Status Updated',
                        'description' => "Room {$item->room_number} in {$item->property->title} is now " . ucfirst($item->status),
                        'status' => $item->status, 'timestamp' => $item->updated_at, 'icon' => 'bed', 'color' => $item->status === 'occupied' ? 'blue' : ($item->status === 'available' ? 'green' : 'yellow')
                    ];
                }
                if ($item instanceof \App\Models\Property) {
                    return [
                        'id' => $item->id, 'type' => 'property',
                        'action' => 'Property Updated',
                        'description' => "Details for property '{$item->title}' were recently updated.",
                        'status' => 'active', 'timestamp' => $item->updated_at, 'icon' => 'business', 'color' => 'blue'
                    ];
                }
                if ($item instanceof \App\Models\Invoice) {
                    return [
                        'id' => $item->id, 'type' => 'payment',
                        'action' => 'New Invoice Generated',
                        'description' => "Invoice #{$item->reference} created for room {$item->room_id}",
                        'status' => $item->status, 'timestamp' => $item->created_at, 'icon' => 'cash-outline', 'color' => 'gray'
                    ];
                }
                if ($item instanceof \App\Models\PaymentTransaction) {
                    return [
                        'id' => $item->id, 'type' => 'payment',
                        'action' => 'Payment Received',
                        'description' => "Received ₱" . number_format($item->amount_cents/100, 2) . " via " . ucfirst($item->method),
                        'status' => 'confirmed', 'timestamp' => $item->created_at, 'icon' => 'cash-outline', 'color' => 'green'
                    ];
                }
                return (array) $item;
            });
            
            $limit = $propertyId ? 50 : 20;
            return response()->json($formattedActivities->take($limit), 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch recent activities', 'error' => $e->getMessage()], 500);
        }
    }

    public function getUpcomingPayments(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $assignedPropertyIds = ($context['is_caretaker'] && $context['assignment']) ? $context['assignment']->getAssignedPropertyIds() : null;
            
            $data = $this->dashboardService->getUpcomingPayments($context['landlord_id'], $assignedPropertyIds, $context['is_caretaker']);

            $upcomingCheckouts = $data['upcomingCheckouts']->map(function ($booking) {
                $daysLeft = now()->diffInDays($booking->end_date, false);  
                return [
                    'id' => $booking->id, 
                    'tenantName' => ($booking->tenant->first_name ?? 'Tenant') . ' ' . ($booking->tenant->last_name ?? ''),
                    'propertyTitle' => $booking->property->title ?? 'Property', 'roomNumber' => $booking->room->room_number ?? 'N/A',
                    'endDate' => $booking->end_date->format('Y-m-d'), 'daysLeft' => (int) $daysLeft,
                    'urgency' => $daysLeft <= 7 ? 'high' : ($daysLeft <= 14 ? 'medium' : 'low')
                ];
            });

            $unpaidBookings = collect($data['unpaidBookings'])->map(function ($booking) {
                return [
                    'id' => $booking->id, 
                    'tenantName' => ($booking->tenant->first_name ?? 'Tenant') . ' ' . ($booking->tenant->last_name ?? ''),
                    'propertyTitle' => $booking->property->title ?? 'Property', 'roomNumber' => $booking->room->room_number ?? 'N/A',
                    'dueDate' => $booking->start_date->format('Y-m-d'), 'amount' => (float) $booking->total_amount,
                    'paymentStatus' => $booking->payment_status, 'type' => 'payment'
                ];
            });

            return response()->json(['upcomingCheckouts' => $upcomingCheckouts, 'unpaidBookings' => $unpaidBookings], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch upcoming payments', 'error' => $e->getMessage()], 500);
        }
    }

    public function getPropertyPerformance(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $assignedPropertyIds = ($context['is_caretaker'] && $context['assignment']) ? $context['assignment']->getAssignedPropertyIds() : null;

            $properties = $this->dashboardService->getPropertyPerformance($context['landlord_id'], $assignedPropertyIds);

            $formattedProperties = $properties->map(function ($property) use ($context) {
                $totalRooms = $property->rooms->count();
                $occupiedRooms = $property->rooms->where('status', 'occupied')->count();
                $data = [
                    'id' => $property->id, 'title' => $property->title, 'totalRooms' => $totalRooms,
                    'occupiedRooms' => $occupiedRooms, 'availableRooms' => $property->rooms->where('status', 'available')->count(),
                    'occupancyRate' => $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0,
                    'status' => $property->current_status
                ];
                if (!$context['is_caretaker']) {
                    $data['potentialRevenue'] = (float) $property->rooms->sum('monthly_rate');
                    $data['actualRevenue'] = (float) $property->rooms->where('status', 'occupied')->sum('monthly_rate');
                }
                return $data;
            })->sortByDesc('occupancyRate')->values();

            return response()->json($formattedProperties, 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch property performance', 'error' => $e->getMessage()], 500);
        }
    }

    public function getRevenueChart(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->assertNotCaretaker($context);
            
            $revenueData = $this->dashboardService->getRevenueChart($context['landlord_id']);

            return response()->json([
                'labels' => array_keys($revenueData),
                'data' => array_values($revenueData)
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch revenue chart', 'error' => $e->getMessage()], 500);
        }
    }
}
