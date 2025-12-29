<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PaymentWebhookController extends Controller
{
    /**
     * Stripe webhook endpoint removed — Stripe is no longer used.
     */
    public function handleStripeWebhook(Request $request)
    {
        return response()->json(['message' => 'Stripe webhook disabled'], 410);
    }
}
