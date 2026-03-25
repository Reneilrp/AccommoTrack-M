<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Common\AuthController;
use App\Http\Controllers\Common\ForgotPasswordController;
use App\Http\Controllers\Common\GeocodeController;
use App\Http\Controllers\Common\InquiryController;
use App\Http\Controllers\Common\InvoiceController;
use App\Http\Controllers\Common\MaintenanceRequestController;
use App\Http\Controllers\Common\MessageController;
use App\Http\Controllers\Common\NotificationController;
use App\Http\Controllers\Common\PaymentController;
use App\Http\Controllers\Common\PaymongoController;
use App\Http\Controllers\Common\PaymongoWebhookController;
use App\Http\Controllers\Common\ReportController;
use App\Http\Controllers\Common\ReviewController;
use App\Http\Controllers\Common\TransactionController;
use App\Http\Controllers\Landlord\AddonController;
use App\Http\Controllers\Landlord\AnalyticsController;
use App\Http\Controllers\Landlord\CaretakerController;
use App\Http\Controllers\Landlord\LandlordBookingController;
use App\Http\Controllers\Landlord\LandlordController;
use App\Http\Controllers\Landlord\LandlordDashboardController;
use App\Http\Controllers\Landlord\LandlordVerificationController;
use App\Http\Controllers\Landlord\PropertyController;
use App\Http\Controllers\Landlord\RoomController;
use App\Http\Controllers\Landlord\TenantController;
use App\Http\Controllers\Tenant\TenantBookingController;
use App\Http\Controllers\Tenant\TenantDashboardController;
use App\Http\Controllers\Tenant\TenantPaymentController;
use App\Http\Controllers\Tenant\TenantSettingsController;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\EnsureUserIsLandlord;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

// ====================================
// PUBLIC ROUTES (No authentication)
// ====================================
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth-attempts');
Route::post('/verify-email-otp', [AuthController::class, 'verifyEmailOtp'])->middleware('throttle:auth-attempts');
Route::post('/resend-email-otp', [AuthController::class, 'resendEmailOtp'])->middleware('throttle:auth-attempts');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth-attempts');
Route::post('/inquiries', [InquiryController::class, 'store']);

// Forgot Password Routes
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendCode'])->middleware('throttle:auth-attempts');
Route::post('/verify-code', [ForgotPasswordController::class, 'verifyCode'])->middleware('throttle:auth-attempts');
Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword'])->middleware('throttle:auth-attempts');

// Public: check if email exists
Route::get('/check-email', [AuthController::class, 'checkEmail'])->middleware('throttle:10,1');

Route::get('/public/properties', [PropertyController::class, 'getAllProperties']);
Route::get('/public/properties/{id}', [PropertyController::class, 'getPropertyDetails']);
Route::get('/public/properties/{id}/reviews', [ReviewController::class, 'getPropertyReviews']);

// --- Add aliases to match frontend Service calls that omit /public prefix ---
Route::get('/properties', [PropertyController::class, 'getAllProperties']);
Route::middleware('auth:sanctum')->get('/properties/accessible', [PropertyController::class, 'getAccessibleProperties']);
Route::get('/properties/{id}', [PropertyController::class, 'getPropertyDetails']);
// ---------------------------------------------------------------------------

Route::post('/payments/webhook/paymongo', [PaymongoWebhookController::class, 'handle']);

Route::get('/rooms/{id}/details', [PropertyController::class, 'getRoomDetails']);
Route::get('/rooms/{room}/payment-options', [RoomController::class, 'getPaymentOptions']);
Route::get('/rooms/{id}/pricing', [RoomController::class, 'pricing']);
Route::get('/reverse-geocode', [GeocodeController::class, 'reverse']);
Route::post('/landlord-verification', [LandlordVerificationController::class, 'store']);
Route::get('/valid-id-types', [LandlordVerificationController::class, 'getValidIdTypes']);

// --- Room Aliases for Mobile Frontend ---
Route::put('/rooms/{id}', [RoomController::class, 'update'])->middleware('auth:sanctum');
Route::delete('/rooms/{id}', [RoomController::class, 'destroy'])->middleware('auth:sanctum');
Route::patch('/rooms/{id}/status', [RoomController::class, 'updateStatus']);
// ----------------------------------------

