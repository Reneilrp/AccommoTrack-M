<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function createPaymentLink(Room $room)
    {
        $landlord = $room->property->landlord;

        $verifyEnv = config('services.paymongo.verify_ssl', true);
        if (is_string($verifyEnv) && file_exists($verifyEnv)) {
            $verify = $verifyEnv;
        } else {
            $verify = filter_var($verifyEnv, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if (is_null($verify)) {
                $verify = true;
            }
        }

        $pendingRequest = Http::withHeaders([
            'Authorization' => 'Basic '.base64_encode(config('services.paymongo.secret_key').':'),
        ]);

        if ($verify === false) {
            $pendingRequest = $pendingRequest->withoutVerifying();
        } elseif (is_string($verify)) {
            $pendingRequest = $pendingRequest->withOptions(['verify' => $verify]);
        }

        $response = $pendingRequest->post('https://api.paymongo.com/v1/links', [
            'data' => [
                'attributes' => [
                    'amount' => $room->monthly_rate * 100, // Amount in cents
                    'description' => "Rent for {$room->name}",
                    'remarks' => $room->id, // Use this to track the room later
                    'metadata' => [
                        'room_id' => $room->id,
                        'tenant_id' => Auth::id(),
                    ],
                    // This is where the 1% / 99% split happens
                    'split_payment' => [
                        'transfer_to' => config('services.paymongo.parent_org_id'),
                        'recipients' => [
                            [
                                'merchant_id' => $landlord->paymongo_child_id,
                                'split_type' => 'percentage_net',
                                'value' => 9900, // 99% to Landlord
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $res = $response->json();

        Log::info('PayMongo create link response', [
            'status' => $response->status(),
            'body' => $res,
        ]);

        if ($response->failed() || ! is_array($res) || empty($res['data']['attributes']['checkout_url'])) {
            $errorDetail = 'Unknown error from PayMongo.';
            if (is_array($res) && isset($res['errors']) && is_array($res['errors']) && ! empty($res['errors'])) {
                $errorDetail = $res['errors'][0]['detail'] ?? $res['errors'][0]['code'] ?? $errorDetail;
            }

            return response()->json([
                'message' => 'Failed to create payment link: '.$errorDetail,
                'paymongo_response' => $res,
            ], 422);
        }

        return response()->json([
            'checkout_url' => $res['data']['attributes']['checkout_url'],
        ]);
    }
}
