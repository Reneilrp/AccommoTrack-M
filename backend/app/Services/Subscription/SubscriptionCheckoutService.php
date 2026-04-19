<?php

namespace App\Services\Subscription;

use App\Models\Invoice;
use App\Models\LandlordSubscription;
use App\Models\PaymentTransaction;
use App\Models\SubscriptionEvent;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Support\PaymongoKeyResolver;
use Carbon\Carbon;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use InvalidArgumentException;

class SubscriptionCheckoutService
{
    public function __construct(private readonly SubscriptionResolverService $subscriptionResolverService) {}

    public function checkout(User $landlord, SubscriptionPlan $plan, string $billingCycle, array $attributes = []): array
    {
        $normalizedBillingCycle = strtolower(trim($billingCycle));

        if (! in_array($normalizedBillingCycle, ['monthly', 'annual'], true)) {
            throw new InvalidArgumentException('Billing cycle must be monthly or annual.');
        }

        if (! (bool) $plan->is_active) {
            throw new InvalidArgumentException('Selected subscription plan is not active.');
        }

        $current = $this->subscriptionResolverService->getCurrentSubscription($landlord);
        if (
            $current
            && (int) $current->plan_id === (int) $plan->id
            && $current->source === LandlordSubscription::SOURCE_SELF_CHECKOUT
            && $current->status === LandlordSubscription::STATUS_ACTIVE
        ) {
            throw new InvalidArgumentException('You are already subscribed to this plan.');
        }

        $startsAt = now();
        $periodEndsAt = $this->resolvePeriodEnd($startsAt, $normalizedBillingCycle);
        $amountCents = max($normalizedBillingCycle === 'annual'
            ? (int) $plan->annual_price_cents
            : (int) $plan->monthly_price_cents, 0);
        $requiresPayment = $amountCents > 0;

        return DB::transaction(function () use ($landlord, $plan, $normalizedBillingCycle, $attributes, $startsAt, $periodEndsAt, $amountCents, $requiresPayment) {
            if ($requiresPayment) {
                $reusableCheckout = $this->findReusablePendingCheckout(
                    landlordId: $landlord->id,
                    planId: (int) $plan->id,
                    billingCycle: $normalizedBillingCycle,
                    amountCents: $amountCents,
                );

                if ($reusableCheckout !== null) {
                    return [
                        'subscription' => $reusableCheckout['subscription'],
                        'plan' => $plan,
                        'invoice' => $reusableCheckout['invoice'],
                        'payment' => $reusableCheckout['payment'],
                        'payment_required' => true,
                        'usage' => $this->subscriptionResolverService->getUsageSummary($landlord),
                    ];
                }
            }

            $this->expireActiveSelfCheckoutSubscriptions($landlord->id);

            $subscription = LandlordSubscription::create([
                'landlord_id' => $landlord->id,
                'plan_id' => $plan->id,
                'source' => LandlordSubscription::SOURCE_SELF_CHECKOUT,
                'status' => $requiresPayment
                    ? LandlordSubscription::STATUS_SCHEDULED
                    : LandlordSubscription::STATUS_ACTIVE,
                'starts_at' => $startsAt,
                'ends_at' => $periodEndsAt,
                'auto_renew' => (bool) ($attributes['auto_renew'] ?? $requiresPayment),
                'metadata' => [
                    'billing_cycle' => $normalizedBillingCycle,
                    'amount_cents' => $amountCents,
                    'payment_required' => $requiresPayment,
                ],
            ]);

            if ($requiresPayment) {
                SubscriptionEvent::create([
                    'landlord_subscription_id' => $subscription->id,
                    'landlord_id' => $landlord->id,
                    'actor_user_id' => $landlord->id,
                    'event' => 'subscription.checkout_initiated',
                    'description' => sprintf('Checkout started for %s plan (%s).', $plan->name, $normalizedBillingCycle),
                    'metadata' => [
                        'billing_cycle' => $normalizedBillingCycle,
                        'amount_cents' => $amountCents,
                    ],
                ]);
            } else {
                SubscriptionEvent::create([
                    'landlord_subscription_id' => $subscription->id,
                    'landlord_id' => $landlord->id,
                    'actor_user_id' => $landlord->id,
                    'event' => 'subscription.checkout_activated',
                    'description' => sprintf('Subscription to %s activated via self-service checkout.', $plan->name),
                    'metadata' => [
                        'billing_cycle' => $normalizedBillingCycle,
                        'amount_cents' => $amountCents,
                    ],
                ]);
            }

            return [
                'subscription' => $subscription->fresh(['plan']),
                'plan' => $plan,
                'invoice' => null,
                'payment' => $this->buildPaymentPayloadFromSubscriptionMetadata(
                    is_array($subscription->metadata) ? $subscription->metadata : []
                ),
                'payment_required' => $requiresPayment,
                'usage' => $this->subscriptionResolverService->getUsageSummary($landlord),
            ];
        });
    }

