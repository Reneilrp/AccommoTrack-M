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
        // Read raw payload and perform signature verification when configured
        $rawPayload = $request->getContent();
        $webhookSecret = env('PAYMONGO_WEBHOOK_SECRET');

        // Try a few common header names that PayMongo might use
        $signatureHeader = $request->header('Paymongo-Signature')
            ?? $request->header('PayMongo-Signature')
            ?? $request->header('paymongo-signature')
            ?? $request->header('X-Paymongo-Signature')
            ?? null;

        // Log the raw signature header and all headers to help debugging
        Log::debug('PayMongo webhook - raw signature header', ['signature_header' => $signatureHeader]);
        Log::debug('PayMongo webhook - all headers', $request->headers->all());

        if ($webhookSecret && $signatureHeader) {
            // Header may include multiple parts like "t=...,v1=signature".
            // Try to extract a v1= signature part if present.
            $sig = $signatureHeader;
            if (strpos($signatureHeader, 'v1=') !== false) {
                if (preg_match('/v1=([a-f0-9]+)/i', $signatureHeader, $m)) {
                    $sig = $m[1];
                }
            }

            $expected = hash_hmac('sha256', $rawPayload, $webhookSecret);
            if (!hash_equals($expected, $sig)) {
                Log::warning('PayMongo webhook signature mismatch', [
                    'header' => $signatureHeader,
                    'expected' => $expected,
                    'headers' => $request->headers->all(),
                    'raw_payload' => $rawPayload,
                ]);
                return response()->json(['message' => 'Invalid signature'], 400);
            }
        }

        $payload = $request->json()->all();

        Log::info('PayMongo webhook received', $payload ?: []);

        $eventType = $payload['data']['type'] ?? null;
        $data = $payload['data'] ?? null;

        try {
            if (!$data) return response()->json(['message' => 'No data'], 400);

            // PayMongo uses resources like source, payment
            $resource = $data['attributes'] ?? null;
            $id = $data['id'] ?? null;

            if ($eventType === 'source') {
                // status may be chargeable or failed or chargeable
                $status = $resource['status'] ?? null;
                // find local transaction by gateway_reference
                $tx = PaymentTransaction::where('gateway_reference', $id)->first();
                if ($tx) {
                    if ($status === 'chargeable' || $status === 'succeeded' || $status === 'paid') {
                        $tx->status = 'succeeded';
                        $tx->gateway_response = $resource;
                        $tx->provider_event_id = $id;
                        $tx->save();

                        // update linked invoice
                        if ($tx->invoice_id) {
                            $invoice = Invoice::find($tx->invoice_id);
                            if ($invoice) {
                                $invoiceTotal = $invoice->total_cents ?? $invoice->amount_cents;
                                        if ($tx->amount_cents >= $invoiceTotal) {
                                            $invoice->status = 'paid';
                                            $invoice->paid_at = now();
                                        } else {
                                            $invoice->status = 'partial';
                                        }
                                        $invoice->save();

                                        // If this invoice is linked to a booking, update booking payment_status
                                        if ($invoice->booking_id) {
                                            try {
                                                $booking = \App\Models\Booking::find($invoice->booking_id);
                                                if ($booking) {
                                                    $booking->payment_status = ($invoice->status === 'paid') ? 'paid' : 'partial';
                                                    $booking->save();
                                                    Log::info('Booking payment_status updated from webhook', ['booking_id' => $booking->id, 'payment_status' => $booking->payment_status]);
                                                }
                                            } catch (\Exception $be) {
                                                Log::error('Failed to update booking payment_status: ' . $be->getMessage());
                                            }
                                        }
                            }
                        }
                    } else {
                        $tx->status = $status ?: 'failed';
                        $tx->gateway_response = $resource;
                        $tx->save();
                    }
                }
            }

            if ($eventType === 'payment') {
                // handle payment events similarly
                $payment = $resource;
                $sourceId = $payment['source_id'] ?? ($payment['data'] ?? null);
                // try find by gateway_reference
                $tx = PaymentTransaction::where('gateway_reference', $payment['id'] ?? $id)->first();
                if ($tx) {
                    $tx->status = 'succeeded';
                    $tx->gateway_response = $payment;
                    $tx->provider_event_id = $payment['id'] ?? $id;
                    $tx->save();

                    if ($tx->invoice_id) {
                        $invoice = Invoice::find($tx->invoice_id);
                        if ($invoice) {
                            $invoiceTotal = $invoice->total_cents ?? $invoice->amount_cents;
                            if ($tx->amount_cents >= $invoiceTotal) {
                                $invoice->status = 'paid';
                                $invoice->paid_at = now();
                            } else {
                                $invoice->status = 'partial';
                            }
                            $invoice->save();

                            // Update linked booking payment_status when applicable
                            if ($invoice->booking_id) {
                                try {
                                    $booking = \App\Models\Booking::find($invoice->booking_id);
                                    if ($booking) {
                                        $booking->payment_status = ($invoice->status === 'paid') ? 'paid' : 'partial';
                                        $booking->save();
                                        Log::info('Booking payment_status updated from webhook (payment event)', ['booking_id' => $booking->id, 'payment_status' => $booking->payment_status]);
                                    }
                                } catch (\Exception $be) {
                                    Log::error('Failed to update booking payment_status (payment event): ' . $be->getMessage());
                                }
                            }
                        }
                    }
                }
            }

            return response()->json(['received' => true]);
        } catch (\Exception $e) {
            Log::error('PayMongo webhook handler error: ' . $e->getMessage());
            return response()->json(['message' => 'Handler error'], 500);
        }
    }
}
