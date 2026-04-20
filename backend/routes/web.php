<?php

use Illuminate\Support\Facades\Route;


Route::get('/login', fn () => response()->json(['message' => 'Login route placeholder']))->name('login');

Route::get('/become-landlord', function () {

    return redirect(config('app.url').'/become-landlord');

});

// Hosted PayMongo tokenization page (card tokenization for WebView or browser)
Route::get('/payments/tokenize/{invoiceId}', [\App\Http\Controllers\Common\PaymongoTokenizeController::class, 'show']);

// PayMongo redirect/return URL after user completes authorization (open in browser/webview)
Route::get('/payments/return', [\App\Http\Controllers\Common\PaymongoController::class, 'handleReturn']);

// Public Receipt Verification & Disputes
Route::get('/verify-receipt/{reference}', [\App\Http\Controllers\Public\PublicReceiptController::class, 'verify'])->name('public.receipt.verify');
Route::post('/report-dispute', [\App\Http\Controllers\Public\PublicReceiptController::class, 'report'])->name('public.receipt.report');
