<?php

use Illuminate\Support\Facades\Route;

Route::get('/login', fn() => response()->json(['message' => 'Login route placeholder']))->name('login');



Route::get('/become-landlord', function() {

    return redirect(config('app.url') . '/become-landlord');

});

// Hosted PayMongo tokenization page (card tokenization for WebView or browser)
Route::get('/payments/tokenize/{invoiceId}', [\App\Http\Controllers\PaymongoTokenizeController::class, 'show']);

// PayMongo redirect/return URL after user completes authorization (open in browser/webview)
Route::get('/payments/return', [\App\Http\Controllers\PaymongoController::class, 'handleReturn']);
