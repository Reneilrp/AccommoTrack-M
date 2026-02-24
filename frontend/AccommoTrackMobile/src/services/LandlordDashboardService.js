import api from './api';

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

const LandlordDashboardService = {
    async fetchDashboard() {
        try {
            const results = await withTimeout(
                Promise.allSettled([
                    api.get('/landlord/dashboard/stats'),
                    api.get('/landlord/dashboard/recent-activities'),
                    api.get('/landlord/dashboard/upcoming-payments'),
                    api.get('/landlord/dashboard/revenue-chart'),
                    api.get('/landlord/dashboard/property-performance'),
                ]),
                20000 // 20 second timeout for all requests
            );

            // Extract data from settled promises, use defaults for rejected ones
            const statsRes = results[0].status === 'fulfilled' ? results[0].value : { data: null };
            const activitiesRes = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
            const paymentsRes = results[2].status === 'fulfilled' ? results[2].value : { data: { upcomingCheckouts: [], unpaidBookings: [] } };
            const chartRes = results[3].status === 'fulfilled' ? results[3].value : { data: { labels: [], data: [] } };
            const performanceRes = results[4].status === 'fulfilled' ? results[4].value : { data: [] };

            return {
                success: true,
                data: {
                    stats: statsRes.data,
                    activities: activitiesRes.data || [],
                    upcomingPayments: paymentsRes.data || { upcomingCheckouts: [], unpaidBookings: [] },
                    revenueChart: chartRes.data || { labels: [], data: [] },
                    propertyPerformance: performanceRes.data || [],
                },
            };
        } catch (error) {
            console.error('Failed to load dashboard data:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to load dashboard data',
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
