import api from './api.js';

/**
 * Landlord dashboard aggregated data fetcher mirroring the web admin endpoints.
 */

// Helper to add timeout to promises
const withTimeout = (promise, ms = 15000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), ms)
        )
    ]);
};

// Change the Timeout logic

const LandlordDashboardService = {
    async fetchDashboard(options = {}) {
        try {
            // New optimized approach: fetch all data in a single request bundle
            const response = await withTimeout(
                api.get('/landlord/dashboard/bundle'),
                25000 // Slightly longer timeout for the bundle
            );

            if (response.data && response.data.success) {
                return response.data;
            }

            // Fallback: If bundle fails or is not supported yet (legacy backend), 
            // the catch block will handle it or we can manually trigger the old flow.
            throw new Error('Bundle endpoint returned failure status');
        } catch (error) {
            console.warn('Dashboard bundle failed, falling back to individual requests:', error.message);
            
            // LEGACY FALLBACK: individual requests (to be removed once bundle is verified stable)
            try {
                const { includeRevenueChart = true } = options;
                const revenueChartRequest = includeRevenueChart
                    ? api.get('/landlord/dashboard/revenue-chart')
                    : Promise.resolve({ data: { labels: [], data: [] } });

                const results = await withTimeout(
                    Promise.allSettled([
                        api.get('/landlord/dashboard/stats'),
                        api.get('/landlord/dashboard/recent-activities'),
                        api.get('/landlord/dashboard/upcoming-payments'),
                        revenueChartRequest,
                        api.get('/landlord/dashboard/property-performance'),
                    ]),
                    20000
                );

                const statsRes = results[0].status === 'fulfilled' ? results[0].value : { data: null };
                const activitiesRes = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
                const paymentsRes = results[2].status === 'fulfilled' ? results[2].value : { data: { upcomingCheckouts: [], unpaidBookings: [], billingHealth: {} } };
                const chartRes = results[3].status === 'fulfilled' ? results[3].value : { data: { labels: [], data: [] } };
                const performanceRes = results[4].status === 'fulfilled' ? results[4].value : { data: [] };

                return {
                    success: true,
                    data: {
                        stats: statsRes.data,
                        activities: activitiesRes.data || [],
                        upcomingPayments: paymentsRes.data,
                        revenueChart: chartRes.data || { labels: [], data: [] },
                        propertyPerformance: performanceRes.data || [],
                    },
                };
            } catch (fallbackError) {
                console.error('Final dashboard fetch failure:', fallbackError);
                return {
                    success: false,
                    error: fallbackError.response?.data?.message || fallbackError.message || 'Failed to load dashboard data',
                };
            }
        }
    },

    async fetchUnreadNotificationsCount() {
        try {
            const response = await api.get('/notifications/unread-count?role=landlord');
            const payload = response?.data;
            const rawCount =
                payload?.count ??
                payload?.data?.count ??
                payload?.unread_count ??
                payload?.data?.unread_count ??
                (typeof payload === 'number' ? payload : 0);
            const normalizedCount = Number(rawCount);

            return {
                success: true,
                data: Number.isFinite(normalizedCount) ? normalizedCount : 0,
            };
        } catch (error) {
            console.error('Failed to fetch unread notification count:', error);
            return {
                success: false,
                data: 0
            };
        }
    },

    async fetchPropertyActivities(propertyId) {
        try {
            const response = await api.get(`/landlord/dashboard/recent-activities?property_id=${propertyId}`);
            return {
                success: true,
                data: response.data || []
            };
        } catch (error) {
            console.error('Failed to fetch property activities:', error);
            return {
                success: false,
                data: [],
                error: error.response?.data?.message || error.message || 'Failed to load activity'
            };
        }
    }
};

export default LandlordDashboardService;
