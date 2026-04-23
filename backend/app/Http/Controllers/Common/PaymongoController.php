<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Services\PaymentLedgerService;
use App\Support\PaymongoKeyResolver;
use App\Support\SystemToggle;
use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymongoController extends Controller
{
    use ResolvesLandlordAccess;

    public function __construct(private readonly PaymentLedgerService $paymentLedgerService) {}

    private function tenantPaymentsTemporarilyDisabledResponse()
    {
        return response()->json([
            'message' => 'Tenant online payments are temporarily unavailable while payment compliance updates are in progress.',
        ], 503);
    }

    private function invoicePendingManualVerificationResponse()
    {
        return response()->json([
            'message' => 'This invoice is awaiting manual payment verification. Online checkout is temporarily disabled to prevent duplicate payments.',
        ], 422);
    }

    private function invoicePaymongoTemporarilyDisabledResponse()
    {
        return response()->json([
            'message' => 'Online invoice payments are temporarily unavailable while payment compliance updates are in progress.',
        ], 503);
    }

    private function isInvoicePaymongoDisabled(): bool
    {
        $tenantFallback = SystemToggle::getBool('tenant_payments_disabled', (bool) config('app.tenant_payments_disabled', false));

        return SystemToggle::getBool('invoice_paymongo_disabled', $tenantFallback);
    }

    private function isSettledTransactionStatus(?string $status): bool
    {
        $normalized = strtolower(trim((string) $status));

        return in_array($normalized, ['succeeded', 'paid', 'partially_refunded', 'refunded'], true);
    }

    /**
     * Create a PayMongo Source / session for an invoice.
     * Expects `method` in request (e.g. 'gcash' or 'card') and optional `return_url`.
     */
    public function createSource(Request $request, $invoiceId)
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_manage_payments');

        $validated = $request->validate([
            'method' => 'required|string',
            'return_url' => 'nullable|url',
        ]);

        $invoice = Invoice::findOrFail($invoiceId);
        if ($invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($invoice->property_id) {
            $this->checkPropertyAccess($context, (int) $invoice->property_id);
        }

        if ($this->isInvoicePaymongoDisabled()) {
            return $this->invoicePaymongoTemporarilyDisabledResponse();
        }

        if (strtolower((string) $invoice->status) === 'pending_verification') {
            return $this->invoicePendingManualVerificationResponse();
        }

        $method = strtolower(trim((string) $validated['method']));
        $returnUrl = $validated['return_url'] ?? config('app.url').'/payments/return';

        $invoiceTotal = $invoice->total_cents ?? $invoice->amount_cents;
        if (! $invoiceTotal) {
            return response()->json(['message' => 'Invoice has no amount set'], 422);
        }

        // Calculate total successful payments for this invoice, subtracting refunds (in cents from SQL, convert to decimal)
        $paidAmount = ($invoice->transactions()
            ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
            ->selectRaw('SUM(amount_cents - refunded_amount_cents) as net_cents')
            ->value('net_cents') ?? 0) / 100;

        $remainingBalance = max(0, $invoiceTotal - $paidAmount);

        if ($remainingBalance <= 0) {
            return response()->json(['message' => 'This invoice is already fully paid.'], 422);
        }

        $amountToPay = $remainingBalance;

        DB::beginTransaction();
        try {
            // create a pending transaction locally
            $tx = PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $invoice->tenant_id,
                'amount_cents' => $amountToPay, // Mutator handles decimal to integer conversion
                'currency' => $invoice->currency ?? 'PHP',
                'status' => 'pending',
                'method' => 'paymongo_'.$method,
            ]);

            $client = $this->createPaymongoClient('createSource');

            if ($method === 'qrph') {
                $result = $this->createQrphLinkCheckout($client, $invoice, $tx, $returnUrl);
                DB::commit();

                return response()->json($result, 200);
            }

            $payload = [
                'data' => [
                    'attributes' => [
                        'amount' => (int) round($amountToPay * 100), // Standard decimals to PayMongo cents
                        'currency' => strtoupper($invoice->currency ?? 'PHP'),
                        'type' => $method,
                        'redirect' => [
                            'success' => $returnUrl,
                            'failed' => $returnUrl,
                        ],
                    ],
                ],
            ];

            $res = $client->post('sources', [
                'auth' => [PaymongoKeyResolver::getSecretKey(), ''],
                'json' => $payload,
            ]);

            $body = json_decode((string) $res->getBody(), true);
            if (! is_array($body)) {
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
            Log::error('PayMongo create source error: '.$e->getMessage());
            $msg = $e->getResponse() ? (string) $e->getResponse()->getBody() : $e->getMessage();
            $statusCode = $e->getResponse() ? $e->getResponse()->getStatusCode() : 500;
            $providerMessage = $this->extractPaymongoErrorMessage($msg);

            return response()->json([
                'message' => $providerMessage ?: 'Failed to create PayMongo source',
                'error' => $providerMessage ?: $msg,
            ], ($statusCode >= 400 && $statusCode < 600) ? $statusCode : 500);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('PayMongo create source unexpected error: '.$e->getMessage());

            return response()->json(['message' => 'Failed to create PayMongo source', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create PayMongo Source for tenant-owned invoice (tenant checkout)
     */
    public function createSourceForTenant(Request $request, $invoiceId)
    {
        if ($this->isInvoicePaymongoDisabled()) {
            return $this->invoicePaymongoTemporarilyDisabledResponse();
        }

        if (SystemToggle::getBool('tenant_payments_disabled', (bool) config('app.tenant_payments_disabled', false))) {
            return $this->tenantPaymentsTemporarilyDisabledResponse();
        }

        $validated = $request->validate([
            'method' => 'required|string',
            'return_url' => 'nullable|url',
            'amount' => 'nullable|numeric|min:1',
        ]);

        $invoice = Invoice::findOrFail($invoiceId);
        $tenantId = Auth::id();
        if ($invoice->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (strtolower((string) $invoice->status) === 'pending_verification') {
            return $this->invoicePendingManualVerificationResponse();
        }

        $method = strtolower(trim((string) $validated['method']));
        $returnUrl = $validated['return_url'] ?? config('app.url').'/payments/return';

        $invoiceTotal = $invoice->total_cents ?? $invoice->amount_cents;
        if (! $invoiceTotal) {
            return response()->json(['message' => 'Invoice has no amount set'], 422);
        }

        // Calculate total successful payments (in cents, convert to decimal)
        $paidAmount = ($invoice->transactions()
            ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
            ->selectRaw('SUM(amount_cents - refunded_amount_cents) as net_cents')
            ->value('net_cents') ?? 0) / 100;

        $remainingBalance = max(0, $invoiceTotal - $paidAmount);

        if ($remainingBalance <= 0) {
            return response()->json(['message' => 'This invoice is already fully paid.'], 422);
        }

        if (isset($validated['amount'])) {
            $requestedAmount = $validated['amount'];
            if ($requestedAmount > $remainingBalance) {
                return response()->json([
                    'message' => 'Payment amount cannot exceed the remaining balance of ₱'.number_format($remainingBalance, 2),
                ], 422);
            }

            // --- Guard: check allow_partial_payments ---
            $invoice->load(['property', 'booking.property']);
            $property = $invoice->property ?? $invoice->booking?->property;
            $allowPartial = $property ? (bool) $property->allow_partial_payments : true;
            if (! $allowPartial && $requestedAmount < $remainingBalance) {
                return response()->json([
                    'message' => 'Partial payments are not allowed for this property. Please pay the full remaining balance of ₱'.number_format($remainingBalance, 2),
                ], 422);
            }

            if ($allowPartial && $property) {
                $minPercent = $property->min_partial_payment_pct ?? 20;
                $minAmount = $remainingBalance * ($minPercent / 100);
                if ($requestedAmount < $remainingBalance && $requestedAmount < $minAmount) {
                    return response()->json([
                        'message' => 'The minimum partial payment for this property is '.$minPercent.'% (₱'.number_format($minAmount, 2).').',
                    ], 422);
                }
            }

            $amountToPay = $requestedAmount;
        } else {
            $amountToPay = $remainingBalance;
        }

        DB::beginTransaction();
        try {
            $tx = PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $invoice->tenant_id,
                'amount_cents' => $amountToPay, // Mutator handles decimal to integer conversion
                'currency' => $invoice->currency ?? 'PHP',
                'status' => 'pending',
                'method' => 'paymongo_'.$method,
            ]);

            $client = $this->createPaymongoClient('createSourceForTenant');

            if ($method === 'qrph') {
                $result = $this->createQrphLinkCheckout($client, $invoice, $tx, $returnUrl);
                DB::commit();

                return response()->json($result, 200);
            }

            $payload = [
                'data' => [
                    'attributes' => [
                        'amount' => (int) round($amountToPay * 100), // Standard decimal to PayMongo cents
                        'currency' => strtoupper($invoice->currency ?? 'PHP'),
                        'type' => $method,
                        'redirect' => [
                            'success' => $returnUrl,
                            'failed' => $returnUrl,
                        ],
                    ],
                ],
            ];

            $res = $client->post('sources', [
                'auth' => [PaymongoKeyResolver::getSecretKey(), ''],
                'json' => $payload,
            ]);

            $body = json_decode((string) $res->getBody(), true);
            if (! is_array($body)) {
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
            Log::error('PayMongo create source (tenant) error: '.$e->getMessage());
            $msg = $e->getResponse() ? (string) $e->getResponse()->getBody() : $e->getMessage();
            $statusCode = $e->getResponse() ? $e->getResponse()->getStatusCode() : 500;
            $providerMessage = $this->extractPaymongoErrorMessage($msg);

            return response()->json([
                'message' => $providerMessage ?: 'Failed to create PayMongo source',
                'error' => $providerMessage ?: $msg,
            ], ($statusCode >= 400 && $statusCode < 600) ? $statusCode : 500);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('PayMongo create source (tenant) unexpected error: '.$e->getMessage());

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
        $this->ensureCaretakerCan($context, 'can_manage_payments');
        $validated = $request->validate([
            'payment_method_id' => 'nullable|string',
            'source_id' => 'nullable|string',
        ]);

        $invoice = Invoice::findOrFail($invoiceId);
        if ($invoice->landlord_id !== $context['landlord_id']) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($invoice->property_id) {
            $this->checkPropertyAccess($context, (int) $invoice->property_id);
        }

        if ($this->isInvoicePaymongoDisabled()) {
            return $this->invoicePaymongoTemporarilyDisabledResponse();
        }

        if (strtolower((string) $invoice->status) === 'pending_verification') {
            return $this->invoicePendingManualVerificationResponse();
        }

        $invoiceTotal = $invoice->total_cents ?? $invoice->amount_cents;
        if (! $invoiceTotal) {
            return response()->json(['message' => 'Invoice has no amount set'], 422);
        }

        // Calculate total successful payments (in cents, convert to decimal)
        $paidAmount = ($invoice->transactions()
            ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
            ->selectRaw('SUM(amount_cents - refunded_amount_cents) as net_cents')
            ->value('net_cents') ?? 0) / 100;

        $remainingBalance = max(0, $invoiceTotal - $paidAmount);

        if ($remainingBalance <= 0) {
            return response()->json(['message' => 'This invoice is already fully paid.'], 422);
        }

        $amountToPay = $remainingBalance;

        DB::beginTransaction();
        try {
            $verifyEnv = config('services.paymongo.verify_ssl', true);
            if (is_string($verifyEnv) && file_exists($verifyEnv)) {
                $verify = $verifyEnv;
            } else {
                $verify = filter_var($verifyEnv, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if (is_null($verify)) {
                    $verify = true;
                }
            }

            Log::info('Paymongo createPayment - verify resolved: '.var_export($verify, true));

            $client = new Client([
                'base_uri' => 'https://api.paymongo.com/v1/',
                'verify' => $verify,
            ]);

            $paymentPayload = [
                'data' => [
                    'attributes' => [
                        'amount' => (int) round($amountToPay * 100), // Standard decimal to PayMongo cents
                        'currency' => strtoupper($invoice->currency ?? 'PHP'),
                    ],
                ],
            ];

            if (! empty($validated['payment_method_id'])) {
                $paymentPayload['data']['attributes']['payment_method'] = $validated['payment_method_id'];
            } elseif (! empty($validated['source_id'])) {
                $paymentPayload['data']['attributes']['source'] = $validated['source_id'];
            } else {
                return response()->json(['message' => 'payment_method_id or source_id is required'], 422);
            }

            // create pending tx
            $tx = PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $invoice->tenant_id,
                'amount_cents' => $amountToPayCents,
                'currency' => $invoice->currency ?? 'PHP',
                'status' => 'pending',
                'method' => 'paymongo_payment',
            ]);

            $res = $client->post('payments', [
                'auth' => [PaymongoKeyResolver::getSecretKey(), ''],
                'json' => $paymentPayload,
            ]);

            $body = json_decode((string) $res->getBody(), true);
            if (! is_array($body)) {
                throw new \Exception('Invalid response from PayMongo');
            }
            $tx->gateway_reference = $body['data']['id'] ?? null;
            $tx->gateway_response = $body;
            $tx->status = 'succeeded'; // If /payments succeeds, it's paid
            $tx->save();

            $this->paymentLedgerService->recomputeInvoiceAndBookingStatusById($invoice->id, Auth::id());

            DB::commit();

            return response()->json(['transaction' => $tx, 'payment' => $body], 200);
        } catch (\GuzzleHttp\Exception\RequestException $e) {
            DB::rollBack();
            Log::error('PayMongo create payment error: '.$e->getMessage());
            $msg = $e->getResponse() ? (string) $e->getResponse()->getBody() : $e->getMessage();

            return response()->json(['message' => 'Failed to create PayMongo payment', 'error' => $msg], 500);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('PayMongo create payment unexpected error: '.$e->getMessage());

            return response()->json(['message' => 'Failed to create PayMongo payment', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create PayMongo payment for tenant-owned invoice (tenant checkout)
     */
    public function createPaymentForTenant(Request $request, $invoiceId)
    {
        if ($this->isInvoicePaymongoDisabled()) {
            return $this->invoicePaymongoTemporarilyDisabledResponse();
        }

        if (SystemToggle::getBool('tenant_payments_disabled', (bool) config('app.tenant_payments_disabled', false))) {
            return $this->tenantPaymentsTemporarilyDisabledResponse();
        }

        $validated = $request->validate([
            'payment_method_id' => 'nullable|string',
            'source_id' => 'nullable|string',
        ]);

        $invoice = Invoice::findOrFail($invoiceId);
        $tenantId = Auth::id();
        if ($invoice->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (strtolower((string) $invoice->status) === 'pending_verification') {
            return $this->invoicePendingManualVerificationResponse();
        }

        $invoiceTotal = $invoice->total_cents ?? $invoice->amount_cents;
        if (! $invoiceTotal) {
            return response()->json(['message' => 'Invoice has no amount set'], 422);
        }

        // Calculate total successful payments (in cents, convert to decimal)
        $paidAmount = ($invoice->transactions()
            ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
            ->selectRaw('SUM(amount_cents - refunded_amount_cents) as net_cents')
            ->value('net_cents') ?? 0) / 100;

        $remainingBalance = max(0, $invoiceTotal - $paidAmount);

        if ($remainingBalance <= 0) {
            return response()->json(['message' => 'This invoice is already fully paid.'], 422);
        }

        $amountToPay = $remainingBalance;

        DB::beginTransaction();
        try {
            $verifyEnv = config('services.paymongo.verify_ssl', true);
            if (is_string($verifyEnv) && file_exists($verifyEnv)) {
                $verify = $verifyEnv;
            } else {
                $verify = filter_var($verifyEnv, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if (is_null($verify)) {
                    $verify = true;
                }
            }

            Log::info('Paymongo createPaymentForTenant - verify resolved: '.var_export($verify, true));

            $client = new Client([
                'base_uri' => 'https://api.paymongo.com/v1/',
                'verify' => $verify,
            ]);

            $paymentPayload = [
                'data' => [
                    'attributes' => [
                        'amount' => (int) round($amountToPay * 100), // Standard decimal to PayMongo cents
                        'currency' => strtoupper($invoice->currency ?? 'PHP'),
                    ],
                ],
            ];

            if (! empty($validated['payment_method_id'])) {
                $paymentPayload['data']['attributes']['payment_method'] = $validated['payment_method_id'];
            } elseif (! empty($validated['source_id'])) {
                $paymentPayload['data']['attributes']['source'] = $validated['source_id'];
            } else {
                return response()->json(['message' => 'payment_method_id or source_id is required'], 422);
            }

            $tx = PaymentTransaction::create([
                'invoice_id' => $invoice->id,
                'tenant_id' => $invoice->tenant_id,
                'amount_cents' => $amountToPayCents,
                'currency' => $invoice->currency ?? 'PHP',
                'status' => 'pending',
                'method' => 'paymongo_payment',
            ]);

            $res = $client->post('payments', [
                'auth' => [PaymongoKeyResolver::getSecretKey(), ''],
                'json' => $paymentPayload,
            ]);

            $body = json_decode((string) $res->getBody(), true);
            if (! is_array($body)) {
                throw new \Exception('Invalid response from PayMongo');
            }
            $tx->gateway_reference = $body['data']['id'] ?? null;
            $tx->gateway_response = $body;
            $tx->status = 'succeeded'; // If /payments succeeds, it's paid
            $tx->save();

            $this->paymentLedgerService->recomputeInvoiceAndBookingStatusById($invoice->id, Auth::id());

            DB::commit();

            return response()->json(['transaction' => $tx, 'payment' => $body], 200);
        } catch (\GuzzleHttp\Exception\RequestException $e) {
            DB::rollBack();
            Log::error('PayMongo create payment (tenant) error: '.$e->getMessage());
            $msg = $e->getResponse() ? (string) $e->getResponse()->getBody() : $e->getMessage();

            return response()->json(['message' => 'Failed to create PayMongo payment', 'error' => $msg], 500);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('PayMongo create payment (tenant) unexpected error: '.$e->getMessage());

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
        $html .= '<p><strong>Status:</strong> '.htmlspecialchars($status).'</p>';
        if ($sourceId) {
            $html .= '<p><strong>Reference:</strong> '.htmlspecialchars(is_array($sourceId) ? json_encode($sourceId) : $sourceId).'</p>';
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
        if ($this->isInvoicePaymongoDisabled()) {
            return $this->invoicePaymongoTemporarilyDisabledResponse();
        }

        if (SystemToggle::getBool('tenant_payments_disabled', (bool) config('app.tenant_payments_disabled', false))) {
            return $this->tenantPaymentsTemporarilyDisabledResponse();
        }

        $invoice = Invoice::findOrFail($invoiceId);
        $tenantId = Auth::id();
        if ($invoice->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (strtolower((string) $invoice->status) === 'pending_verification') {
            return $this->invoicePendingManualVerificationResponse();
        }

        // find any local payment transactions for this invoice that have a gateway reference
        $txs = PaymentTransaction::where('invoice_id', $invoice->id)->whereNotNull('gateway_reference')->get();

        $verifyEnv = config('services.paymongo.verify_ssl', true);
        if (is_string($verifyEnv) && file_exists($verifyEnv)) {
            $verify = $verifyEnv;
        } else {
            $verify = filter_var($verifyEnv, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if (is_null($verify)) {
                $verify = true;
            }
        }

        Log::info('Paymongo refreshInvoiceForTenant - verify resolved: '.var_export($verify, true));

        $client = new Client(['base_uri' => 'https://api.paymongo.com/v1/', 'verify' => $verify]);

        $updated = false;
        $invoicesToRecompute = [];

        foreach ($txs as $tx) {
            try {
                [$txUpdated, $invoiceId] = DB::transaction(function () use ($client, $tx): array {
                    // ... [Lock and fetch logic remains same] ...
                    $lockedTx = PaymentTransaction::query()->whereKey($tx->id)->lockForUpdate()->first();
                    if (!$lockedTx || !$lockedTx->gateway_reference || $this->isSettledTransactionStatus($lockedTx->status)) {
                        return [false, $lockedTx?->invoice_id];
                    }

                    $ref = $lockedTx->gateway_reference;
                    // Logic to fetch from PayMongo and update $lockedTx...
                    // [Assuming standard refresh logic here]
                    $res = $client->get("sources/{$ref}", ['auth' => [PaymongoKeyResolver::getSecretKey(), '']]);
                    $body = json_decode((string) $res->getBody(), true);
                    $resource = $body['data']['attributes'] ?? null;
                    $status = strtolower((string) ($resource['status'] ?? ''));

                    if ($status === 'chargeable') {
                        $paymentBody = $this->createPaymentFromSource($client, $ref, $lockedTx->amount_cents, $lockedTx->currency);
                        if ($paymentBody) {
                            $lockedTx->status = 'succeeded';
                            $lockedTx->gateway_reference = $paymentBody['data']['id'] ?? $lockedTx->gateway_reference;
                            $lockedTx->gateway_response = $paymentBody;
                            $lockedTx->save();
                            return [true, $lockedTx->invoice_id];
                        }
                    } else if (in_array($status, ['succeeded', 'paid'], true)) {
                        $lockedTx->status = $status;
                        $lockedTx->save();
                        return [true, $lockedTx->invoice_id];
                    }

                    return [false, $lockedTx->invoice_id];
                });

                if ($txUpdated && $invoiceId) {
                    $invoicesToRecompute[$invoiceId] = true;
                    $updated = true;
                }
            } catch (\Exception $e) {
                Log::error('Paymongo refresh error: '.$e->getMessage());
            }
        }

        // OPTIMIZATION: Recompute each invoice ONLY ONCE after all transactions are updated
        foreach (array_keys($invoicesToRecompute) as $invId) {
            $this->paymentLedgerService->recomputeInvoiceAndBookingStatusById($invId, Auth::id());
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
                'auth' => [PaymongoKeyResolver::getSecretKey(), ''],
                'json' => [
                    'data' => [
                        'attributes' => [
                            'amount' => (int) round($amount * 100), // Standard decimal to PayMongo cents
                            'currency' => strtoupper($currency),
                            'source' => [
                                'id' => $sourceId,
                                'type' => 'source',
                            ],
                        ],
                    ],
                ],
            ]);

            return json_decode((string) $res->getBody(), true);
        } catch (\Exception $e) {
            Log::error('Failed to create payment from source '.$sourceId.': '.$e->getMessage());

            return null;
        }
    }

    private function createPaymongoClient(string $context): Client
    {
        $verify = $this->resolvePaymongoVerify();
        Log::info('Paymongo '.$context.' - verify resolved: '.var_export($verify, true));

        return new Client([
            'base_uri' => 'https://api.paymongo.com/v1/',
            'verify' => $verify,
        ]);
    }

    /**
     * Resolve TLS verification config (bool or custom CA bundle path).
     *
     * @return bool|string
     */
    private function resolvePaymongoVerify()
    {
        $verifyEnv = config('services.paymongo.verify_ssl', true);
        if (is_string($verifyEnv) && file_exists($verifyEnv)) {
            return $verifyEnv;
        }

        $verify = filter_var($verifyEnv, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

        return is_null($verify) ? true : $verify;
    }

    /**
     * Create a PayMongo Link for QRPh checkout and return a source-compatible payload.
     */
    private function createQrphLinkCheckout(Client $client, Invoice $invoice, PaymentTransaction $tx, string $returnUrl): array
    {
        $metadata = [
            'invoice_id' => (int) $invoice->id,
            'landlord_id' => (int) $invoice->landlord_id,
            'payment_transaction_id' => (int) $tx->id,
            'flow' => 'invoice_checkout',
        ];

        if (! empty($invoice->tenant_id)) {
            $metadata['tenant_id'] = (int) $invoice->tenant_id;
        }

        $payload = [
            'data' => [
                'attributes' => [
                    'amount' => (int) round($tx->amount_cents * 100), // Standard decimal to PayMongo cents
                    'description' => (string) ($invoice->description ?: 'Invoice #'.$invoice->id),
                    'remarks' => (string) ($invoice->reference ?: 'INV-'.$invoice->id),
                    'metadata' => $metadata,
                ],
            ],
        ];

        $res = $client->post('links', [
            'auth' => [PaymongoKeyResolver::getSecretKey(), ''],
            'json' => $payload,
        ]);

        $body = json_decode((string) $res->getBody(), true);
        if (! is_array($body)) {
            throw new \Exception('Invalid response from PayMongo');
        }

        $linkId = $body['data']['id'] ?? null;
        $checkoutUrl = $body['data']['attributes']['checkout_url'] ?? null;
        if (! $checkoutUrl) {
            throw new \Exception('PayMongo checkout URL was not returned.');
        }

        $tx->gateway_reference = $linkId;
        $tx->gateway_response = $body;
        $tx->save();

        $sourceCompatible = [
            'data' => [
                'id' => $linkId,
                'type' => 'source',
                'attributes' => [
                    'type' => 'qrph',
                    'status' => $body['data']['attributes']['status'] ?? 'pending',
                    'redirect' => [
                        'checkout_url' => $checkoutUrl,
                        'success' => $returnUrl,
                        'failed' => $returnUrl,
                    ],
                ],
            ],
        ];

        return [
            'transaction' => $tx,
            'source' => $sourceCompatible,
            'link' => $body,
            'checkout_url' => $checkoutUrl,
        ];
    }

    private function extractPaymongoErrorMessage(string $rawMessage): ?string
    {
        $decoded = json_decode($rawMessage, true);
        if (! is_array($decoded)) {
            return null;
        }

        $errors = $decoded['errors'] ?? null;
        if (is_array($errors) && count($errors) > 0) {
            $first = $errors[0];
            if (is_array($first)) {
                if (! empty($first['detail']) && is_string($first['detail'])) {
                    return $first['detail'];
                }
                if (! empty($first['code']) && is_string($first['code'])) {
                    return $first['code'];
                }
            }
        }

        if (! empty($decoded['message']) && is_string($decoded['message'])) {
            return $decoded['message'];
        }

        return null;
    }
}
