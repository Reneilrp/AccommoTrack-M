<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Services\AnalyticsService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class AnalyticsController extends Controller
{
    use ResolvesLandlordAccess;

    protected AnalyticsService $analyticsService;

    public function __construct(AnalyticsService $analyticsService)
    {
        $this->analyticsService = $analyticsService;
    }

    /**
     * Get comprehensive analytics dashboard data
     */
    public function getDashboardAnalytics(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_analytics');

            $propertyId = $this->resolveValidatedPropertyId($request, $context);
            $timeRange = $request->query('time_range', 'month');

            $data = $this->analyticsService->getDashboardAnalytics(
                $context['landlord_id'],
                $propertyId,
                $timeRange
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getDashboardAnalytics error', ['exception' => $e]);

            return $this->buildErrorResponse($e, 'Failed to fetch analytics');
        }
    }

    /**
     * Get Overview Statistics
     */
    public function getOverviewStats(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_analytics');

            $propertyId = $this->resolveValidatedPropertyId($request, $context);

            $data = $this->analyticsService->calculateOverviewStats(
                $context['landlord_id'],
                $propertyId
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getOverviewStats error', ['exception' => $e]);

            return $this->buildErrorResponse($e, 'Failed to fetch overview stats');
        }
    }

    /**
     * Get Revenue Analytics
     */
    public function getRevenueAnalytics(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_analytics');

            $propertyId = $this->resolveValidatedPropertyId($request, $context);
            $timeRange = $request->query('time_range', 'month');
            $dateRange = $this->analyticsService->getDateRange($timeRange);

            $data = $this->analyticsService->calculateRevenueAnalytics(
                $context['landlord_id'],
                $propertyId,
                $dateRange,
                $timeRange
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getRevenueAnalytics error', ['exception' => $e]);

            return $this->buildErrorResponse($e, 'Failed to fetch revenue analytics');
        }
    }

    /**
     * Get Occupancy Analytics
     */
    public function getOccupancyAnalytics(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_analytics');

            $propertyId = $this->resolveValidatedPropertyId($request, $context);

            $data = $this->analyticsService->calculateOccupancyAnalytics(
                $context['landlord_id'],
                $propertyId
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getOccupancyAnalytics error', ['exception' => $e]);

            return $this->buildErrorResponse($e, 'Failed to fetch occupancy analytics');
        }
    }

    /**
     * Get Room Type Analytics
     */
    public function getRoomTypeAnalytics(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_analytics');

            $propertyId = $this->resolveValidatedPropertyId($request, $context);

            $data = $this->analyticsService->calculateRoomTypeAnalytics(
                $context['landlord_id'],
                $propertyId
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getRoomTypeAnalytics error', ['exception' => $e]);

            return $this->buildErrorResponse($e, 'Failed to fetch room type analytics');
        }
    }

    /**
     * Get Property Comparison
     */
    public function getPropertyComparison(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_analytics');

            $propertyId = $this->resolveValidatedPropertyId($request, $context);
            $timeRange = $request->query('time_range', 'month');
            $dateRange = $this->analyticsService->getDateRange($timeRange);

            $data = $this->analyticsService->calculatePropertyComparison(
                $context['landlord_id'],
                $propertyId,
                $dateRange
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getPropertyComparison error', ['exception' => $e]);

            return $this->buildErrorResponse($e, 'Failed to fetch property comparison');
        }
    }

    /**
     * Get Tenant Analytics
     */
    public function getTenantAnalytics(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_analytics');

            $propertyId = $this->resolveValidatedPropertyId($request, $context);
            $timeRange = $request->query('time_range', 'month');
            $dateRange = $this->analyticsService->getDateRange($timeRange);

            $data = $this->analyticsService->calculateTenantAnalytics(
                $context['landlord_id'],
                $propertyId,
                $dateRange
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getTenantAnalytics error', ['exception' => $e]);

            return $this->buildErrorResponse($e, 'Failed to fetch tenant analytics');
        }
    }

    /**
     * Get Payment Analytics
     */
    public function getPaymentAnalytics(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_analytics');

            $propertyId = $this->resolveValidatedPropertyId($request, $context);

            $data = $this->analyticsService->calculatePaymentAnalytics(
                $context['landlord_id'],
                $propertyId
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getPaymentAnalytics error', ['exception' => $e]);

            return $this->buildErrorResponse($e, 'Failed to fetch payment analytics');
        }
    }

    /**
     * Get Booking Analytics
     */
    public function getBookingAnalytics(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_analytics');

            $propertyId = $this->resolveValidatedPropertyId($request, $context);
            $timeRange = $request->query('time_range', 'month');
            $dateRange = $this->analyticsService->getDateRange($timeRange);

            $data = $this->analyticsService->calculateBookingAnalytics(
                $context['landlord_id'],
                $propertyId,
                $dateRange
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getBookingAnalytics error', ['exception' => $e]);

            return $this->buildErrorResponse($e, 'Failed to fetch booking analytics');
        }
    }

    /**
     * Export analytics summary as CSV.
     */
    public function exportAnalyticsCsv(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_analytics');

            $propertyId = $this->resolveValidatedPropertyId($request, $context);
            $timeRange = strtolower((string) $request->query('time_range', 'month'));
            if (! in_array($timeRange, ['week', 'month', 'year'], true)) {
                $timeRange = 'month';
            }

            $dateRange = $this->analyticsService->getDateRange($timeRange);
            $startDateInput = $request->query('start_date');
            $endDateInput = $request->query('end_date');
            if ($startDateInput && $endDateInput) {
                try {
                    $start = Carbon::parse((string) $startDateInput)->startOfDay();
                    $end = Carbon::parse((string) $endDateInput)->endOfDay();
                } catch (\Throwable $exception) {
                    return response()->json([
                        'message' => 'Invalid start_date or end_date format. Expected a valid date string.',
                    ], 422);
                }

                if ($end->lt($start)) {
                    return response()->json([
                        'message' => 'Invalid export window. end_date must be greater than or equal to start_date.',
                    ], 422);
                }

                $dateRange = ['start' => $start, 'end' => $end];
            }

            $landlordId = $context['landlord_id'];
            $overview = $this->analyticsService->calculateOverviewStats($landlordId, $propertyId);
            $revenue = $this->analyticsService->calculateRevenueAnalytics($landlordId, $propertyId, $dateRange, $timeRange);
            $payments = $this->analyticsService->calculatePaymentAnalytics($landlordId, $propertyId);
            $tenants = $this->analyticsService->calculateTenantAnalytics($landlordId, $propertyId, $dateRange);
            $bookings = $this->analyticsService->calculateBookingAnalytics($landlordId, $propertyId, $dateRange);
            $properties = $this->analyticsService->calculatePropertyComparison($landlordId, $propertyId, $dateRange);

            $rows = [
                ['AccommoTrack Analytics Report'],
                ['Generated At', now()->toDateTimeString()],
                ['Time Range', strtoupper($timeRange)],
                ['Start Date', $dateRange['start']->toDateString()],
                ['End Date', $dateRange['end']->toDateString()],
                ['Property', $propertyId ? ('Property #'.$propertyId) : 'All Properties'],
                [],
                ['Section', 'Metric', 'Value'],
                ['Overview', 'Total Properties', $overview['total_properties'] ?? 0],
                ['Overview', 'Total Rooms', $overview['total_rooms'] ?? 0],
                ['Overview', 'Occupied Rooms', $overview['occupied_rooms'] ?? 0],
                ['Overview', 'Available Rooms', $overview['available_rooms'] ?? 0],
                ['Overview', 'Occupancy Rate (%)', $overview['occupancy_rate'] ?? 0],
                ['Overview', 'Monthly Revenue', $overview['monthly_revenue'] ?? 0],
                ['Overview', 'Total Revenue', $overview['total_revenue'] ?? 0],
                ['Payments', 'Paid', $payments['paid'] ?? 0],
                ['Payments', 'Unpaid', $payments['unpaid'] ?? 0],
                ['Payments', 'Partial', $payments['partial'] ?? 0],
                ['Payments', 'Overdue', $payments['overdue'] ?? 0],
                ['Payments', 'Payment Rate (%)', $payments['payment_rate'] ?? 0],
                ['Tenants', 'Active Tenants', $tenants['total'] ?? 0],
                ['Tenants', 'Average Stay (Months)', $tenants['average_stay_months'] ?? 0],
                ['Tenants', 'Move Ins', $tenants['move_ins'] ?? 0],
                ['Tenants', 'Move Outs', $tenants['move_outs'] ?? 0],
                ['Bookings', 'Total', $bookings['total'] ?? 0],
                ['Bookings', 'Pending', $bookings['pending'] ?? 0],
                ['Bookings', 'Confirmed', $bookings['confirmed'] ?? 0],
                ['Bookings', 'Completed', $bookings['completed'] ?? 0],
                ['Bookings', 'Cancelled', $bookings['cancelled'] ?? 0],
                [],
                ['Revenue Trend', 'Period', 'Revenue'],
            ];

            foreach (($revenue['monthly_trend'] ?? []) as $point) {
                $rows[] = [
                    'Revenue Trend',
                    $point['month'] ?? '',
                    $point['revenue'] ?? 0,
                ];
            }

            $rows[] = [];
            $rows[] = ['Property Performance', 'Property', 'Monthly Revenue'];
            foreach ($properties as $property) {
                $rows[] = [
                    'Property Performance',
                    $property['name'] ?? $property['title'] ?? 'Property',
                    $property['monthly_revenue'] ?? 0,
                ];
            }

            $handle = fopen('php://temp', 'w+');
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
            rewind($handle);
            $csv = stream_get_contents($handle) ?: '';
            fclose($handle);

            $filename = sprintf('AccommoTrack_Analytics_%s_%s.csv', $timeRange, now()->format('Y-m-d'));

            return response("\xEF\xBB\xBF".$csv, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            ]);
        } catch (\Exception $e) {
            Log::error('Analytics exportAnalyticsCsv error', ['exception' => $e]);

            return $this->buildErrorResponse($e, 'Failed to export analytics CSV');
        }
    }

    private function buildErrorResponse(\Exception $e, string $fallbackMessage)
    {
        $statusCode = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500;

        return response()->json([
            'message' => $e->getMessage() ?: $fallbackMessage,
            'error' => $e->getMessage(),
        ], $statusCode);
    }

    /**
     * Normalize and validate property filter before analytics queries.
     */
    private function resolveValidatedPropertyId(Request $request, array $context): ?int
    {
        $propertyId = $request->query('property_id');

        if ($propertyId === null || $propertyId === '' || $propertyId === 'all') {
            return null;
        }

        $propertyId = (int) $propertyId;
        if ($propertyId <= 0) {
            return null;
        }

        $this->checkPropertyAccess($context, $propertyId);

        return $propertyId;
    }
}
