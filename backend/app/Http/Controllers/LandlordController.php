<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Auth;

class LandlordController extends Controller
{
    public function getOnboardingUrl() {
        $response = Http::withHeaders([
            'Authorization' => 'Basic ' . base64_encode(config('services.paymongo.secret_key') . ':'),
        ])->post('https://api.paymongo.com/v1/merchants/children', [
            'data' => [
                'attributes' => [
                    'business_type' => 'individual',
                    'features' => ['payment_gateway', 'wallet'],
                    'hosted_onboarding' => true
                ]
            ]
        ]);
    
        $res = $response->json();
        
        // Save the Child ID to the landlord's profile
        Auth::user()->update([
            'paymongo_child_id' => $res['data']['id'],
            'paymongo_verification_status' => 'pending'
        ]);
    
        // Send the user to PayMongo to upload their ID
        return redirect($res['data']['attributes']['onboarding_url']);
    }
}
