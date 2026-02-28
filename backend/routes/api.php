<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\CaretakerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GeocodeController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\TenantBookingController;
use App\Http\Controllers\TenantController;
use App\Http\Controllers\TenantDashboardController;
use App\Http\Controllers\TenantPaymentController;
use App\Http\Controllers\TenantSettingsController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\PaymongoController;
use App\Http\Controllers\PaymongoWebhookController;
use App\Http\Controllers\LandlordVerificationController;
use App\Http\Controllers\AddonController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\MaintenanceRequestController;
use App\Http\Controllers\InquiryController;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\EnsureUserIsLandlord;

// ====================================
// PUBLIC ROUTES (No authentication)
// ====================================
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/inquiries', [InquiryController::class, 'store']);

// Forgot Password Routes
Route::post('/forgot-password', [App\Http\Controllers\ForgotPasswordController::class, 'sendCode']);
Route::post('/verify-code', [App\Http\Controllers\ForgotPasswordController::class, 'verifyCode']);
Route::post('/reset-password', [App\Http\Controllers\ForgotPasswordController::class, 'resetPassword']);

// Public: check if email exists
Route::get('/check-email', [AuthController::class, 'checkEmail']);

Route::get('/public/properties', [PropertyController::class, 'getAllProperties']);
Route::get('/public/properties/{id}', [PropertyController::class, 'getPropertyDetails']);
Route::get('/public/properties/{id}/reviews', [ReviewController::class, 'getPropertyReviews']);

Route::get('/rooms/{id}/details', [PropertyController::class, 'getRoomDetails']);
Route::get('/rooms/{id}/pricing', [RoomController::class, 'pricing']);
Route::get('/reverse-geocode', [GeocodeController::class, 'reverse']);
Route::post('/landlord-verification', [LandlordVerificationController::class, 'store']);
Route::get('/valid-id-types', [LandlordVerificationController::class, 'getValidIdTypes']);


