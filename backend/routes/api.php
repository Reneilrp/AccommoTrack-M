<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\TenantController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\TenantDashboardController;
use App\Http\Controllers\TenantBookingController;
use App\Http\Controllers\TenantSettingsController;
use App\Http\Controllers\GeocodeController;

// ====================================
// PUBLIC ROUTES (No authentication)
// ====================================
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/public/properties', [PropertyController::class, 'getAllProperties']);
Route::get('/public/properties/{id}', [PropertyController::class, 'getPropertyDetails']);

// Public reverse geocoding endpoint
Route::get('/reverse-geocode', [GeocodeController::class, 'reverse']);

// ====================================
// PROTECTED ROUTES (Authentication required)
// ====================================
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // ===== TENANT ROUTES (Public property browsing - already exists) =====
    Route::get('/properties', [PropertyController::class, 'getAllProperties']);
    Route::get('/properties/{id}', [PropertyController::class, 'getPropertyDetails']);
    
    // ===== TENANT-ONLY ENDPOINTS (NEW - Mobile App) =====
    Route::prefix('tenant')->group(function () {
        // HomePage
        Route::get('/dashboard/stats', [TenantDashboardController::class, 'getStats']);
        Route::get('/dashboard/activities', [TenantDashboardController::class, 'getRecentActivities']);
        Route::get('/dashboard/upcoming', [TenantDashboardController::class, 'getUpcomingPayments']);

        // My Bookings
        Route::get('/bookings', [TenantBookingController::class, 'index']);
        Route::get('/bookings/{id}', [TenantBookingController::class, 'show']);

        // Settings / Profile
        Route::get('/profile', [TenantSettingsController::class, 'getProfile']);
        Route::put('/profile', [TenantSettingsController::class, 'updateProfile']);
        Route::post('/change-password', [TenantSettingsController::class, 'changePassword']);
    });

    // ===== LANDLORD ROUTES (Unchanged) =====
    Route::prefix('landlord')->group(function () {
        Route::get('/properties', [PropertyController::class, 'index']);
        Route::post('/properties', [PropertyController::class, 'store']);
        Route::get('/properties/{id}', [PropertyController::class, 'show']);
        Route::put('/properties/{id}', [PropertyController::class, 'update']);
        Route::delete('/properties/{id}', [PropertyController::class, 'destroy']);
        
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
    });
    
    // Tenants Management (Landlord only)
    Route::get('/tenants', [TenantController::class, 'index']);
    Route::post('/tenants', [TenantController::class, 'store']);
    Route::put('/tenants/{id}', [TenantController::class, 'update']);
    Route::delete('/tenants/{id}', [TenantController::class, 'destroy']);
    Route::post('/tenants/{id}/assign-room', [TenantController::class, 'assignRoom']);
    Route::delete('/tenants/{id}/unassign-room', [TenantController::class, 'unassignRoom']);

    // Bookings (Shared - context based on user role)
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::get('/bookings/stats', [BookingController::class, 'getStats']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
    Route::patch('/bookings/{id}/status', [BookingController::class, 'updateStatus']);
    Route::patch('/bookings/{id}/payment', [BookingController::class, 'updatePaymentStatus']);
});