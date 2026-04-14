<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Services\PaymentLedgerService;
use App\Services\Subscription\SubscriptionCheckoutService;
use App\Support\PaymongoKeyResolver;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymongoWebhookController extends Controller
{
    public function __construct(
        private readonly SubscriptionCheckoutService $subscriptionCheckoutService,
        private readonly PaymentLedgerService $paymentLedgerService,
    )
    {
    }

    private function isSettledTransactionStatus(?string $status): bool
    {
        $normalized = strtolower(trim((string) $status));

        return in_array($normalized, ['succeeded', 'paid', 'partially_refunded', 'refunded'], true);
    }

    private function settlementKeyForExternalReference(?string $externalReference): ?string
    {
        if (! is_string($externalReference) || trim($externalReference) === '') {
            return null;
        }

        return 'paymongo:external:'.trim($externalReference);
    }

    private function hasProcessedProviderEvent(?string $providerEventId): bool
    {
        if (! is_string($providerEventId) || trim($providerEventId) === '') {
            return false;
        }

        return PaymentTransaction::query()
            ->where('provider_event_id', trim($providerEventId))
            ->exists();
    }

    private function hasProcessedExternalReference(?string $externalReference): bool
    {
        if (! is_string($externalReference) || trim($externalReference) === '') {
            return false;
        }

        $externalReference = trim($externalReference);
        $settlementKey = $this->settlementKeyForExternalReference($externalReference);

        return PaymentTransaction::query()
            ->whereIn('status', ['succeeded', 'paid', 'partially_refunded', 'refunded'])
            ->where(function ($query) use ($externalReference, $settlementKey) {
                $query->where('gateway_reference', $externalReference);

                if ($settlementKey) {
                    $query->orWhere('idempotency_key', $settlementKey);
                }
            })
            ->exists();
    }

    private function resolveExternalReference(?string $resourceId, array $resourceAttr = [], array $metadata = []): ?string
    {
        $candidates = [
            $resourceId,
            data_get($resourceAttr, 'external_id'),
            data_get($resourceAttr, 'external_reference_number'),
            data_get($resourceAttr, 'metadata.external_id'),
            data_get($resourceAttr, 'metadata.external_reference_number'),
            data_get($metadata, 'external_id'),
            data_get($metadata, 'external_reference_number'),
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        return null;
    }

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
        $providerEventId = is_string($data['id'] ?? null) ? trim((string) $data['id']) : null;

        if ($this->hasProcessedProviderEvent($providerEventId)) {
            Log::info('PayMongo webhook duplicate provider event ignored.', [
                'event_id' => $providerEventId,
                'event_type' => $eventType,
            ]);

            return response()->json(['received' => true, 'duplicate' => true]);
        }

        try {
            if ($eventType === 'source.chargeable') {
                DB::transaction(function () use ($resourceId, $providerEventId) {
                    $tx = PaymentTransaction::query()
                        ->where('gateway_reference', $resourceId)
                        ->lockForUpdate()
                        ->first();

                    if (! $tx || $this->isSettledTransactionStatus($tx->status)) {
                        return;
                    }

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
                        'auth' => [PaymongoKeyResolver::getSecretKey(), ''],
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

                    if (! $paymentId) {
                        return;
                    }

                    $tx->status = 'succeeded';
                    $tx->gateway_reference = $paymentId;
                    $tx->gateway_response = $paymentBody;
                    $tx->provider_event_id = $providerEventId;
                    $tx->idempotency_key = $this->settlementKeyForExternalReference($paymentId) ?? $tx->idempotency_key;
                    $tx->save();

                    $this->paymentLedgerService->recomputeInvoiceAndBookingStatusById($tx->invoice_id);
                });
            } elseif ($eventType === 'payment.paid') {
                $resourceAttributes = is_array($resourceAttr) ? $resourceAttr : [];
                $externalReference = $this->resolveExternalReference($resourceId, $resourceAttributes);
                if ($this->hasProcessedExternalReference($externalReference)) {
                    Log::info('PayMongo payment.paid ignored; external reference already settled.', [
                        'event_id' => $providerEventId,
                        'external_reference' => $externalReference,
                    ]);

                    return response()->json(['received' => true, 'duplicate' => true]);
                }

                // If we created the payment ourselves, we might have already updated status.
                // But this handles payments created outside our flow or as a backup.
                $sourceId = $resourceAttributes['source']['id'] ?? null;
                $tx = null;
                if ($sourceId) {
                    $tx = PaymentTransaction::where('gateway_reference', $sourceId)->first();
                }
                if (! $tx) {
                    $tx = PaymentTransaction::where('gateway_reference', $resourceId)->first();
                }

                if ($tx) {
                    DB::transaction(function () use ($tx, $resourceId, $resourceAttributes, $providerEventId, $externalReference) {
                        $lockedTx = PaymentTransaction::query()
                            ->whereKey($tx->id)
                            ->lockForUpdate()
                            ->first();

                        if (! $lockedTx || $this->isSettledTransactionStatus($lockedTx->status)) {
                            return;
                        }

                        $lockedTx->status = 'succeeded';
                        $lockedTx->gateway_reference = $resourceId;
                        $lockedTx->gateway_response = $resourceAttributes;
                        $lockedTx->provider_event_id = $providerEventId;
                        $lockedTx->idempotency_key = $this->settlementKeyForExternalReference($externalReference) ?? $lockedTx->idempotency_key;
                        $lockedTx->save();

                        $this->paymentLedgerService->recomputeInvoiceAndBookingStatusById($lockedTx->invoice_id);
                    });
                }
            } elseif ($eventType === 'link.payment.paid') {
                $metadata = is_array($resourceAttr['metadata'] ?? null) ? $resourceAttr['metadata'] : [];
                $resourceAttributes = is_array($resourceAttr) ? $resourceAttr : [];
                $externalReference = $this->resolveExternalReference($resourceId, $resourceAttributes, $metadata);

                // QRPh link checkouts pass invoice/transaction metadata so we can settle locally.
                $settlementOutcome = $this->applyLinkPaymentToTransaction(
                    metadata: $metadata,
                    paymentReference: $resourceId,
                    resourceAttributes: $resourceAttributes,
                    providerEventId: $providerEventId,
                    externalReference: $externalReference,
                );

                if ($settlementOutcome !== 'already_settled' && isset($metadata['room_id']) && isset($metadata['tenant_id'])) {
                    $room = \App\Models\Room::find($metadata['room_id']);
                    if ($room) {
                        // NOTE: Do NOT update room status here — 'paid' is not a valid room status.
                        // Room status is managed by booking confirmation/cancellation only.

                        $tenant = \App\Models\User::find($metadata['tenant_id']);
                        if ($tenant) {
                            $paymongoSourceType = (string) ($resourceAttr['source']['type'] ?? '');
                            $methodForNotification = $paymongoSourceType === 'gcash'
                                ? 'paymongo_gcash'
                                : 'paymongo';
                            $tenant->notify(new \App\Notifications\RentPaidSuccess($methodForNotification));
                        }

                        // Notify landlord only when this PayMongo payment maps to an
                        // invoice that is already marked paid.
                        $invoiceId = isset($metadata['invoice_id']) ? (int) $metadata['invoice_id'] : null;
                        if ($invoiceId) {
                            $invoice = Invoice::find($invoiceId);
                            if ($invoice && $invoice->status === 'paid') {
                                $landlord = $room->property->landlord;
                                if ($landlord) {
                                    $landlord->notify(new \App\Notifications\NewPaymentReceived);
                                }
                            }
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
        } catch (UniqueConstraintViolationException $e) {
            Log::warning('PayMongo webhook duplicate settlement ignored by unique constraint.', [
                'event_id' => $providerEventId,
                'event_type' => $eventType,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['received' => true, 'duplicate' => true]);
        } catch (\Exception $e) {
            Log::error('PayMongo webhook handler error: '.$e->getMessage());

            return response()->json(['message' => 'Handler error'], 500);
        }
    }

    /**
     * Map link.payment.paid to a local payment transaction and settle the linked invoice.
     */
    private function applyLinkPaymentToTransaction(array $metadata, ?string $paymentReference, array $resourceAttributes, ?string $providerEventId, ?string $externalReference): string
    {
        $settledInvoiceId = null;

        $outcome = DB::transaction(function () use ($metadata, $paymentReference, $resourceAttributes, $providerEventId, $externalReference, &$settledInvoiceId): string {
            if ($this->hasProcessedExternalReference($externalReference)) {
                return 'already_settled';
            }

            $tx = null;

            $txId = isset($metadata['payment_transaction_id']) ? (int) $metadata['payment_transaction_id'] : 0;
            if ($txId > 0) {
                $tx = PaymentTransaction::query()
                    ->whereKey($txId)
                    ->lockForUpdate()
                    ->first();
            }

            if (! $tx) {
                $invoiceId = isset($metadata['invoice_id']) ? (int) $metadata['invoice_id'] : 0;
                if ($invoiceId > 0) {
                    $tx = PaymentTransaction::query()
                        ->where('invoice_id', $invoiceId)
                        ->whereIn('status', ['pending', 'processing', 'pending_offline'])
                        ->orderByDesc('id')
                        ->lockForUpdate()
                        ->first();
                }
            }

            if (! $tx) {
                return 'not_mapped';
            }

            if ($this->isSettledTransactionStatus($tx->status) && $tx->invoice_id) {
                return 'already_settled';
            }

            if (! $tx->invoice_id) {
                $materializedInvoice = $this->subscriptionCheckoutService
                    ->materializePaidInvoiceFromCheckoutTransaction($tx, $metadata);
                if ($materializedInvoice) {
                    $tx->invoice_id = $materializedInvoice->id;
                }
            }

            $tx->status = 'succeeded';
            if ($paymentReference) {
                $tx->gateway_reference = $paymentReference;
            }
            $tx->gateway_response = $resourceAttributes;
            $tx->provider_event_id = $providerEventId;
            $tx->idempotency_key = $this->settlementKeyForExternalReference($externalReference) ?? $tx->idempotency_key;
            $tx->save();

            $settledInvoiceId = $tx->invoice_id;

            return 'settled';
        });

        if ($outcome === 'settled' && $settledInvoiceId) {
            $this->paymentLedgerService->recomputeInvoiceAndBookingStatusById($settledInvoiceId);
        }

        return $outcome;
    }
}
