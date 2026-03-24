<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymongoWebhookController extends Controller
{
    /**
     * Basic PayMongo webhook handler. Verifies provider event and updates transactions/invoices.
     * Note: For production, verify webhook signature (PayMongo provides a signature header).
     */
    public function handle(Request $request)
    {
        $rawPayload = $request->getContent();
        $webhookSecret = config('services.paymongo.webhook_secret');
        $signatureHeader = $request->header('Paymongo-Signature')
            ?? $request->header('PayMongo-Signature')
            ?? $request->header('paymongo-signature')
            ?? $request->header('X-Paymongo-Signature')
            ?? null;

        if (! $webhookSecret) {
            Log::error('PayMongo webhook secret is not set in environment.');

            return response()->json(['message' => 'Webhook configuration error'], 400);
        }

        if (! $signatureHeader) {
            Log::warning('PayMongo webhook received without signature header.');

            return response()->json(['message' => 'Missing signature'], 400);
        }

        $sig = $signatureHeader;
        if (strpos($signatureHeader, 'v1=') !== false) {
            if (preg_match('/v1=([a-f0-9]+)/i', $signatureHeader, $m)) {
                $sig = $m[1];
            }
        }

        $expected = hash_hmac('sha256', $rawPayload, $webhookSecret);
        if (! hash_equals($expected, $sig)) {
            Log::warning('PayMongo webhook signature mismatch', ['header' => $signatureHeader, 'expected' => $expected]);

            return response()->json(['message' => 'Invalid signature'], 400);
        }

        $payload = $request->json()->all();
        Log::info('PayMongo webhook received', $payload ?: []);

        $data = $payload['data'] ?? null;
        if (! $data) {
            return response()->json(['message' => 'No data'], 400);
        }

        // Standard PayMongo webhook is an "event" resource
        $topType = $data['type'] ?? null;
        if ($topType !== 'event') {
            Log::warning('PayMongo webhook received non-event resource', ['type' => $topType]);

            return response()->json(['message' => 'Not an event'], 400);
        }

        $eventAttributes = $data['attributes'] ?? null;
        $eventType = $eventAttributes['type'] ?? null; // e.g. "source.chargeable"
        $resourceData = $eventAttributes['data'] ?? null; // the actual source or payment object

        if (! $resourceData) {
            return response()->json(['message' => 'No resource data'], 400);
        }

        $resourceId = $resourceData['id'] ?? null;
        $resourceAttr = $resourceData['attributes'] ?? null;

        try {
            if ($eventType === 'source.chargeable') {
                $tx = PaymentTransaction::where('gateway_reference', $resourceId)->first();
                if ($tx && $tx->status !== 'succeeded') {
                    Log::info("Webhook: Source {$resourceId} is chargeable. Consuming...");

                    $verifyEnv = config('services.paymongo.verify_ssl', true);
                    if (is_string($verifyEnv) && file_exists($verifyEnv)) {
                        $verify = $verifyEnv;
                    } else {
                        $verify = filter_var($verifyEnv, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                        if (is_null($verify)) {
                            $verify = true;
                        }
                    }

                    // Call PayMongo API to create payment
                    $client = new \GuzzleHttp\Client([
                        'base_uri' => 'https://api.paymongo.com/v1/',
                        'verify' => $verify,
                    ]);
                    $res = $client->post('payments', [
                        'auth' => [config('services.paymongo.secret_key'), ''],
                        'json' => [
                            'data' => [
                                'attributes' => [
                                    'amount' => intval($tx->amount_cents),
                                    'currency' => strtoupper($tx->currency),
                                    'source' => ['id' => $resourceId, 'type' => 'source'],
                                ],
                            ],
                        ],
                    ]);

                    $paymentBody = json_decode((string) $res->getBody(), true);
                    $paymentId = $paymentBody['data']['id'] ?? null;

                    if ($paymentId) {
                        $tx->status = 'succeeded';
                        $tx->gateway_reference = $paymentId;
                        $tx->gateway_response = $paymentBody;
                        $tx->provider_event_id = $data['id'] ?? null;
                        $tx->save();

                        $this->updateInvoiceAndBooking($tx->invoice_id, $tx->amount_cents);
                    }
                }
            } elseif ($eventType === 'payment.paid') {
                // If we created the payment ourselves, we might have already updated status.
                // But this handles payments created outside our flow or as a backup.
                $sourceId = $resourceAttr['source']['id'] ?? null;
                $tx = null;
                if ($sourceId) {
                    $tx = PaymentTransaction::where('gateway_reference', $sourceId)->first();
                }
                if (! $tx) {
                    $tx = PaymentTransaction::where('gateway_reference', $resourceId)->first();
                }

                if ($tx && $tx->status !== 'succeeded') {
                    $tx->status = 'succeeded';
                    $tx->gateway_reference = $resourceId;
                    $tx->gateway_response = $resourceAttr;
                    $tx->provider_event_id = $data['id'] ?? null;
                    $tx->save();

                    $this->updateInvoiceAndBooking($tx->invoice_id, $tx->amount_cents);
                }
            } elseif ($eventType === 'link.payment.paid') {
                $metadata = $resourceAttr['metadata'] ?? null;
                if ($metadata && isset($metadata['room_id']) && isset($metadata['tenant_id'])) {
                    $room = \App\Models\Room::find($metadata['room_id']);
                    if ($room) {
                        // NOTE: Do NOT update room status here — 'paid' is not a valid room status.
                        // Room status is managed by booking confirmation/cancellation only.

                        $tenant = \App\Models\User::find($metadata['tenant_id']);
                        if ($tenant) {
                            $tenant->notify(new \App\Notifications\RentPaidSuccess);
                        }

                        $landlord = $room->property->landlord;
                        if ($landlord) {
                            $landlord->notify(new \App\Notifications\NewPaymentReceived);
                        }
                    }
                }
            } elseif ($eventType === 'merchant.verified') {
                $merchantId = $resourceData['id'] ?? null;
                if ($merchantId) {
                    $user = \App\Models\User::where('paymongo_child_id', $merchantId)->first();
                    if ($user) {
                        $user->update(['paymongo_verification_status' => 'verified']);
                        // Optionally, you can notify the user that their account is verified.
                        // $user->notify(new \App\Notifications\PayMongoAccountVerified());
                    }
                }
            }

            return response()->json(['received' => true]);
        } catch (\Exception $e) {
            Log::error('PayMongo webhook handler error: '.$e->getMessage());

            return response()->json(['message' => 'Handler error'], 500);
        }
    }

    /**
     * Helper to update invoice and booking status.
     */
    private function updateInvoiceAndBooking($invoiceId, $paidAmountCents)
    {
        if (! $invoiceId) {
            return;
        }
        $invoice = Invoice::with('transactions')->find($invoiceId);
        if (! $invoice) {
            return;
        }

        $invoiceTotal = $invoice->total_cents ?? $invoice->amount_cents;

        // Calculate total successful payments for this invoice, subtracting refunds
        $totalPaidSoFar = $invoice->transactions()
            ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
            ->selectRaw('SUM(amount_cents - refunded_amount_cents) as net_cents')
            ->value('net_cents') ?? 0;

        if ($totalPaidSoFar >= $invoiceTotal) {
            $invoice->status = 'paid';
            $invoice->paid_at = now();
        } else {
            $invoice->status = 'partial';
        }
        $invoice->save();

        if ($invoice->booking_id) {
            try {
                $booking = \App\Models\Booking::find($invoice->booking_id);
                if ($booking) {
                    $booking->payment_status = ($invoice->status === 'paid') ? 'paid' : 'partial';
                    $booking->save();
                }
            } catch (\Exception $be) {
                Log::error('Failed to update booking payment_status: '.$be->getMessage());
            }
        }
    }
}