    public function syncCheckoutStatus(User $landlord, LandlordSubscription $subscription): array
    {
        if ((int) $subscription->landlord_id !== (int) $landlord->id) {
            throw new InvalidArgumentException('Subscription does not belong to the authenticated landlord.');
        }

        if ($subscription->source !== LandlordSubscription::SOURCE_SELF_CHECKOUT) {
            throw new InvalidArgumentException('Only self-checkout subscriptions can be synchronized.');
        }

        $subscription = $subscription->fresh(['plan']);
        $metadata = $subscription->metadata ?? [];
        $invoiceId = $metadata['invoice_id'] ?? null;
        $payment = $this->buildPaymentPayloadFromSubscriptionMetadata(is_array($metadata) ? $metadata : []);

        if ($invoiceId === null) {
            return [
                'subscription' => $subscription,
                'invoice' => null,
                'payment' => $payment,
                'payment_required' => $subscription->status === LandlordSubscription::STATUS_SCHEDULED,
                'activated' => $subscription->status === LandlordSubscription::STATUS_ACTIVE,
                'usage' => $this->subscriptionResolverService->getUsageSummary($landlord),
            ];
        }

        /** @var Invoice|null $invoice */
        $invoice = Invoice::query()
            ->where('id', $invoiceId)
            ->where('landlord_id', $landlord->id)
            ->first();

        if (! $invoice) {
            throw new InvalidArgumentException('Linked checkout invoice was not found.');
        }

        if ($invoice->status === 'paid') {
            $subscription = $this->activateCheckoutSubscriptionFromPaidInvoice($invoice, $landlord->id)
                ?? $subscription->fresh(['plan']);
        }

        return [
            'subscription' => $subscription,
            'invoice' => $invoice,
            'payment' => $payment,
            'payment_required' => $invoice->status !== 'paid',
            'activated' => $subscription->status === LandlordSubscription::STATUS_ACTIVE,
            'usage' => $this->subscriptionResolverService->getUsageSummary($landlord),
        ];
    }

    public function activateCheckoutSubscriptionFromPaidInvoice(Invoice $invoice, ?int $actorUserId = null): ?LandlordSubscription
    {
        if (strtolower((string) $invoice->invoice_type) !== 'subscription') {
            return null;
        }

        if (strtolower((string) $invoice->status) !== 'paid') {
            return null;
        }

        $invoiceMetadata = is_array($invoice->metadata) ? $invoice->metadata : [];
        $subscriptionId = $invoiceMetadata['landlord_subscription_id'] ?? null;

        if (! $subscriptionId) {
            return null;
        }

        $subscription = LandlordSubscription::query()
            ->with('plan')
            ->where('id', $subscriptionId)
            ->where('landlord_id', $invoice->landlord_id)
            ->first();

        if (! $subscription) {
            return null;
        }

        if ($subscription->source !== LandlordSubscription::SOURCE_SELF_CHECKOUT) {
            return $subscription;
        }

        if ($subscription->status === LandlordSubscription::STATUS_ACTIVE) {
            return $subscription;
        }

        if ($subscription->status !== LandlordSubscription::STATUS_SCHEDULED) {
            return $subscription;
        }

        return DB::transaction(function () use ($subscription, $invoice, $actorUserId) {
            $this->expireActiveSelfCheckoutSubscriptions($invoice->landlord_id, $subscription->id);

            $subscription->status = LandlordSubscription::STATUS_ACTIVE;
            if ($subscription->starts_at && $subscription->starts_at->gt(now())) {
                $subscription->starts_at = now();
            }

            $subscriptionMetadata = is_array($subscription->metadata) ? $subscription->metadata : [];
            $subscriptionMetadata['invoice_id'] = $invoice->id;
            $subscriptionMetadata['payment_confirmed_at'] = now()->toIso8601String();
            $subscriptionMetadata['activated_via'] = 'payment.paid';
            $subscription->metadata = $subscriptionMetadata;
            $subscription->save();

            SubscriptionEvent::create([
                'landlord_subscription_id' => $subscription->id,
                'landlord_id' => $subscription->landlord_id,
                'actor_user_id' => $actorUserId,
                'event' => 'subscription.checkout_activated',
                'description' => 'Self-checkout subscription activated after payment confirmation.',
                'metadata' => [
                    'invoice_id' => $invoice->id,
                    'invoice_status' => $invoice->status,
                ],
            ]);

            return $subscription->fresh(['plan']);
        });
    }