// ====================================
// PROTECTED ROUTES (Authentication required)
// ====================================
Route::middleware('auth:sanctum')->group(function () {
    \Illuminate\Support\Facades\Broadcast::routes(['middleware' => ['auth:sanctum']]);
    
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);
    Route::post('/me', [AuthController::class, 'updateProfile']); // For FormData with image upload
    Route::delete('/me/profile-image', [AuthController::class, 'removeProfileImage']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // Notifications
    Route::get('/notifications', [App\Http\Controllers\NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [App\Http\Controllers\NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{id}/read', [App\Http\Controllers\NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all', [App\Http\Controllers\NotificationController::class, 'markAllAsRead']);

    // ===== TENANT ROUTES (Public property browsing) =====
    Route::get('/properties', [PropertyController::class, 'getAllProperties']);
    Route::get('/properties/accessible', [PropertyController::class, 'getAccessibleProperties']);
    Route::get('/properties/{id}', [PropertyController::class, 'getPropertyDetails']);
    Route::get('/landlord/my-verification', [LandlordVerificationController::class, 'getMyVerification']);

    // ===== TENANT-ONLY ENDPOINTS (Mobile App) =====
    Route::prefix('tenant')->group(function () {
        Route::get('/dashboard/stats', [TenantDashboardController::class, 'getStats']);
        Route::get('/dashboard/activities', [TenantDashboardController::class, 'getRecentActivities']);
        Route::get('/dashboard/upcoming', [TenantDashboardController::class, 'getUpcomingPayments']);
        
        // Tenant Dashboard - Current Stay & History
        Route::get('/current-stay', [TenantDashboardController::class, 'getCurrentStay']);
        Route::get('/history', [TenantDashboardController::class, 'getHistory']);
        
        // Tenant Addon Requests
        Route::post('/addons/request', [TenantDashboardController::class, 'requestAddon']);
        Route::delete('/addons/{addonId}/cancel', [TenantDashboardController::class, 'cancelAddonRequest']);
        // Tenant: list available addons for active booking
        Route::get('/addons/available', [TenantDashboardController::class, 'getAvailableAddons']);
        // Tenant: list current booking addon requests (active/pending)
        Route::get('/addons/requests', [TenantDashboardController::class, 'getAddonRequests']);
        
        Route::get('/bookings', [TenantBookingController::class, 'index']);
        Route::get('/bookings/{id}', [TenantBookingController::class, 'show']);
        Route::post('/bookings/{id}/invoice', [TenantBookingController::class, 'createInvoice']);
        Route::get('/payments', [TenantPaymentController::class, 'index']);
        Route::get('/payments/stats', [TenantPaymentController::class, 'getStats']);
        Route::get('/payments/{id}', [TenantPaymentController::class, 'show']);
        Route::post('/invoices/{id}/record-offline', [InvoiceController::class, 'recordOfflineForTenant']);
        // Tenant PayMongo endpoints (allow tenants to create sources/payments for their invoices)
        Route::post('/invoices/{id}/paymongo-source', [PaymongoController::class, 'createSourceForTenant']);
        Route::post('/invoices/{id}/paymongo-pay', [PaymongoController::class, 'createPaymentForTenant']);
        // Tenant: trigger a refresh that queries PayMongo for the invoice's gateway_reference
        Route::post('/invoices/{id}/paymongo-refresh', [PaymongoController::class, 'refreshInvoiceForTenant']);
        Route::get('/profile', [TenantSettingsController::class, 'getProfile']);
        Route::put('/profile', [TenantSettingsController::class, 'updateProfile']);
        Route::post('/change-password', [TenantSettingsController::class, 'changePassword']);
        // Tenant: cancel own booking
        Route::patch('/bookings/{id}/cancel', [TenantBookingController::class, 'cancel']);
        // Tenant: Reviews
        Route::post('/reviews', [ReviewController::class, 'store']);
        Route::get('/reviews', [ReviewController::class, 'getTenantReviews']);

        // Tenant: Maintenance Requests
        Route::get('/maintenance-requests', [MaintenanceRequestController::class, 'index']);
        Route::post('/maintenance-requests', [MaintenanceRequestController::class, 'store']);
    });

    // ===== LANDLORD ROUTES =====
    Route::get('/landlord/tenants', [TenantController::class, 'index']);

    Route::prefix('landlord')->middleware(EnsureUserIsLandlord::class)->group(function () {
        // Landlord Verification Status & Resubmission
        Route::get('/my-verification', [LandlordVerificationController::class, 'getMyVerification']);
        Route::get('/verification-history', [LandlordVerificationController::class, 'getVerificationHistory']);
        Route::post('/resubmit-verification', [LandlordVerificationController::class, 'resubmit']);
        
        // Landlord: Reviews
        Route::get('/reviews', [ReviewController::class, 'getLandlordReviews']);
        Route::post('/reviews/{id}/respond', [ReviewController::class, 'respond']);

        // Landlord: Maintenance Requests
        Route::get('/maintenance-requests', [MaintenanceRequestController::class, 'indexForLandlord']);
        Route::patch('/maintenance-requests/{id}/status', [MaintenanceRequestController::class, 'updateStatus']);
        
        Route::get('/properties', [PropertyController::class, 'index']);
        Route::post('/properties', [PropertyController::class, 'store']);
        Route::post('/properties/verify-password', [PropertyController::class, 'verifyPassword']);
        Route::get('/properties/{id}', [PropertyController::class, 'show']);
        Route::put('/properties/{id}', [PropertyController::class, 'update']);
        Route::delete('/properties/{id}', [PropertyController::class, 'destroy']);
        Route::post('/properties/{id}/amenities', [PropertyController::class, 'addAmenity']);
        Route::get('/properties/{propertyId}/rooms', [RoomController::class, 'index']);
        Route::get('/properties/{propertyId}/rooms/stats', [RoomController::class, 'getStats']);
        Route::post('/rooms', [RoomController::class, 'store']);
        Route::put('/rooms/{id}', [RoomController::class, 'update']);
        Route::delete('/rooms/{id}', [RoomController::class, 'destroy']);
        Route::patch('/rooms/{id}/status', [RoomController::class, 'updateStatus']);
        Route::get('/rooms', [RoomController::class, 'index']);
        Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);
        Route::get('/dashboard/recent-activities', [DashboardController::class, 'getRecentActivities']);
        Route::get('/dashboard/upcoming-payments', [DashboardController::class, 'getUpcomingPayments']);
        Route::get('/dashboard/revenue-chart', [DashboardController::class, 'getRevenueChart']);
        Route::get('/dashboard/property-performance', [DashboardController::class, 'getPropertyPerformance']);
        Route::get('/analytics/dashboard', [AnalyticsController::class, 'getDashboardAnalytics']);
        Route::get('/analytics/overview', [AnalyticsController::class, 'getOverviewStats']);
        Route::get('/analytics/revenue', [AnalyticsController::class, 'getRevenueAnalytics']);
        Route::get('/analytics/occupancy', [AnalyticsController::class, 'getOccupancyAnalytics']);
        Route::get('/analytics/room-types', [AnalyticsController::class, 'getRoomTypeAnalytics']);
        Route::get('/analytics/properties', [AnalyticsController::class, 'getPropertyComparison']);
        Route::get('/analytics/tenants', [AnalyticsController::class, 'getTenantAnalytics']);
            Route::get('/analytics/payments', [AnalyticsController::class, 'getPaymentAnalytics']);
            Route::get('/analytics/bookings', [AnalyticsController::class, 'getBookingAnalytics']);
            
            // Reports (Tenant)
            Route::post('/reports', [App\Http\Controllers\ReportController::class, 'store']);
        
            Route::post('/tenants', [TenantController::class, 'store']);
            Route::put('/tenants/{id}', [TenantController::class, 'update']);        Route::delete('/tenants/{id}', [TenantController::class, 'destroy']);
        Route::post('/tenants/{id}/assign-room', [TenantController::class, 'assignRoom']);
        Route::delete('/tenants/{id}/unassign-room', [TenantController::class, 'unassignRoom']);
        Route::get('/caretakers', [CaretakerController::class, 'index']);
        Route::post('/caretakers', [CaretakerController::class, 'store']);
        Route::patch('/caretakers/{assignmentId}', [CaretakerController::class, 'update']);
        Route::delete('/caretakers/{assignmentId}', [CaretakerController::class, 'destroy']);
        Route::post('/caretakers/{assignmentId}/reset-password', [CaretakerController::class, 'resetPassword']);
        
        // Landlord Addon Management
        Route::get('/properties/{propertyId}/addons', [AddonController::class, 'index']);
        Route::post('/properties/{propertyId}/addons', [AddonController::class, 'store']);
        Route::put('/properties/{propertyId}/addons/{addonId}', [AddonController::class, 'update']);
        Route::delete('/properties/{propertyId}/addons/{addonId}', [AddonController::class, 'destroy']);
        Route::get('/properties/{propertyId}/addons/pending', [AddonController::class, 'getPendingRequests']);
        Route::get('/properties/{propertyId}/addons/active', [AddonController::class, 'getActiveAddons']);
        Route::patch('/bookings/{bookingId}/addons/{addonId}', [AddonController::class, 'handleRequest']);
    });

    // ===== SHARED BOOKINGS =====
    // Allow authenticated users (tenants) to submit reviews via /api/reviews
    Route::post('/reviews', [ReviewController::class, 'store']);

    Route::get('/bookings', [BookingController::class, 'index']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::get('/bookings/stats', [BookingController::class, 'getStats']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
    Route::patch('/bookings/{id}/status', [BookingController::class, 'updateStatus']);
    Route::patch('/bookings/{id}/payment', [BookingController::class, 'updatePaymentStatus']);

    // ===== PAYMENTS / INVOICES =====
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::post('/invoices', [InvoiceController::class, 'store']);
    Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
    Route::post('/invoices/{id}/charge', [InvoiceController::class, 'charge']);
    Route::post('/invoices/{id}/record', [InvoiceController::class, 'recordOffline']);
    Route::get('/transactions/{id}', [TransactionController::class, 'show']);
    Route::post('/transactions/{id}/refund', [TransactionController::class, 'refund']);
    // Stripe webhook (public endpoint - ensure secret verification)
    // Stripe webhook removed - using PayMongo instead
    Route::post('/payments/webhook/paymongo', [PaymongoWebhookController::class, 'handle']);

    // PayMongo create source for invoice
    Route::post('/invoices/{id}/paymongo-source', [PaymongoController::class, 'createSource']);
    // PayMongo create payment (accepts client-side token/payment_method_id or source_id)
    Route::post('/invoices/{id}/paymongo-pay', [PaymongoController::class, 'createPayment']);

    // ===== SHARED ROOM ROUTES (for landlord and caretaker with rooms permission) =====
    Route::get('/rooms/property/{propertyId}', [RoomController::class, 'index']);
    Route::get('/rooms/property/{propertyId}/stats', [RoomController::class, 'getStats']);
    Route::patch('/rooms/{id}/status', [RoomController::class, 'updateStatus']);
    // extend stay - extend active tenant assignment by days or months
    Route::post('/rooms/{id}/extend', [RoomController::class, 'extendStay']);

    // ===== ADMIN ROUTES (Admins only) =====
    Route::prefix('admin')->middleware(EnsureUserIsAdmin::class)->group(function () {
        Route::get('/dashboard/stats', [AdminController::class, 'getDashboardStats']);
        Route::get('/dashboard/recent-activities', [AdminController::class, 'getRecentActivities']);
        Route::get('/users', [AdminController::class, 'getUsers']);
        // Route::post('/users', [AdminController::class, 'createAdmin']);
        Route::post('/users/{id}/approve', [AdminController::class, 'approveUser']);
        Route::post('/users/{id}/block', [AdminController::class, 'blockUser']);
        Route::post('/users/{id}/unblock', [AdminController::class, 'unblockUser']);
        Route::get('/properties/pending', [AdminController::class, 'getPendingProperties']);
        Route::get('/properties/approved', [AdminController::class, 'getApprovedProperties']);
        Route::get('/properties/rejected', [AdminController::class, 'getRejectedProperties']);
        Route::post('/properties/{id}/approve', [AdminController::class, 'approveProperty']);
        Route::post('/properties/{id}/reject', [AdminController::class, 'rejectProperty']);

        // Admin: Inquiries
        Route::get('/inquiries', [InquiryController::class, 'index']);
        Route::patch('/inquiries/{id}', [InquiryController::class, 'update']);
        Route::delete('/inquiries/{id}', [InquiryController::class, 'destroy']);
	    Route::post('/inquiries/{id}/reply', [InquiryController::class, 'reply']);

        // Admin: list all landlord verifications
        Route::get('/landlord-verifications', [LandlordVerificationController::class, 'index']);
        // Admin: reject landlord verification with reason
        Route::post('/landlord-verifications/{id}/reject', [AdminController::class, 'rejectVerification']);

        // Admin: Reports
        Route::get('/reports', [App\Http\Controllers\ReportController::class, 'index']);
        Route::patch('/reports/{id}', [App\Http\Controllers\ReportController::class, 'update']);
 });

    Route::prefix('messages')->group(function () {
        Route::get('/conversations', [MessageController::class, 'getConversations']);
        Route::get('/unread-count', [MessageController::class, 'getUnreadCount']);
        Route::get('/{conversationId}', [MessageController::class, 'getMessages']);
        Route::post('/send', [MessageController::class, 'sendMessage']);
        Route::post('/start', [MessageController::class, 'startConversation']);
    });
});
