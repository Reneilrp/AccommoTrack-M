<?php

use Illuminate\Support\Facades\Route;

// Loader.io verification route - MUST be at the top
Route::get('loaderio-abc0f9c6f1440ec8a0d9be1509e3d1af.txt', function () {
    return response('loaderio-abc0f9c6f1440ec8a0d9be1509e3d1af')
        ->header('Content-Type', 'text/plain');
});

Route::get('/login', fn () => response()->json(['message' => 'Login route placeholder']))->name('login');

Route::get('/become-landlord', function () {

    return redirect(config('app.url').'/become-landlord');

});

// Hosted PayMongo tokenization page (card tokenization for WebView or browser)
Route::get('/payments/tokenize/{invoiceId}', [\App\Http\Controllers\Common\PaymongoTokenizeController::class, 'show']);

// PayMongo redirect/return URL after user completes authorization (open in browser/webview)
Route::get('/payments/return', [\App\Http\Controllers\Common\PaymongoController::class, 'handleReturn']);