    public function initiateCheckoutPayment(
        User $landlord,
        LandlordSubscription $subscription,
        string $method = 'qrph',
        ?string $returnUrl = null,
    ): array {
        if ((int) $subscription->landlord_id !== (int) $landlord->id) {
            throw new InvalidArgumentException('Subscription does not belong to the authenticated landlord.');
        }

        if ($subscription->source !== LandlordSubscription::SOURCE_SELF_CHECKOUT) {
            throw new InvalidArgumentException('Only self-checkout subscriptions can start PayMongo checkout.');
        }

        if ($subscription->status !== LandlordSubscription::STATUS_SCHEDULED) {
            throw new InvalidArgumentException('Only scheduled subscriptions can start payment checkout.');
        }

        $normalizedMethod = strtolower(trim($method));
        if ($normalizedMethod !== 'qrph') {
            throw new InvalidArgumentException('Only QRPh checkout is supported for subscription self-checkout.');
        }

        return DB::transaction(function () use ($landlord, $subscription, $normalizedMethod, $returnUrl) {
            $subscription = $subscription->fresh(['plan']);
            $metadata = is_array($subscription->metadata) ? $subscription->metadata : [];

            $existingTxId = (int) ($metadata['payment_transaction_id'] ?? 0);
            if ($existingTxId > 0) {
                $existingTx = PaymentTransaction::query()->find($existingTxId);
                if ($existingTx) {
                    $existingStatus = strtolower((string) $existingTx->status);
                    if (! in_array($existingStatus, ['failed', 'cancelled', 'refunded'], true)) {
                        $existingCheckoutUrl = $metadata['payment_checkout_url'] ?? $this->extractCheckoutUrlFromGatewayResponse($existingTx->gateway_response);
                        if ($existingCheckoutUrl) {
                            $metadata['payment_checkout_url'] = $existingCheckoutUrl;
                            $subscription->metadata = $metadata;
                            $subscription->save();
                        }

                        return [
                            'subscription' => $subscription,
                            'transaction' => $existingTx,
                            'checkout_url' => $existingCheckoutUrl,
                            'payment' => $this->buildPaymentPayloadFromSubscriptionMetadata($metadata),
                            'already_exists' => true,
                        ];
                    }
                }
            }

            $plan = $subscription->plan;
            $billingCycle = (string) ($metadata['billing_cycle'] ?? 'monthly');
            $amountCents = (int) ($metadata['amount_cents'] ?? 0);
            if ($amountCents <= 0) {
                $amountCents = $billingCycle === 'annual'
                    ? (int) ($plan?->annual_price_cents ?? 0)
                    : (int) ($plan?->monthly_price_cents ?? 0);
            }

            if ($amountCents <= 0) {
                throw new InvalidArgumentException('Subscription amount is not available for checkout.');
            }

            $currency = strtoupper((string) ($plan?->currency ?? 'PHP'));
            $description = sprintf(
                '%s subscription (%s billing)',
                (string) ($plan?->name ?? 'Subscription'),
                $billingCycle
            );

            $linkedInvoice = null;
            $linkedInvoiceId = isset($metadata['invoice_id']) ? (int) $metadata['invoice_id'] : 0;
            if ($linkedInvoiceId > 0) {
                $linkedInvoice = Invoice::query()
                    ->where('id', $linkedInvoiceId)
                    ->where('landlord_id', $landlord->id)
                    ->first();
            }

            $tx = PaymentTransaction::create([
                'invoice_id' => $linkedInvoice?->id,
                'tenant_id' => null,
                'amount_cents' => $amountCents,
                'currency' => $currency,
                'status' => 'pending',
                'method' => 'paymongo_'.$normalizedMethod,
            ]);

            $client = $this->createPaymongoClient('subscriptionCheckoutPayment');
            $payload = [
                'data' => [
                    'attributes' => [
                        'amount' => intval($amountCents),
                        'description' => $description,
                        'remarks' => 'SUB-'.$subscription->id,
                        'metadata' => [
                            'landlord_id' => (int) $landlord->id,
                            'landlord_subscription_id' => (int) $subscription->id,
                            'plan_id' => (int) ($plan?->id ?? 0),
                            'billing_cycle' => $billingCycle,
                            'payment_transaction_id' => (int) $tx->id,
                        ],
                    ],
                ],
            ];

            if ($returnUrl) {
                $payload['data']['attributes']['metadata']['return_url'] = $returnUrl;
            }

            $res = $client->post('links', [
                'auth' => [PaymongoKeyResolver::getSecretKey(true), ''],
                'json' => $payload,
            ]);

            $body = json_decode((string) $res->getBody(), true);
            if (! is_array($body)) {
                throw new \Exception('Invalid response from PayMongo');
            }

            $checkoutUrl = $body['data']['attributes']['checkout_url'] ?? null;
            if (! $checkoutUrl) {
                throw new \Exception('PayMongo checkout URL was not returned.');
            }

            $tx->gateway_reference = $body['data']['id'] ?? null;
            $tx->gateway_response = $body;
            $tx->save();

            $metadata['payment_method'] = $normalizedMethod;
            $metadata['payment_provider'] = 'paymongo_link';
            $metadata['payment_transaction_id'] = $tx->id;
            $metadata['payment_checkout_url'] = $checkoutUrl;
            $metadata['payment_required'] = true;
            $subscription->metadata = $metadata;
            $subscription->save();

            return [
                'subscription' => $subscription->fresh(['plan']),
                'transaction' => $tx,
                'checkout_url' => $checkoutUrl,
                'payment' => $this->buildPaymentPayloadFromSubscriptionMetadata($metadata),
                'already_exists' => false,
            ];
        });
    }

