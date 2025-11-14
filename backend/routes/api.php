<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\TenantController;
use App\Http\Controllers\BookingController;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Properties
    Route::get('/properties', [PropertyController::class, 'index']);
    Route::post('/properties', [PropertyController::class, 'store']);
    Route::get('/properties/{id}', [PropertyController::class, 'show']);
    Route::put('/properties/{id}', [PropertyController::class, 'update']);
    Route::delete('/properties/{id}', [PropertyController::class, 'destroy']);
    
    // Rooms (nested)
    Route::get('/properties/{propertyId}/rooms', [RoomController::class, 'index']);
    Route::get('/properties/{propertyId}/rooms/stats', [RoomController::class, 'getStats']);
    Route::post('/rooms', [RoomController::class, 'store']);
    Route::put('/rooms/{id}', [RoomController::class, 'update']);
    Route::delete('/rooms/{id}', [RoomController::class, 'destroy']);
    Route::patch('/rooms/{id}/status', [RoomController::class, 'updateStatus']);

    // Tenants
    Route::get('/tenants', [TenantController::class, 'index']);
    Route::post('/tenants', [TenantController::class, 'store']);
    Route::put('/tenants/{id}', [TenantController::class, 'update']);
    Route::delete('/tenants/{id}', [TenantController::class, 'destroy']);
    Route::post('/tenants/{id}/assign-room', [TenantController::class, 'assignRoom']);

    // Rooms (Global)
    Route::get('/rooms', [RoomController::class, 'index']);

    // === BOOKINGS (NEW) ===
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::get('/bookings/stats', [BookingController::class, 'getStats']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
    Route::patch('/bookings/{id}/status', [BookingController::class, 'updateStatus']);
    Route::patch('/bookings/{id}/payment', [BookingController::class, 'updatePaymentStatus']);

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);
    Route::get('/dashboard/recent-activities', [DashboardController::class, 'getRecentActivities']);
    Route::get('/dashboard/upcoming-payments', [DashboardController::class, 'getUpcomingPayments']);
    Route::get('/dashboard/revenue-chart', [DashboardController::class, 'getRevenueChart']);
    Route::get('/dashboard/property-performance', [DashboardController::class, 'getPropertyPerformance']);
});