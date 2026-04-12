<?php

namespace App\Services\Subscription;

use App\Models\Invoice;
use App\Models\LandlordSubscription;
use App\Models\SubscriptionEvent;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class SubscriptionCheckoutService
{
    public function __construct(private readonly SubscriptionResolverService $subscriptionResolverService)
    {
    }

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

            $invoice = null;
            if ($requiresPayment) {
                $invoice = $this->createPendingCheckoutInvoice(
                    landlord: $landlord,
                    plan: $plan,
                    billingCycle: $normalizedBillingCycle,
                    amountCents: $amountCents,
                    periodStart: $startsAt,
                    periodEnd: $periodEndsAt,
                    subscription: $subscription,
                );

                $metadata = $subscription->metadata ?? [];
                $metadata['invoice_id'] = $invoice->id;
                $subscription->metadata = $metadata;
                $subscription->save();

                SubscriptionEvent::create([
                    'landlord_subscription_id' => $subscription->id,
                    'landlord_id' => $landlord->id,
                    'actor_user_id' => $landlord->id,
                    'event' => 'subscription.checkout_initiated',
                    'description' => sprintf('Checkout started for %s plan (%s).', $plan->name, $normalizedBillingCycle),
                    'metadata' => [
                        'billing_cycle' => $normalizedBillingCycle,
                        'amount_cents' => $amountCents,
                        'invoice_id' => $invoice->id,
                    ],
                ]);
            } else {
                SubscriptionEvent::create([
                    'landlord_subscription_id' => $subscription->id,
                    'landlord_id' => $landlord->id,
                    'actor_user_id' => $landlord->id,
                    'event' => 'subscription.checkout_activated',
                    'description' => sprintf('Plan switched to %s via self-service checkout.', $plan->name),
                    'metadata' => [
                        'billing_cycle' => $normalizedBillingCycle,
                        'amount_cents' => $amountCents,
                    ],
                ]);
            }

            return [
                'subscription' => $subscription->fresh(['plan']),
                'plan' => $plan,
                'invoice' => $invoice,
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

        $metadata = $subscription->metadata ?? [];
        $invoiceId = $metadata['invoice_id'] ?? null;

        if ($invoiceId === null) {
            return [
                'subscription' => $subscription->fresh(['plan']),
                'invoice' => null,
                'payment_required' => false,
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

        $activated = false;

        if (
            $invoice->status === 'paid'
            && $subscription->status === LandlordSubscription::STATUS_SCHEDULED
        ) {
            $subscription = DB::transaction(function () use ($subscription, $landlord, $invoice, &$activated) {
                $this->expireActiveSelfCheckoutSubscriptions($landlord->id, $subscription->id);

                $subscription->status = LandlordSubscription::STATUS_ACTIVE;
                if ($subscription->starts_at && $subscription->starts_at->gt(now())) {
                    $subscription->starts_at = now();
                }
                $subscription->save();

                SubscriptionEvent::create([
                    'landlord_subscription_id' => $subscription->id,
                    'landlord_id' => $landlord->id,
                    'actor_user_id' => $landlord->id,
                    'event' => 'subscription.checkout_activated',
                    'description' => 'Self-checkout subscription activated after payment confirmation.',
                    'metadata' => [
                        'invoice_id' => $invoice->id,
                        'invoice_status' => $invoice->status,
                    ],
                ]);

                $activated = true;

                return $subscription->fresh(['plan']);
            });
        }

        return [
            'subscription' => $subscription,
            'invoice' => $invoice,
            'payment_required' => $invoice->status !== 'paid',
            'activated' => $activated || $subscription->status === LandlordSubscription::STATUS_ACTIVE,
            'usage' => $this->subscriptionResolverService->getUsageSummary($landlord),
        ];
    }

    private function resolvePeriodEnd(Carbon $periodStart, string $billingCycle): Carbon
    {
        return $billingCycle === 'annual'
            ? $periodStart->copy()->addYearNoOverflow()
            : $periodStart->copy()->addMonthNoOverflow();
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