    public function materializePaidInvoiceFromCheckoutTransaction(PaymentTransaction $transaction, array $metadata = []): ?Invoice
    {
        if ($transaction->invoice_id) {
            return Invoice::query()->find($transaction->invoice_id);
        }

        $gatewayMetadata = is_array($transaction->gateway_response['data']['attributes']['metadata'] ?? null)
            ? $transaction->gateway_response['data']['attributes']['metadata']
            : [];

        $combinedMetadata = array_merge($gatewayMetadata, $metadata);
        $subscriptionId = isset($combinedMetadata['landlord_subscription_id']) ? (int) $combinedMetadata['landlord_subscription_id'] : 0;
        if ($subscriptionId <= 0) {
            return null;
        }

        $subscription = LandlordSubscription::query()
            ->with('plan')
            ->where('id', $subscriptionId)
            ->where('source', LandlordSubscription::SOURCE_SELF_CHECKOUT)
            ->first();

        if (! $subscription) {
            return null;
        }

        $subscriptionMetadata = is_array($subscription->metadata) ? $subscription->metadata : [];
        $existingInvoiceId = isset($subscriptionMetadata['invoice_id']) ? (int) $subscriptionMetadata['invoice_id'] : 0;
        if ($existingInvoiceId > 0) {
            $existingInvoice = Invoice::query()->find($existingInvoiceId);
            if ($existingInvoice) {
                $transaction->invoice_id = $existingInvoice->id;
                $transaction->save();

                return $existingInvoice;
            }
        }

        $plan = $subscription->plan;
        $billingCycle = (string) ($subscriptionMetadata['billing_cycle'] ?? $combinedMetadata['billing_cycle'] ?? 'monthly');
        $periodStart = $subscription->starts_at ? $subscription->starts_at->copy() : now();
        $periodEnd = $subscription->ends_at
            ? $subscription->ends_at->copy()
            : $this->resolvePeriodEnd($periodStart, $billingCycle);

        $invoiceAmountCents = (int) ($subscriptionMetadata['amount_cents'] ?? $transaction->amount_cents ?? 0);
        if ($invoiceAmountCents <= 0) {
            $invoiceAmountCents = (int) ($transaction->amount_cents ?? 0);
        }

        if ($invoiceAmountCents <= 0) {
            return null;
        }

        $invoice = Invoice::query()->create([
            'reference' => $this->generateInvoiceReference(),
            'landlord_id' => $subscription->landlord_id,
            'description' => sprintf('%s subscription (%s billing)', (string) ($plan?->name ?? 'Subscription'), $billingCycle),
            'invoice_type' => 'subscription',
            'amount_cents' => $invoiceAmountCents,
            'subtotal_cents' => $invoiceAmountCents,
            'total_cents' => $invoiceAmountCents,
            'currency' => strtoupper((string) ($plan?->currency ?? $transaction->currency ?? 'PHP')),
            'status' => 'paid',
            'issued_at' => now(),
            'due_date' => now()->toDateString(),
            'paid_at' => now(),
            'billing_period_start' => $periodStart->toDateString(),
            'billing_period_end' => $periodEnd->toDateString(),
            'billing_period_key' => $this->generateBillingPeriodKey(),
            'metadata' => [
                'domain' => 'subscriptions',
                'plan_id' => $plan?->id,
                'plan_slug' => $plan?->slug,
                'billing_cycle' => $billingCycle,
                'landlord_subscription_id' => $subscription->id,
                'payment_transaction_id' => $transaction->id,
            ],
        ]);

        $transaction->invoice_id = $invoice->id;
        $transaction->save();

        $subscriptionMetadata['invoice_id'] = $invoice->id;
        $subscriptionMetadata['payment_required'] = false;
        $subscription->metadata = $subscriptionMetadata;
        $subscription->save();

        return $invoice;
    }

