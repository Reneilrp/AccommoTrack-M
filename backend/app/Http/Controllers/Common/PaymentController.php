<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Models\Room;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

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

        $tenantId = Auth::id();
        $booking = Booking::where('room_id', $room->id)
            ->where('tenant_id', $tenantId)
            ->whereIn('status', ['confirmed', 'active'])
            ->first();

        $invoice = null;
        if ($booking) {
            $invoice = Invoice::where('booking_id', $booking->id)
                ->whereIn('status', ['pending', 'unpaid', 'overdue'])
                ->orderBy('due_date', 'asc')
                ->first();
        }

        $amountCents = $invoice ? $invoice->amount_cents : ($room->monthly_rate * 100);

        // Create a local transaction record first so we have an ID for metadata
        $tx = PaymentTransaction::create([
            'invoice_id' => $invoice?->id,
            'tenant_id' => $tenantId,
            'amount_cents' => $amountCents,
            'currency' => $room->property->currency ?? 'PHP',
            'status' => 'pending',
            'method' => 'paymongo_link',
        ]);

        $response = $pendingRequest->post('https://api.paymongo.com/v1/links', [
            'data' => [
                'attributes' => [
                    'amount' => $amountCents,
                    'description' => $invoice ? ($invoice->description ?: "Rent for {$room->name}") : "Rent for {$room->name}",
                    'remarks' => $invoice ? "INV-{$invoice->id}" : "ROOM-{$room->id}",
                    'metadata' => [
                        'room_id' => (int) $room->id,
                        'tenant_id' => (int) $tenantId,
                        'payment_transaction_id' => (int) $tx->id,
                        'invoice_id' => $invoice ? (int) $invoice->id : null,
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
            // Update transaction to failed if PayMongo request failed
            $tx->update([
                'status' => 'failed',
                'gateway_response' => $res,
            ]);

            $errorDetail = 'Unknown error from PayMongo.';
            if (is_array($res) && isset($res['errors']) && is_array($res['errors']) && ! empty($res['errors'])) {
                $errorDetail = $res['errors'][0]['detail'] ?? $res['errors'][0]['code'] ?? $errorDetail;
            }

            return response()->json([
                'message' => 'Failed to create payment link: '.$errorDetail,
                'paymongo_response' => $res,
            ], 422);
        }

        // Successfully created link, update transaction with PayMongo link ID
        $tx->update([
            'gateway_reference' => $res['data']['id'],
            'gateway_response' => $res,
        ]);

        return response()->json([
            'checkout_url' => $res['data']['attributes']['checkout_url'],
        ]);
    }
}
