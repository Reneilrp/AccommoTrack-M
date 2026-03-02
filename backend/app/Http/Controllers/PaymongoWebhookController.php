<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\PaymentTransaction;
use App\Models\Invoice;
use App\Models\Payment;

class PaymongoWebhookController extends Controller
{
    /**
     * Basic PayMongo webhook handler. Verifies provider event and updates transactions/invoices.
     * Note: For production, verify webhook signature (PayMongo provides a signature header).
     */
    public function handle(Request $request)
    {
        $rawPayload = $request->getContent();
        $webhookSecret = env('PAYMONGO_WEBHOOK_SECRET');
        $signatureHeader = $request->header('Paymongo-Signature')
            ?? $request->header('PayMongo-Signature')
            ?? $request->header('paymongo-signature')
            ?? $request->header('X-Paymongo-Signature')
            ?? null;

        if ($webhookSecret && $signatureHeader) {
            $sig = $signatureHeader;
            if (strpos($signatureHeader, 'v1=') !== false) {
                if (preg_match('/v1=([a-f0-9]+)/i', $signatureHeader, $m)) {
                    $sig = $m[1];
                }
            }
            $expected = hash_hmac('sha256', $rawPayload, $webhookSecret);
            if (!hash_equals($expected, $sig)) {
                Log::warning('PayMongo webhook signature mismatch', ['header' => $signatureHeader, 'expected' => $expected]);
                return response()->json(['message' => 'Invalid signature'], 400);
            }
        }

        $payload = $request->json()->all();
        Log::info('PayMongo webhook received', $payload ?: []);

        $data = $payload['data'] ?? null;
        if (!$data) return response()->json(['message' => 'No data'], 400);

        // Standard PayMongo webhook is an "event" resource
        $topType = $data['type'] ?? null;
        if ($topType !== 'event') {
            Log::warning('PayMongo webhook received non-event resource', ['type' => $topType]);
            return response()->json(['message' => 'Not an event'], 400);
        }

        $eventAttributes = $data['attributes'] ?? null;
        $eventType = $eventAttributes['type'] ?? null; // e.g. "source.chargeable"
        $resourceData = $eventAttributes['data'] ?? null; // the actual source or payment object
        
        if (!$resourceData) return response()->json(['message' => 'No resource data'], 400);

        $resourceId = $resourceData['id'] ?? null;
        $resourceAttr = $resourceData['attributes'] ?? null;

        try {
            if ($eventType === 'source.chargeable') {
                $tx = PaymentTransaction::where('gateway_reference', $resourceId)->first();
                if ($tx && $tx->status !== 'succeeded') {
                    Log::info("Webhook: Source {$resourceId} is chargeable. Consuming...");
                    
                    // Call PayMongo API to create payment
                    $client = new \GuzzleHttp\Client(['base_uri' => 'https://api.paymongo.com/v1/']);
                    $res = $client->post('payments', [
                        'auth' => [env('PAYMONGO_SECRET'), ''],
                        'json' => [
                            'data' => [
                                'attributes' => [
                                    'amount' => intval($tx->amount_cents),
                                    'currency' => strtoupper($tx->currency),
                                    'source' => ['id' => $resourceId, 'type' => 'source']
                                ]
                            ]
                        ]
                    ]);
                    
                    $paymentBody = json_decode((string)$res->getBody(), true);
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
                if (!$tx) {
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
            }

            return response()->json(['received' => true]);
        } catch (\Exception $e) {
            Log::error('PayMongo webhook handler error: ' . $e->getMessage());
            return response()->json(['message' => 'Handler error'], 500);
        }
    }

    /**
     * Helper to update invoice and booking status.
     */
    private function updateInvoiceAndBooking($invoiceId, $paidAmountCents)
    {
        if (!$invoiceId) return;
        $invoice = Invoice::find($invoiceId);
        if (!$invoice) return;

        $invoiceTotal = $invoice->total_cents ?? $invoice->amount_cents;
        if ($paidAmountCents >= $invoiceTotal) {
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
                Log::error('Failed to update booking payment_status: ' . $be->getMessage());
            }
        }
    }
}