// ====================================
// PROTECTED ROUTES (Authentication required)
// ====================================
Route::middleware('auth:sanctum')->group(function () {
    Broadcast::routes(['middleware' => ['auth:sanctum']]);

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/switch-role', [AuthController::class, 'switchRole']);
    Route::put('/me', [AuthController::class, 'updateProfile']);
    Route::post('/me', [AuthController::class, 'updateProfile']); // For FormData with image upload
    Route::delete('/me/profile-image', [AuthController::class, 'removeProfileImage']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // Extension Requests
    Route::get('/extensions', [\App\Http\Controllers\Tenant\ExtensionController::class, 'index']);
    Route::post('/bookings/{id}/extend', [\App\Http\Controllers\Tenant\ExtensionController::class, 'store']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    // ===== TENANT ROUTES (Public property browsing) =====
    Route::get('/properties', [PropertyController::class, 'getAllProperties']);
    Route::get('/properties/accessible', [PropertyController::class, 'getAccessibleProperties']);
    Route::get('/properties/{id}', [PropertyController::class, 'getPropertyDetails']);
    Route::get('/properties/{id}/stats', [PropertyController::class, 'getStats']);
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

        // --- Aliases for Mobile Frontend (using /tenant/reviews prefix) ---
        Route::prefix('reviews')->group(function () {
            Route::post('/', [ReviewController::class, 'store']);
            Route::get('/', [ReviewController::class, 'getTenantReviews']);
            Route::put('/{id}', [ReviewController::class, 'update']);
            Route::delete('/{id}', [ReviewController::class, 'destroy']);
        });
        // ------------------------------------------------------------------

        // Tenant: Maintenance Requests
        Route::get('/maintenance-requests', [MaintenanceRequestController::class, 'index']);
        Route::post('/maintenance-requests', [MaintenanceRequestController::class, 'store']);

        // Tenant: Create Payment Link
        Route::post('/rooms/{room}/payment-link', [PaymentController::class, 'createPaymentLink']);

        // Tenant: Generate Cash Invoice
        Route::post('/rooms/{room}/generate-cash-invoice', [InvoiceController::class, 'generateCashInvoice']);

        // Tenant: Resubmit verification documents after rejection
        Route::post('/resubmit-verification', [LandlordVerificationController::class, 'resubmit']);

        // Tenant: room transfer requests
        Route::get('/transfers', [\App\Http\Controllers\Tenant\TransferController::class, 'index']);
        Route::get('/transfers/options', [\App\Http\Controllers\Tenant\TransferController::class, 'options']);
        Route::post('/transfers', [\App\Http\Controllers\Tenant\TransferController::class, 'store']);
        Route::patch('/transfers/{id}/cancel', [\App\Http\Controllers\Tenant\TransferController::class, 'cancel']);
    });

    // ===== LANDLORD ROUTES =====
    Route::get('/landlord/tenants', [TenantController::class, 'index']);

    Route::prefix('landlord')->middleware(EnsureUserIsLandlord::class)->group(function () {
        // Landlord Verification Status & Resubmission
        Route::get('/verification-history', [LandlordVerificationController::class, 'getVerificationHistory']);
        Route::post('/resubmit-verification', [LandlordVerificationController::class, 'resubmit']);

        // Landlord: Reviews
        Route::get('/reviews', [ReviewController::class, 'getLandlordReviews']);
        Route::post('/reviews/{id}/respond', [ReviewController::class, 'respond']);

        // Landlord: Maintenance Requests
        Route::get('/maintenance-requests', [MaintenanceRequestController::class, 'indexForLandlord']);
        Route::patch('/maintenance-requests/{id}/status', [MaintenanceRequestController::class, 'updateStatus']);

        // Landlord: PayMongo Onboarding
        Route::get('/paymongo/onboarding', [LandlordController::class, 'getOnboardingUrl']);

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
        Route::post('/rooms/{id}/assign-tenant', [RoomController::class, 'assignTenant']);
        Route::delete('/rooms/{id}/remove-tenant', [RoomController::class, 'removeTenant']);
        Route::get('/rooms', [RoomController::class, 'index']);
        Route::get('/dashboard/stats', [LandlordDashboardController::class, 'getStats']);
        Route::get('/dashboard/recent-activities', [LandlordDashboardController::class, 'getRecentActivities']);
        Route::get('/dashboard/upcoming-payments', [LandlordDashboardController::class, 'getUpcomingPayments']);
        Route::get('/dashboard/revenue-chart', [LandlordDashboardController::class, 'getRevenueChart']);
        Route::get('/dashboard/property-performance', [LandlordDashboardController::class, 'getPropertyPerformance']);
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
        Route::post('/reports', [ReportController::class, 'store']);

        Route::post('/tenants', [TenantController::class, 'store']);
        Route::put('/tenants/{id}', [TenantController::class, 'update']);
        Route::delete('/tenants/{id}', [TenantController::class, 'destroy']);
        Route::post('/tenants/{id}/assign-room', [TenantController::class, 'assignRoom']);
        Route::post('/tenants/{id}/transfer-room', [TenantController::class, 'transferRoom']);
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

        // Landlord: Add a rule to a property
        Route::post('/properties/{id}/rules', [PropertyController::class, 'addRule']);

        // Landlord: Get single tenant
        Route::get('/tenants/{id}', [TenantController::class, 'show']);

        // Landlord: Extension requests handling
        Route::get('/extensions', [\App\Http\Controllers\Landlord\ExtensionController::class, 'index']);
        Route::patch('/extensions/{id}/handle', [\App\Http\Controllers\Landlord\ExtensionController::class, 'handle']);

        // Landlord: Transfer requests handling
        Route::post('/broadcast', [TenantController::class, 'broadcast']);
        Route::post('/tenants/{id}/evict', [TenantController::class, 'evict']);
        Route::get('/transfers', [\App\Http\Controllers\Landlord\TransferController::class, 'index']);
        Route::patch('/transfers/{id}/handle', [\App\Http\Controllers\Landlord\TransferController::class, 'handle']);
        Route::get('/transfers/{id}/proration', [\App\Http\Controllers\Landlord\TransferController::class, 'calculateProration']);
    });

    // ===== SHARED BOOKINGS =====
    // Allow authenticated users (tenants) to submit reviews via /api/reviews
    Route::post('/reviews', [ReviewController::class, 'store']);
    // Allow authenticated users (tenants) to submit reports
    Route::post('/reports', [ReportController::class, 'store']);

    Route::get('/bookings', [LandlordBookingController::class, 'index']);
    Route::post('/bookings', [LandlordBookingController::class, 'store'])->middleware('throttle:5,1');
    Route::get('/bookings/stats', [LandlordBookingController::class, 'getStats']);
    Route::get('/bookings/{id}', [LandlordBookingController::class, 'show']);
    Route::patch('/bookings/{id}/status', [LandlordBookingController::class, 'updateStatus']);
    Route::patch('/bookings/{id}/payment', [LandlordBookingController::class, 'updatePaymentStatus']);

    // ===== PAYMENTS / INVOICES =====
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::post('/invoices', [InvoiceController::class, 'store']);
    Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
    Route::post('/invoices/{id}/charge', [InvoiceController::class, 'charge']);
    Route::post('/invoices/{id}/record', [InvoiceController::class, 'recordOffline']);
    Route::post('/invoices/{id}/verify-cash', [InvoiceController::class, 'verifyCash']);
    Route::get('/transactions/{id}', [TransactionController::class, 'show']);
    Route::post('/transactions/{id}/refund', [TransactionController::class, 'refund']);
    // Stripe webhook (public endpoint - ensure secret verification)
    // Stripe webhook removed - using PayMongo instead

    // PayMongo create source for invoice
    Route::post('/invoices/{id}/paymongo-source', [PaymongoController::class, 'createSource']);
    // PayMongo create payment (accepts client-side token/payment_method_id or source_id)
    Route::post('/invoices/{id}/paymongo-pay', [PaymongoController::class, 'createPayment']);

    // ===== SHARED ROOM ROUTES (for landlord and caretaker with rooms permission) =====
    Route::get('/rooms/property/{propertyId}', [RoomController::class, 'index']);
    Route::get('/rooms/property/{propertyId}/stats', [RoomController::class, 'getStats']);
    Route::patch('/rooms/{id}/status', [RoomController::class, 'updateStatus']);
    Route::post('/rooms/{id}/assign-tenant', [RoomController::class, 'assignTenant']);
    Route::delete('/rooms/{id}/remove-tenant', [RoomController::class, 'removeTenant']);
    // extend stay - extend active tenant assignment by days or months
    Route::post('/rooms/{id}/extend', [RoomController::class, 'extendStay']);
    // Alias for mobile frontend (without /tenant/ prefix)
    Route::post('/rooms/{room}/generate-cash-invoice', [InvoiceController::class, 'generateCashInvoice']);

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
        Route::get('/properties/maintenance', [AdminController::class, 'getMaintenanceProperties']);
        Route::post('/properties/{id}/approve', [AdminController::class, 'approveProperty']);
        Route::post('/properties/{id}/reject', [AdminController::class, 'rejectProperty']);
        Route::post('/properties/{id}/maintenance', [AdminController::class, 'putUnderMaintenance']);

        // Admin: Inquiries
        Route::prefix('inquiries')->group(function () {
            Route::get('/', [InquiryController::class, 'index']);
            Route::patch('/{id}', [InquiryController::class, 'update']);
            Route::delete('/{id}', [InquiryController::class, 'destroy']);
            Route::post('/{id}/reply', [InquiryController::class, 'reply']);
        });

        // Admin: list all landlord verifications
        Route::get('/landlord-verifications', [LandlordVerificationController::class, 'index']);
        // Admin: reject landlord verification with reason
        Route::post('/landlord-verifications/{id}/reject', [AdminController::class, 'rejectVerification']);

        // Admin: Reports
        Route::get('/reports', [ReportController::class, 'index']);
        Route::patch('/reports/{id}', [ReportController::class, 'update']);
    });

    Route::prefix('messages')->group(function () {
        Route::get('/conversations', [MessageController::class, 'getConversations']);
        Route::get('/unread-count', [MessageController::class, 'getUnreadCount']);
        Route::get('/{conversationId}', [MessageController::class, 'getMessages']);
        Route::post('/send', [MessageController::class, 'sendMessage']);
        Route::post('/start', [MessageController::class, 'startConversation']);
    });
});
