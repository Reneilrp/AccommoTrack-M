<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Services\AnalyticsService;
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
            $this->assertNotCaretaker($context);

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
            $this->assertNotCaretaker($context);

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
            $this->assertNotCaretaker($context);

            $propertyId = $this->resolveValidatedPropertyId($request, $context);
            $timeRange = $request->query('time_range', 'month');
            $dateRange = $this->analyticsService->getDateRange($timeRange);

            $data = $this->analyticsService->calculateRevenueAnalytics(
                $context['landlord_id'],
                $propertyId,
                $dateRange
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
            $this->assertNotCaretaker($context);

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
            $this->assertNotCaretaker($context);

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
            $this->assertNotCaretaker($context);

            $data = $this->analyticsService->calculatePropertyComparison($context['landlord_id']);

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
            $this->assertNotCaretaker($context);

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
            $this->assertNotCaretaker($context);

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
            $this->assertNotCaretaker($context);

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
