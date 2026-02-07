<?php

namespace App\Http\Controllers;

use App\Services\AnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AnalyticsController extends Controller
{
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
            $landlordId = Auth::id();
            if (is_null($landlordId)) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
            $propertyId = $request->query('property_id');
            $timeRange = $request->query('time_range', 'month');

            $data = $this->analyticsService->getDashboardAnalytics(
                $landlordId,
                $propertyId ? (int) $propertyId : null,
                $timeRange
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getDashboardAnalytics error', ['exception' => $e]);
            return response()->json([
                'message' => 'Failed to fetch analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Overview Statistics
     */
    public function getOverviewStats(Request $request)
    {
        try {
            $landlordId = Auth::id();
            if (is_null($landlordId)) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
            $propertyId = $request->query('property_id');

            $data = $this->analyticsService->calculateOverviewStats(
                $landlordId,
                $propertyId ? (int) $propertyId : null
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getOverviewStats error', ['exception' => $e]);
            return response()->json([
                'message' => 'Failed to fetch overview stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Revenue Analytics
     */
    public function getRevenueAnalytics(Request $request)
    {
        try {
            $landlordId = Auth::id();
            if (is_null($landlordId)) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
            $propertyId = $request->query('property_id');
            $timeRange = $request->query('time_range', 'month');
            $dateRange = $this->analyticsService->getDateRange($timeRange);

            $data = $this->analyticsService->calculateRevenueAnalytics(
                $landlordId,
                $propertyId ? (int) $propertyId : null,
                $dateRange
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getRevenueAnalytics error', ['exception' => $e]);
            return response()->json([
                'message' => 'Failed to fetch revenue analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Occupancy Analytics
     */
    public function getOccupancyAnalytics(Request $request)
    {
        try {
            $landlordId = Auth::id();
            if (is_null($landlordId)) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
            $propertyId = $request->query('property_id');

            $data = $this->analyticsService->calculateOccupancyAnalytics(
                $landlordId,
                $propertyId ? (int) $propertyId : null
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getOccupancyAnalytics error', ['exception' => $e]);
            return response()->json([
                'message' => 'Failed to fetch occupancy analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Room Type Analytics
     */
    public function getRoomTypeAnalytics(Request $request)
    {
        try {
            $landlordId = Auth::id();
            if (is_null($landlordId)) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
            $propertyId = $request->query('property_id');

            $data = $this->analyticsService->calculateRoomTypeAnalytics(
                $landlordId,
                $propertyId ? (int) $propertyId : null
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getRoomTypeAnalytics error', ['exception' => $e]);
            return response()->json([
                'message' => 'Failed to fetch room type analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Property Comparison
     */
    public function getPropertyComparison(Request $request)
    {
        try {
            $landlordId = Auth::id();
            if (is_null($landlordId)) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            $data = $this->analyticsService->calculatePropertyComparison($landlordId);

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getPropertyComparison error', ['exception' => $e]);
            return response()->json([
                'message' => 'Failed to fetch property comparison',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Tenant Analytics
     */
    public function getTenantAnalytics(Request $request)
    {
        try {
            $landlordId = Auth::id();
            if (is_null($landlordId)) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
            $propertyId = $request->query('property_id');
            $timeRange = $request->query('time_range', 'month');
            $dateRange = $this->analyticsService->getDateRange($timeRange);

            $data = $this->analyticsService->calculateTenantAnalytics(
                $landlordId,
                $propertyId ? (int) $propertyId : null,
                $dateRange
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getTenantAnalytics error', ['exception' => $e]);
            return response()->json([
                'message' => 'Failed to fetch tenant analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Payment Analytics
     */
    public function getPaymentAnalytics(Request $request)
    {
        try {
            $landlordId = Auth::id();
            if (is_null($landlordId)) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
            $propertyId = $request->query('property_id');

            $data = $this->analyticsService->calculatePaymentAnalytics(
                $landlordId,
                $propertyId ? (int) $propertyId : null
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getPaymentAnalytics error', ['exception' => $e]);
            return response()->json([
                'message' => 'Failed to fetch payment analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Booking Analytics
     */
    public function getBookingAnalytics(Request $request)
    {
        try {
            $landlordId = Auth::id();
            if (is_null($landlordId)) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
            $propertyId = $request->query('property_id');
            $timeRange = $request->query('time_range', 'month');
            $dateRange = $this->analyticsService->getDateRange($timeRange);

            $data = $this->analyticsService->calculateBookingAnalytics(
                $landlordId,
                $propertyId ? (int) $propertyId : null,
                $dateRange
            );

            return response()->json($data, 200);
        } catch (\Exception $e) {
            Log::error('Analytics getBookingAnalytics error', ['exception' => $e]);
            return response()->json([
                'message' => 'Failed to fetch booking analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}