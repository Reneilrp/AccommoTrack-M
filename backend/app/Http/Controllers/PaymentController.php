<?php

namespace App\Http\Controllers;

use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Auth;

class PaymentController extends Controller
{
    public function createPaymentLink(Room $room) {
        $landlord = $room->property->landlord;
    
        $response = Http::withHeaders([
            'Authorization' => 'Basic ' . base64_encode(config('services.paymongo.secret_key') . ':'),
        ])->post('https://api.paymongo.com/v1/links', [
                'data' => [
                    'attributes' => [
                        'amount' => $room->monthly_rate * 100, // Amount in cents
                        'description' => "Rent for {$room->name}",
                        'remarks' => $room->id, // Use this to track the room later
                        'metadata' => [
                            'room_id' => $room->id,
                            'tenant_id' => Auth::id()
                        ],
                        // This is where the 1% / 99% split happens
                        'split_payment' => [
                            'transfer_to' => config('services.paymongo.parent_org_id'), 
                            'recipients' => [
                                [
                                    'merchant_id' => $landlord->paymongo_child_id,
                                    'split_type' => 'percentage_net',
                                    'value' => 9900, // 99% to Landlord
                                ]
                            ]
                        ]
                    ]
                ]
            ]);
    
        $res = $response->json();
        
        // Return the checkout URL in a JSON response for the mobile app
        return response()->json([
            'checkout_url' => $res['data']['attributes']['checkout_url']
        ]);
    }
}
