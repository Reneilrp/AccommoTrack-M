<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use GuzzleHttp\Client;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use Illuminate\Support\Facades\Auth;

class PaymongoController extends Controller
{
    use ResolvesLandlordAccess;

    /**
     * Create a PayMongo Source / session for an invoice.
     * Expects `method` in request (e.g. 'gcash' or 'card') and optional `return_url`.
     */
    public function createSource(Request $request, $invoiceId)
    {
        $context = $this->resolveLandlordContext($request);

        $validated = $request->validate([
            'method' => 'required|string',
            'return_url' => 'nullable|url'
        ]);

        $invoice = Invoice::findOrFail($invoiceId);
        if ($invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $method = $validated['method'];
        $returnUrl = $validated['return_url'] ?? config('app.url') . '/payments/return';

        // amount to charge in cents
        $amount = $invoice->total_cents ?? $invoice->amount_cents;
        if (!$amount) {
            return response()->json(['message' => 'Invoice has no amount set'], 422);
        }

        DB::beginTransaction();
        try {
            // create a pending transaction locally
            $tx = PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $invoice->tenant_id,
                'amount_cents' => $amount,
                'currency' => $invoice->currency ?? 'PHP',
                'status' => 'pending',
                'method' => 'paymongo_' . $method,
            ]);

                $verifyEnv = config('services.paymongo.verify_ssl', true);
                // Allow boolean-like values or a path to a CA bundle file
                if (is_string($verifyEnv) && file_exists($verifyEnv)) {
                    $verify = $verifyEnv; // path to bundle
                } else {
                    $verify = filter_var($verifyEnv, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                    if (is_null($verify)) $verify = true;
                }

                Log::info('Paymongo createSource - verify resolved: ' . var_export($verify, true));

                $client = new Client([
                    'base_uri' => 'https://api.paymongo.com/v1/',
                    'verify' => $verify,
                ]);

            $payload = [
                'data' => [
                    'attributes' => [
                        'amount' => intval($amount),
                            'currency' => strtoupper($invoice->currency ?? 'PHP'),
                        'type' => $method,
                        'redirect' => [
                            'success' => $returnUrl,
                            'failed' => $returnUrl,
                        ],
                    ]
                ]
            ];

            $res = $client->post('sources', [
                'auth' => [config('services.paymongo.secret_key'), ''],
                'json' => $payload,
            ]);

            $body = json_decode((string)$res->getBody(), true);
            if (!is_array($body)) {
                throw new \Exception('Invalid response from PayMongo');
            }

            // attach gateway info to local transaction
            $gatewayId = $body['data']['id'] ?? ($body['data']['attributes']['id'] ?? null);
            $tx->gateway_reference = $gatewayId;
            $tx->gateway_response = $body;
            $tx->save();

            DB::commit();

            return response()->json(['transaction' => $tx, 'source' => $body], 200);
        } catch (\GuzzleHttp\Exception\RequestException $e) {
            DB::rollBack();
            Log::error('PayMongo create source error: ' . $e->getMessage());
            $msg = $e->getResponse() ? (string)$e->getResponse()->getBody() : $e->getMessage();
            return response()->json(['message' => 'Failed to create PayMongo source', 'error' => $msg], 500);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('PayMongo create source unexpected error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to create PayMongo source', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create PayMongo Source for tenant-owned invoice (tenant checkout)
     */
    public function createSourceForTenant(Request $request, $invoiceId)
    {
        $validated = $request->validate([
            'method' => 'required|string',
            'return_url' => 'nullable|url'
        ]);

        $invoice = Invoice::findOrFail($invoiceId);
        $tenantId = Auth::id();
        if ($invoice->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $method = $validated['method'];
        $returnUrl = $validated['return_url'] ?? config('app.url') . '/payments/return';

        $amount = $invoice->total_cents ?? $invoice->amount_cents;
        if (!$amount) {
            return response()->json(['message' => 'Invoice has no amount set'], 422);
        }

        DB::beginTransaction();
        try {
            $tx = PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $invoice->tenant_id,
                'amount_cents' => $amount,
                'currency' => $invoice->currency ?? 'PHP',
                'status' => 'pending',
                'method' => 'paymongo_' . $method,
            ]);

            $verifyEnv = config('services.paymongo.verify_ssl', true);
            if (is_string($verifyEnv) && file_exists($verifyEnv)) {
                $verify = $verifyEnv;
            } else {
                $verify = filter_var($verifyEnv, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if (is_null($verify)) $verify = true;
            }

            Log::info('Paymongo createSourceForTenant - verify resolved: ' . var_export($verify, true));

            $client = new Client([
                'base_uri' => 'https://api.paymongo.com/v1/',
                'verify' => $verify,
            ]);

            $payload = [
                'data' => [
                    'attributes' => [
                        'amount' => intval($amount),
                        'currency' => strtoupper($invoice->currency ?? 'PHP'),
                        'type' => $method,
                        'redirect' => [
                            'success' => $returnUrl,
                            'failed' => $returnUrl,
                        ],
                    ]
                ]
            ];

            $res = $client->post('sources', [
                'auth' => [config('services.paymongo.secret_key'), ''],
                'json' => $payload,
            ]);

            $body = json_decode((string)$res->getBody(), true);
            if (!is_array($body)) {
                throw new \Exception('Invalid response from PayMongo');
            }

            $gatewayId = $body['data']['id'] ?? ($body['data']['attributes']['id'] ?? null);
            $tx->gateway_reference = $gatewayId;
            $tx->gateway_response = $body;
            $tx->save();

            DB::commit();

            return response()->json(['transaction' => $tx, 'source' => $body], 200);
        } catch (\GuzzleHttp\Exception\RequestException $e) {
            DB::rollBack();
            Log::error('PayMongo create source (tenant) error: ' . $e->getMessage());
            $msg = $e->getResponse() ? (string)$e->getResponse()->getBody() : $e->getMessage();
            return response()->json(['message' => 'Failed to create PayMongo source', 'error' => $msg], 500);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('PayMongo create source (tenant) unexpected error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to create PayMongo source', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create a PayMongo payment using a client-created payment method or a source id.
     * Expects either `payment_method_id` (for card tokenization) or `source_id` (redirect flows).
     */
    public function createPayment(Request $request, $invoiceId)
    {
        $context = $this->resolveLandlordContext($request);
        $validated = $request->validate([
            'payment_method_id' => 'nullable|string',
            'source_id' => 'nullable|string',
        ]);

        $invoice = Invoice::findOrFail($invoiceId);
        if ($invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $amount = $invoice->total_cents ?? $invoice->amount_cents;
        if (!$amount) return response()->json(['message' => 'Invoice has no amount set'], 422);

        DB::beginTransaction();
        try {
                $verifyEnv = config('services.paymongo.verify_ssl', true);
                if (is_string($verifyEnv) && file_exists($verifyEnv)) {
                    $verify = $verifyEnv;
                } else {
                    $verify = filter_var($verifyEnv, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                    if (is_null($verify)) $verify = true;
                }

                Log::info('Paymongo createPayment - verify resolved: ' . var_export($verify, true));

                $client = new Client([
                    'base_uri' => 'https://api.paymongo.com/v1/',
                    'verify' => $verify,
                ]);

            $paymentPayload = [
                'data' => [
                    'attributes' => [
                        'amount' => intval($amount),
                            'currency' => strtoupper($invoice->currency ?? 'PHP'),
                    ]
                ]
            ];

            if (!empty($validated['payment_method_id'])) {
                $paymentPayload['data']['attributes']['payment_method'] = $validated['payment_method_id'];
            } elseif (!empty($validated['source_id'])) {
                $paymentPayload['data']['attributes']['source'] = $validated['source_id'];
            } else {
                return response()->json(['message' => 'payment_method_id or source_id is required'], 422);
            }

            // create pending tx
            $tx = PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $invoice->tenant_id,
                'amount_cents' => $amount,
                'currency' => $invoice->currency ?? 'PHP',
                'status' => 'pending',
                'method' => 'paymongo_payment',
            ]);

            $res = $client->post('payments', [
                'auth' => [config('services.paymongo.secret_key'), ''],
                'json' => $paymentPayload,
            ]);

            $body = json_decode((string)$res->getBody(), true);
            if (!is_array($body)) {
                throw new \Exception('Invalid response from PayMongo');
            }
            $tx->gateway_reference = $body['data']['id'] ?? null;
            $tx->gateway_response = $body;
            $tx->status = 'succeeded'; // If /payments succeeds, it's paid
            $tx->save();

            $this->updateInvoiceAndBooking($invoice->id, $amount);

            DB::commit();
            return response()->json(['transaction' => $tx, 'payment' => $body], 200);
        } catch (\GuzzleHttp\Exception\RequestException $e) {
            DB::rollBack();
            Log::error('PayMongo create payment error: ' . $e->getMessage());
            $msg = $e->getResponse() ? (string)$e->getResponse()->getBody() : $e->getMessage();
            return response()->json(['message' => 'Failed to create PayMongo payment', 'error' => $msg], 500);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('PayMongo create payment unexpected error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to create PayMongo payment', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create PayMongo payment for tenant-owned invoice (tenant checkout)
     */
    public function createPaymentForTenant(Request $request, $invoiceId)
    {
        $validated = $request->validate([
            'payment_method_id' => 'nullable|string',
            'source_id' => 'nullable|string',
        ]);

        $invoice = Invoice::findOrFail($invoiceId);
        $tenantId = Auth::id();
        if ($invoice->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $amount = $invoice->total_cents ?? $invoice->amount_cents;
        if (!$amount) return response()->json(['message' => 'Invoice has no amount set'], 422);

        DB::beginTransaction();
        try {
            $verifyEnv = config('services.paymongo.verify_ssl', true);
            if (is_string($verifyEnv) && file_exists($verifyEnv)) {
                $verify = $verifyEnv;
            } else {
                $verify = filter_var($verifyEnv, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if (is_null($verify)) $verify = true;
            }

            Log::info('Paymongo createPaymentForTenant - verify resolved: ' . var_export($verify, true));

            $client = new Client([
                'base_uri' => 'https://api.paymongo.com/v1/',
                'verify' => $verify,
            ]);

            $paymentPayload = [
                'data' => [
                    'attributes' => [
                        'amount' => intval($amount),
                        'currency' => strtoupper($invoice->currency ?? 'PHP'),
                    ]
                ]
            ];

            if (!empty($validated['payment_method_id'])) {
                $paymentPayload['data']['attributes']['payment_method'] = $validated['payment_method_id'];
            } elseif (!empty($validated['source_id'])) {
                $paymentPayload['data']['attributes']['source'] = $validated['source_id'];
            } else {
                return response()->json(['message' => 'payment_method_id or source_id is required'], 422);
            }

            $tx = PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $invoice->tenant_id,
                'amount_cents' => $amount,
                'currency' => $invoice->currency ?? 'PHP',
                'status' => 'pending',
                'method' => 'paymongo_payment',
            ]);

            $res = $client->post('payments', [
                'auth' => [config('services.paymongo.secret_key'), ''],
                'json' => $paymentPayload,
            ]);

            $body = json_decode((string)$res->getBody(), true);
            if (!is_array($body)) {
                throw new \Exception('Invalid response from PayMongo');
            }
            $tx->gateway_reference = $body['data']['id'] ?? null;
            $tx->gateway_response = $body;
            $tx->status = 'succeeded'; // If /payments succeeds, it's paid
            $tx->save();

            $this->updateInvoiceAndBooking($invoice->id, $amount);

            DB::commit();
            return response()->json(['transaction' => $tx, 'payment' => $body], 200);
        } catch (\GuzzleHttp\Exception\RequestException $e) {
            DB::rollBack();
            Log::error('PayMongo create payment (tenant) error: ' . $e->getMessage());
            $msg = $e->getResponse() ? (string)$e->getResponse()->getBody() : $e->getMessage();
            return response()->json(['message' => 'Failed to create PayMongo payment', 'error' => $msg], 500);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('PayMongo create payment (tenant) unexpected error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to create PayMongo payment', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Handle PayMongo redirect return (user-facing).
     * Logs the incoming query and shows a simple page the user can close.
     */
    public function handleReturn(Request $request)
    {
        Log::info('Paymongo return received', $request->all());

        $status = $request->query('status', 'unknown');
        $sourceId = $request->query('data') ?? $request->query('source') ?? $request->query('id');

        $html = '<!doctype html><html><head><meta charset="utf-8"><title>Payment Return</title></head><body style="font-family: Arial, sans-serif; padding:24px;">';
        $html .= '<h2>Payment process completed</h2>';
        $html .= '<p>You may now return to the app. If the app does not update, please close this window.</p>';
        $html .= '<p><strong>Status:</strong> ' . htmlspecialchars($status) . '</p>';
        if ($sourceId) {
            $html .= '<p><strong>Reference:</strong> ' . htmlspecialchars(is_array($sourceId) ? json_encode($sourceId) : $sourceId) . '</p>';
        }
        $html .= '<p><button onclick="window.close();">Close</button></p>';
        $html .= '</body></html>';

        return response($html, 200)->header('Content-Type', 'text/html');
    }

    /**
     * Tenant-triggered refresh: query PayMongo for the invoice's gateway_reference(s)
     * and apply updates locally. Useful when webhooks are not available during testing.
     */
    public function refreshInvoiceForTenant(Request $request, $invoiceId)
    {
        $invoice = Invoice::findOrFail($invoiceId);
        $tenantId = Auth::id();
        if ($invoice->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // find any local payment transactions for this invoice that have a gateway reference
        $txs = PaymentTransaction::where('invoice_id', $invoice->id)->whereNotNull('gateway_reference')->get();

        $verifyEnv = config('services.paymongo.verify_ssl', true);
        if (is_string($verifyEnv) && file_exists($verifyEnv)) {
            $verify = $verifyEnv;
        } else {
            $verify = filter_var($verifyEnv, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if (is_null($verify)) $verify = true;
        }

        Log::info('Paymongo refreshInvoiceForTenant - verify resolved: ' . var_export($verify, true));

        $client = new Client(['base_uri' => 'https://api.paymongo.com/v1/', 'verify' => $verify]);

        $updated = false;
        foreach ($txs as $tx) {
            $ref = $tx->gateway_reference;
            try {
                // Try sources endpoint first
                $res = $client->get("sources/{$ref}", [ 'auth' => [config('services.paymongo.secret_key'), ''] ]);
                $body = json_decode((string)$res->getBody(), true);
                if (!is_array($body)) {
                    throw new \Exception('Invalid response from PayMongo');
                }
                $resource = $body['data']['attributes'] ?? null;
                $status = $resource['status'] ?? null;

                if ($status) {
                    if ($status === 'chargeable') {
                        // CRITICAL: If source is chargeable, we MUST create a payment to collect money
                        Log::info("Paymongo refresh: source {$ref} is chargeable. Creating payment...");
                        $paymentBody = $this->createPaymentFromSource($client, $ref, $tx->amount_cents, $tx->currency);
                        if ($paymentBody) {
                            $tx->status = 'succeeded';
                            $tx->gateway_reference = $paymentBody['data']['id'] ?? $tx->gateway_reference;
                            $tx->gateway_response = $paymentBody;
                            $tx->save();
                            $updated = true;
                        }
                    } elseif (in_array($status, ['succeeded', 'paid'])) {
                        $tx->status = 'succeeded';
                        $tx->gateway_response = $body;
                        $tx->save();
                        $updated = true;
                    } else {
                        $tx->status = $status;
                        $tx->gateway_response = $body;
                        $tx->save();
                    }

                    // update invoice status if applicable
                    if ($updated && $tx->invoice_id) {
                        $this->updateInvoiceAndBooking($tx->invoice_id, $tx->amount_cents);
                    }
                }
            } catch (\GuzzleHttp\Exception\ClientException $e) {
                // not found on sources, try payments
                try {
                    $res = $client->get("payments/{$ref}", [ 'auth' => [config('services.paymongo.secret_key'), ''] ]);
                    $body = json_decode((string)$res->getBody(), true);
                    if (!is_array($body)) {
                        throw new \Exception('Invalid response from PayMongo');
                    }
                    $payment = $body['data']['attributes'] ?? null;
                    if ($payment) {
                        $tx->status = 'succeeded';
                        $tx->gateway_response = $body;
                        $tx->save();
                        $updated = true;

                        if ($tx->invoice_id) {
                            $this->updateInvoiceAndBooking($tx->invoice_id, $tx->amount_cents);
                        }
                    }
                } catch (\Exception $e2) {
                    Log::warning('Paymongo refresh - reference not found or request failed: ' . $ref . ' - ' . $e2->getMessage());
                }
            } catch (\Exception $e) {
                Log::error('Paymongo refresh error for ref ' . $ref . ': ' . $e->getMessage());
            }
        }

        return response()->json(['success' => true, 'updated' => $updated]);
    }

    /**
     * Helper to create a payment from a chargeable source.
     */
    private function createPaymentFromSource($client, $sourceId, $amount, $currency)
    {
        try {
            $res = $client->post('payments', [
                'auth' => [config('services.paymongo.secret_key'), ''],
                'json' => [
                    'data' => [
                        'attributes' => [
                            'amount' => intval($amount),
                            'currency' => strtoupper($currency),
                            'source' => [
                                'id' => $sourceId,
                                'type' => 'source'
                            ]
                        ]
                    ]
                ]
            ]);
            return json_decode((string)$res->getBody(), true);
        } catch (\Exception $e) {
            Log::error('Failed to create payment from source ' . $sourceId . ': ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Helper to update invoice and booking status.
     */
    private function updateInvoiceAndBooking($invoiceId, $paidAmountCents)
    {
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
                    Log::info('Booking payment_status updated', ['booking_id' => $booking->id, 'payment_status' => $booking->payment_status]);
                }
            } catch (\Exception $be) {
                Log::error('Failed to update booking payment_status: ' . $be->getMessage());
            }
        }
    }
}