    /**
     * Reuse the latest scheduled checkout for the same plan/cycle to avoid creating duplicates
     * when landlords repeatedly open and cancel checkout before paying.
     *
     * @return array{subscription: LandlordSubscription, invoice: Invoice|null, payment: array<string,mixed>}|null
     */
    private function findReusablePendingCheckout(int $landlordId, int $planId, string $billingCycle, int $amountCents): ?array
    {
        $candidates = LandlordSubscription::query()
            ->where('landlord_id', $landlordId)
            ->where('plan_id', $planId)
            ->where('source', LandlordSubscription::SOURCE_SELF_CHECKOUT)
            ->where('status', LandlordSubscription::STATUS_SCHEDULED)
            ->orderByDesc('id')
            ->get();

        foreach ($candidates as $candidate) {
            $metadata = is_array($candidate->metadata) ? $candidate->metadata : [];

            if (($metadata['billing_cycle'] ?? null) !== $billingCycle) {
                continue;
            }

            if ((int) ($metadata['amount_cents'] ?? $amountCents) !== $amountCents) {
                continue;
            }

            $invoice = null;
            $invoiceId = isset($metadata['invoice_id']) ? (int) $metadata['invoice_id'] : 0;
            if ($invoiceId > 0) {
                $invoice = Invoice::query()
                    ->where('id', $invoiceId)
                    ->where('landlord_id', $landlordId)
                    ->where('invoice_type', 'subscription')
                    ->first();

                if (! $invoice || ! $this->invoiceStillRequiresPayment($invoice)) {
                    $invoice = null;
                }
            }

            $txId = isset($metadata['payment_transaction_id']) ? (int) $metadata['payment_transaction_id'] : 0;
            if ($txId > 0) {
                $tx = PaymentTransaction::query()->find($txId);
                if (! $tx) {
                    continue;
                }

                $txStatus = strtolower((string) $tx->status);
                if (in_array($txStatus, ['failed', 'cancelled', 'refunded'], true)) {
                    continue;
                }
            }

            $payment = $this->buildPaymentPayloadFromSubscriptionMetadata($metadata);
            if (! $invoice && $txId <= 0) {
                return [
                    'subscription' => $candidate->fresh(['plan']),
                    'invoice' => null,
                    'payment' => $payment,
                ];
            }

            if (empty($payment['checkout_url']) && $txId > 0) {
                $tx = PaymentTransaction::query()->find($txId);
                if ($tx) {
                    $payment['checkout_url'] = $this->extractCheckoutUrlFromGatewayResponse($tx->gateway_response);
                    if (! empty($payment['checkout_url'])) {
                        $metadata['payment_checkout_url'] = $payment['checkout_url'];
                        $candidate->metadata = $metadata;
                        $candidate->save();
                    }
                }
            }

            return [
                'subscription' => $candidate->fresh(['plan']),
                'invoice' => $invoice,
                'payment' => $payment,
            ];
        }

        return null;
    }

    private function invoiceStillRequiresPayment(Invoice $invoice): bool
    {
        $invoiceTotalCents = (int) ($invoice->total_cents ?? $invoice->amount_cents ?? 0);
        if ($invoiceTotalCents <= 0) {
            return false;
        }

        $paidCents = (int) ($invoice->transactions()
            ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
            ->selectRaw('COALESCE(SUM(amount_cents - refunded_amount_cents), 0) as net_cents')
            ->value('net_cents') ?? 0);

        return $paidCents < $invoiceTotalCents;
    }

