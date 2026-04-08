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
            $roomId = $request->query('room_id');

            if ($context['is_caretaker'] && $propertyId && ! in_array((int) $propertyId, $assignedPropertyIds)) {
                $propertyId = null;
            }

            $activities = $this->dashboardService->getRecentActivities(
                $context['landlord_id'],
                $assignedPropertyIds,
                $context['is_caretaker'],
                $propertyId,
                $roomId
            );
            // Transformation logic standardized for Mobile activity maps
            $formattedActivities = $activities->map(function ($item) {
                if (is_array($item)) {
                    return $this->normalizeActivityPayload($item);
                }

                if ($item instanceof \App\Models\Booking) {
                    $status = strtolower((string) $item->status);

                    return [
                        'id' => $item->id, 'type' => 'booking',
                        'action' => 'New booking request',
                        'description' => ($item->tenant->first_name ?? 'Someone').' requested '.($item->property->title ?? 'Property').' - Room '.($item->room->room_number ?? 'N/A'),
                        'by' => ($item->tenant->first_name ?? 'Someone').' '.($item->tenant->last_name ?? ''),
                        'status' => $status,
                        'timestamp' => $item->created_at,
                        'icon' => 'calendar',
                        'color' => $this->resolveActivityColor('booking', $status),
                    ];
                }
                if ($item instanceof \App\Models\Room) {
                    $isNew = $item->created_at->diffInMinutes($item->updated_at) < 5;
                    $status = strtolower((string) $item->status);

                    return [
                        'id' => $item->id, 'type' => 'room',
                        'action' => $isNew ? 'New Room Added' : 'Room Status Updated',
                        'description' => "Room {$item->room_number} in {$item->property->title} is now ".ucfirst($item->status),
                        'by' => 'System',
                        'status' => $status,
                        'timestamp' => $item->updated_at,
                        'icon' => 'bed',
                        'color' => $this->resolveActivityColor('room', $status),
                    ];
                }
                if ($item instanceof \App\Models\Property) {
                    return [
                        'id' => $item->id, 'type' => 'property',
                        'action' => 'Property Updated',
                        'description' => "Details for property '{$item->title}' were recently updated.",
                        'by' => 'Landlord',
                        'status' => 'updated',
                        'timestamp' => $item->updated_at,
                        'icon' => 'business',
                        'color' => $this->resolveActivityColor('property', 'updated', 'blue'),
                    ];
                }
                if ($item instanceof \App\Models\Invoice) {
                    $status = strtolower((string) $item->status);

                    return [
                        'id' => $item->id, 'type' => 'payment',
                        'action' => 'New Invoice Generated',
                        'description' => "Invoice #{$item->reference} created for room ".($item->booking->room->room_number ?? 'N/A'),
                        'by' => 'System',
                        'status' => $status,
                        'timestamp' => $item->created_at,
                        'icon' => 'cash-outline',
                        'color' => $this->resolveActivityColor('payment', $status, 'gray'),
                    ];
                }
                if ($item instanceof \App\Models\PaymentTransaction) {
                    $isPending = $item->status === 'pending_offline';
                    $invoiceStatus = (string) ($item->invoice->status ?? '');
                    $method = (string) ($item->method ?? '');
                    $isPaymongoMethod = str_starts_with($method, 'paymongo_');

                    // Only for PayMongo: avoid misleading "Payment Received" items
                    // for attempts that did not settle the invoice.
                    if (! $isPending && $isPaymongoMethod && $invoiceStatus !== 'paid') {
                        return null;
                    }

                    $status = $isPending ? 'pending' : 'confirmed';

                    return [
                        'id' => $item->id, 'type' => 'payment',
                        'action' => $isPending ? 'Cash Payment Awaiting Verification' : 'Payment Received',
                        'description' => ($isPending ? 'Recorded ' : 'Received ').'₱'.number_format($item->amount_cents / 100, 2).' via '.ucfirst($item->method).' for Room '.($item->invoice->booking->room->room_number ?? 'N/A'),
                        'by' => ($item->tenant->first_name ?? 'Tenant').' '.($item->tenant->last_name ?? ''),
                        'status' => $status,
                        'timestamp' => $item->created_at,
                        'icon' => 'cash-outline',
                        'color' => $this->resolveActivityColor('payment', $status),
                    ];
                }
                if ($item instanceof \App\Models\MaintenanceRequest) {
                    $status = strtolower((string) $item->status);

                    return [
                        'id' => $item->id, 'type' => 'maintenance',
                        'action' => 'Maintenance Request '.ucfirst($item->status),
                        'description' => "{$item->title} - Room ".($item->booking->room->room_number ?? 'N/A'),
                        'by' => ($item->tenant->first_name ?? 'Tenant').' '.($item->tenant->last_name ?? ''),
                        'status' => $status,
                        'timestamp' => $item->created_at,
                        'icon' => 'wrench',
                        'color' => $this->resolveActivityColor('maintenance', $status),
                    ];
                }

                return $this->normalizeActivityPayload((array) $item);
            })->filter()->values();

            $limit = $propertyId ? 50 : 20;

            return response()->json($formattedActivities->take($limit), 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch recent activities', 'error' => $e->getMessage()], 500);
        }
    }

    private function normalizeActivityPayload(array $payload): array
    {
        $type = isset($payload['type']) ? (string) $payload['type'] : 'generic';
        $status = isset($payload['status']) ? strtolower((string) $payload['status']) : null;
        $providedColor = isset($payload['color']) ? (string) $payload['color'] : null;

        if ($status !== null) {
            $payload['status'] = $status;
        }

        $payload['color'] = $this->resolveActivityColor($type, $status, $providedColor);

        return $payload;
    }

    private function resolveActivityColor(string $type, ?string $status, ?string $providedColor = null): string
    {
        $mappedColor = $this->mapActivityStatusToColor($type, $status);

        if ($mappedColor !== null) {
            return $mappedColor;
        }

        $normalizedProvidedColor = strtolower((string) $providedColor);
        if (in_array($normalizedProvidedColor, ['green', 'blue', 'yellow', 'red', 'gray'], true)) {
            return $normalizedProvidedColor;
        }

        return 'gray';
    }

    private function mapActivityStatusToColor(string $type, ?string $status): ?string
    {
        $normalizedType = strtolower(trim($type));
        $normalizedStatus = strtolower(trim((string) $status));

        if ($normalizedStatus === '') {
            return null;
        }

        if ($normalizedType === 'property' && in_array($normalizedStatus, ['updated', 'changed'], true)) {
            return 'blue';
        }

        if ($normalizedType === 'room' && $normalizedStatus === 'occupied') {
            return 'blue';
        }

        if ($normalizedType === 'maintenance' && $normalizedStatus === 'pending') {
            return 'red';
        }

        if (in_array($normalizedStatus, ['cancelled', 'canceled', 'rejected', 'failed', 'declined', 'overdue'], true)) {
            return 'red';
        }

        if (in_array($normalizedStatus, ['pending', 'pending_offline', 'in_progress', 'partial', 'partial-completed', 'processing'], true)) {
            return 'yellow';
        }

        if (in_array($normalizedStatus, ['confirmed', 'completed', 'paid', 'approved', 'active', 'available', 'resolved', 'succeeded', 'verified'], true)) {
            return 'green';
        }

        if (in_array($normalizedStatus, ['inactive', 'maintenance', 'draft'], true)) {
            return 'gray';
        }

        return null;
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
                    'tenantName' => ($booking->tenant->first_name ?? 'Tenant').' '.($booking->tenant->last_name ?? ''),
                    'propertyTitle' => $booking->property->title ?? 'Property', 'roomNumber' => $booking->room->room_number ?? 'N/A',
                    'endDate' => $booking->end_date->format('Y-m-d'), 'daysLeft' => (int) $daysLeft,
                    'urgency' => $daysLeft <= 7 ? 'high' : ($daysLeft <= 14 ? 'medium' : 'low'),
                ];
            });

            $unpaidBookings = collect($data['unpaidBookings'])->map(function ($booking) {
                return [
                    'id' => $booking->id,
                    'tenantName' => ($booking->tenant->first_name ?? 'Tenant').' '.($booking->tenant->last_name ?? ''),
                    'propertyTitle' => $booking->property->title ?? 'Property', 'roomNumber' => $booking->room->room_number ?? 'N/A',
                    'dueDate' => $booking->start_date->format('Y-m-d'), 'amount' => (float) $booking->total_amount,
                    'paymentStatus' => $booking->payment_status, 'type' => 'payment',
                ];
            });

            $vacatingSoon = collect($data['vacatingSoon'] ?? [])->map(function ($booking) {
                $daysLeft = now()->diffInDays($booking->end_date, false);

                return [
                    'id' => $booking->id,
                    'tenantName' => ($booking->tenant->first_name ?? 'Tenant').' '.($booking->tenant->last_name ?? ''),
                    'propertyTitle' => $booking->property->title ?? 'Property',
                    'roomNumber' => $booking->room->room_number ?? 'N/A',
                    'endDate' => optional($booking->end_date)->format('Y-m-d'),
                    'noticeGivenAt' => optional($booking->notice_given_at)->format('Y-m-d'),
                    'daysLeft' => (int) $daysLeft,
                    'urgency' => $daysLeft <= 7 ? 'high' : ($daysLeft <= 21 ? 'medium' : 'low'),
                ];
            });

            $dueForBilling = collect($data['billingHealth']['due_for_billing'] ?? [])->map(function ($booking) {
                return [
                    'id' => $booking->id,
                    'tenantName' => ($booking->tenant->first_name ?? 'Tenant').' '.($booking->tenant->last_name ?? ''),
                    'propertyTitle' => $booking->property->title ?? 'Property',
                    'roomNumber' => $booking->room->room_number ?? 'N/A',
                    'nextBillingDate' => optional($booking->next_billing_date)->format('Y-m-d'),
                    'monthlyRent' => (float) ($booking->monthly_rent ?? 0),
                ];
            });

            $overdueInvoices = collect($data['billingHealth']['overdue_invoices'] ?? [])->map(function ($invoice) {
                return [
                    'id' => $invoice->id,
                    'reference' => $invoice->reference,
                    'tenantName' => ($invoice->tenant->first_name ?? 'Tenant').' '.($invoice->tenant->last_name ?? ''),
                    'propertyTitle' => $invoice->property->title ?? 'Property',
                    'roomNumber' => $invoice->booking?->room?->room_number ?? 'N/A',
                    'dueDate' => optional($invoice->due_date)->format('Y-m-d'),
                    'amount' => (float) round(($invoice->amount_cents ?? 0) / 100, 2),
                    'status' => $invoice->status,
                ];
            });

            $dueSoonInvoices = collect($data['billingHealth']['due_soon_invoices'] ?? [])->map(function ($invoice) {
                return [
                    'id' => $invoice->id,
                    'reference' => $invoice->reference,
                    'tenantName' => ($invoice->tenant->first_name ?? 'Tenant').' '.($invoice->tenant->last_name ?? ''),
                    'propertyTitle' => $invoice->property->title ?? 'Property',
                    'roomNumber' => $invoice->booking?->room?->room_number ?? 'N/A',
                    'dueDate' => optional($invoice->due_date)->format('Y-m-d'),
                    'amount' => (float) round(($invoice->amount_cents ?? 0) / 100, 2),
                    'status' => $invoice->status,
                ];
            });

            return response()->json([
                'upcomingCheckouts' => $upcomingCheckouts,
                'unpaidBookings' => $unpaidBookings,
                'vacatingSoon' => $vacatingSoon,
                'billingHealth' => [
                    'dueForBillingCount' => (int) ($data['billingHealth']['due_for_billing_count'] ?? 0),
                    'dueForBilling' => $dueForBilling,
                    'overdueInvoicesCount' => (int) ($data['billingHealth']['overdue_invoices_count'] ?? 0),
                    'overdueInvoicesAmount' => (float) ($data['billingHealth']['overdue_invoices_amount'] ?? 0),
                    'dueSoonInvoicesCount' => (int) ($data['billingHealth']['due_soon_invoices_count'] ?? 0),
                    'dueSoonInvoicesAmount' => (float) ($data['billingHealth']['due_soon_invoices_amount'] ?? 0),
                    'overdueInvoices' => $overdueInvoices,
                    'dueSoonInvoices' => $dueSoonInvoices,
                ],
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch upcoming payments', 'error' => $e->getMessage()], 500);
        }
    }

    public function getPropertyPerformance(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $assignedPropertyIds = ($context['is_caretaker'] && $context['assignment']) ? $context['assignment']->getAssignedPropertyIds() : null;

            // Service now returns ['properties' => ..., 'revenueByProperty' => ...]
            $result = $this->dashboardService->getPropertyPerformance($context['landlord_id'], $assignedPropertyIds);
            $properties = $result['properties'];
            $revenueByProperty = $result['revenueByProperty'];

            $formattedProperties = $properties->map(function ($property) use ($context, $revenueByProperty) {
                $totalRooms = $property->rooms->count();
                $occupiedRooms = $property->rooms->where('status', 'occupied')->count();
                $data = [
                    'id' => $property->id, 'title' => $property->title, 'totalRooms' => $totalRooms,
                    'occupiedRooms' => $occupiedRooms, 'availableRooms' => $property->rooms->where('status', 'available')->count(),
                    'occupancyRate' => $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0,
                    'status' => $property->current_status,
                ];
                if (! $context['is_caretaker']) {
                    // potentialRevenue = sum of all room rates (what you could earn if full)
                    $data['potentialRevenue'] = (float) $property->rooms->sum('monthly_rate');
                    // actualRevenue = sum of payments actually received for this property
                    $data['actualRevenue'] = (float) ($revenueByProperty[$property->id] ?? 0);
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
                'data' => array_values($revenueData),
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch revenue chart', 'error' => $e->getMessage()], 500);
        }
    }
}