    /**
     * @return array{checkout_url: string|null, transaction_id: int|null, method: string|null, provider: string|null}
     */
    private function buildPaymentPayloadFromSubscriptionMetadata(array $metadata): array
    {
        return [
            'checkout_url' => isset($metadata['payment_checkout_url']) ? (string) $metadata['payment_checkout_url'] : null,
            'transaction_id' => isset($metadata['payment_transaction_id']) ? (int) $metadata['payment_transaction_id'] : null,
            'method' => isset($metadata['payment_method']) ? (string) $metadata['payment_method'] : null,
            'provider' => isset($metadata['payment_provider']) ? (string) $metadata['payment_provider'] : null,
        ];
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

    private function extractCheckoutUrlFromGatewayResponse(?array $gatewayResponse): ?string
    {
        if (! is_array($gatewayResponse)) {
            return null;
        }

        $checkoutUrl = $gatewayResponse['data']['attributes']['checkout_url']
            ?? $gatewayResponse['source']['data']['attributes']['redirect']['checkout_url']
            ?? null;

        return is_string($checkoutUrl) && $checkoutUrl !== '' ? $checkoutUrl : null;
    }

    private function resolvePeriodEnd(Carbon $periodStart, string $billingCycle): Carbon
    {
        return $billingCycle === 'annual'
            ? $periodStart->copy()->addYearNoOverflow()
            : $periodStart->copy()->addMonth();
    }

    private function createPendingCheckoutInvoice(
        User $landlord,
        SubscriptionPlan $plan,
        string $billingCycle,
        int $amountCents,
        Carbon $periodStart,
        Carbon $periodEnd,
        LandlordSubscription $subscription,
    ): Invoice {
        return Invoice::query()->create([
            'reference' => $this->generateInvoiceReference(),
            'landlord_id' => $landlord->id,
            'description' => sprintf('%s subscription (%s billing)', $plan->name, $billingCycle),
            'invoice_type' => 'subscription',
            'amount_cents' => $amountCents,
            'subtotal_cents' => $amountCents,
            'total_cents' => $amountCents,
            'currency' => $plan->currency ?? 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => now()->addDays(3),
            'billing_period_start' => $periodStart->toDateString(),
            'billing_period_end' => $periodEnd->toDateString(),
            'billing_period_key' => $this->generateBillingPeriodKey(),
            'metadata' => [
                'domain' => 'subscriptions',
                'plan_id' => $plan->id,
                'plan_slug' => $plan->slug,
                'billing_cycle' => $billingCycle,
                'landlord_subscription_id' => $subscription->id,
            ],
        ]);
    }

    private function expireActiveSelfCheckoutSubscriptions(int $landlordId, ?int $exceptSubscriptionId = null): void
    {
        $query = LandlordSubscription::query()
            ->where('landlord_id', $landlordId)
            ->where('source', LandlordSubscription::SOURCE_SELF_CHECKOUT)
            ->whereIn('status', [
                LandlordSubscription::STATUS_ACTIVE,
                LandlordSubscription::STATUS_GRACE,
                LandlordSubscription::STATUS_RESTRICTED,
                LandlordSubscription::STATUS_SCHEDULED,
            ]);

        if ($exceptSubscriptionId !== null) {
            $query->where('id', '!=', $exceptSubscriptionId);
        }

        $subscriptions = $query->get();

        foreach ($subscriptions as $subscription) {
            $subscription->status = LandlordSubscription::STATUS_EXPIRED;
            $subscription->ends_at = now();
            $subscription->save();

            SubscriptionEvent::create([
                'landlord_subscription_id' => $subscription->id,
                'landlord_id' => $subscription->landlord_id,
                'actor_user_id' => null,
                'event' => 'subscription.checkout_replaced',
                'description' => 'Previous self-checkout subscription replaced by a newer checkout.',
                'metadata' => [
                    'replaced_subscription_id' => $subscription->id,
                ],
            ]);
        }
    }

    private function generateInvoiceReference(): string
    {
        do {
            $reference = 'INV-'.date('Ymd').'-'.strtoupper(Str::random(6));
        } while (Invoice::query()->where('reference', $reference)->exists());

        return $reference;
    }

    private function generateBillingPeriodKey(): string
    {
        return 'SUB'.now()->format('ymdHi').strtoupper(Str::random(5));
    }
}
