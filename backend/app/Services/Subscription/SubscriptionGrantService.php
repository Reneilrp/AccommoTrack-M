<?php

namespace App\Services\Subscription;

use App\Models\LandlordSubscription;
use App\Models\SubscriptionEvent;
use App\Models\SubscriptionGrant;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SubscriptionGrantService
{
    public function __construct(private readonly SubscriptionResolverService $subscriptionResolverService)
    {
    }

    public function grantPlan(User $landlord, SubscriptionPlan $plan, User $admin, array $attributes): array
    {
        $startsAt = isset($attributes['starts_at']) ? Carbon::parse($attributes['starts_at']) : now();
        $endsAt = $this->resolveEndsAt($startsAt, $attributes);
        $durationMonths = $attributes['duration_months'] ?? null;
        $status = $startsAt->gt(now())
            ? SubscriptionGrant::STATUS_SCHEDULED
            : SubscriptionGrant::STATUS_ACTIVE;

        return DB::transaction(function () use ($landlord, $plan, $admin, $attributes, $startsAt, $endsAt, $durationMonths, $status) {
            if ($status === SubscriptionGrant::STATUS_ACTIVE) {
                $this->expireActiveAdminGrants($landlord->id, $admin->id);
            }

            $subscription = LandlordSubscription::create([
                'landlord_id' => $landlord->id,
                'plan_id' => $plan->id,
                'source' => LandlordSubscription::SOURCE_ADMIN_GRANT,
                'status' => $status === SubscriptionGrant::STATUS_ACTIVE
                    ? LandlordSubscription::STATUS_ACTIVE
                    : LandlordSubscription::STATUS_SCHEDULED,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'auto_renew' => (bool) ($attributes['auto_renew'] ?? false),
                'created_by_admin_id' => $admin->id,
                'metadata' => [
                    'notes' => $attributes['notes'] ?? null,
                    'duration_months' => $durationMonths,
                    'grant_mode' => isset($attributes['duration_months']) ? 'duration_months' : 'ends_at',
                ],
            ]);

            $grant = SubscriptionGrant::create([
                'landlord_id' => $landlord->id,
                'plan_id' => $plan->id,
                'subscription_id' => $subscription->id,
                'granted_by_admin_id' => $admin->id,
                'status' => $status,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'duration_months' => $durationMonths,
                'auto_renew' => (bool) ($attributes['auto_renew'] ?? false),
                'notes' => $attributes['notes'] ?? null,
                'metadata' => [
                    'granted_via' => 'admin',
                    'grant_mode' => isset($attributes['duration_months']) ? 'duration_months' : 'ends_at',
                ],
            ]);

            SubscriptionEvent::create([
                'landlord_subscription_id' => $subscription->id,
                'subscription_grant_id' => $grant->id,
                'landlord_id' => $landlord->id,
                'actor_user_id' => $admin->id,
                'event' => 'subscription.granted',
                'description' => sprintf('Admin granted %s plan to landlord.', $plan->name),
                'metadata' => [
                    'status' => $status,
                    'starts_at' => $startsAt->toISOString(),
                    'ends_at' => $endsAt->toISOString(),
                    'duration_months' => $durationMonths,
                ],
            ]);

            return [
                'subscription' => $subscription->fresh(['plan', 'createdByAdmin']),
                'grant' => $grant->fresh(['plan', 'grantedByAdmin']),
                'usage' => $this->subscriptionResolverService->getUsageSummary($landlord),
            ];
        });
    }

    public function extendGrant(SubscriptionGrant $grant, User $admin, array $attributes): array
    {
        if (in_array($grant->status, [SubscriptionGrant::STATUS_REVOKED, SubscriptionGrant::STATUS_EXPIRED], true)) {
            throw new InvalidArgumentException('Only active or scheduled grants can be extended.');
        }

        $newEndsAt = $this->resolveExtendedEndDate($grant, $attributes);

        return DB::transaction(function () use ($grant, $admin, $attributes, $newEndsAt) {
            $grant->ends_at = $newEndsAt;
            if (isset($attributes['notes'])) {
                $grant->notes = $attributes['notes'];
            }
            $grant->save();

            if ($grant->subscription && ! in_array($grant->subscription->status, [LandlordSubscription::STATUS_REVOKED, LandlordSubscription::STATUS_EXPIRED], true)) {
                $grant->subscription->ends_at = $newEndsAt;
                $grant->subscription->save();
            }

            SubscriptionEvent::create([
                'landlord_subscription_id' => $grant->subscription_id,
                'subscription_grant_id' => $grant->id,
                'landlord_id' => $grant->landlord_id,
                'actor_user_id' => $admin->id,
                'event' => 'subscription.grant_extended',
                'description' => 'Admin extended subscription grant end date.',
                'metadata' => [
                    'new_ends_at' => $newEndsAt->toISOString(),
                    'add_months' => $attributes['add_months'] ?? null,
                    'notes' => $attributes['notes'] ?? null,
                ],
            ]);

            return [
                'grant' => $grant->fresh(['plan', 'grantedByAdmin', 'revokedByAdmin', 'subscription.plan']),
                'subscription' => $grant->subscription?->fresh(['plan', 'createdByAdmin']),
            ];
        });
    }

    public function revokeGrant(SubscriptionGrant $grant, User $admin, ?string $reason = null): array
    {
        if ($grant->status === SubscriptionGrant::STATUS_REVOKED) {
            return [
                'grant' => $grant->fresh(['plan', 'grantedByAdmin', 'revokedByAdmin', 'subscription.plan']),
                'subscription' => $grant->subscription?->fresh(['plan', 'createdByAdmin']),
            ];
        }

        return DB::transaction(function () use ($grant, $admin, $reason) {
            $grant->status = SubscriptionGrant::STATUS_REVOKED;
            $grant->revoked_at = now();
            $grant->revoked_by_admin_id = $admin->id;
            $grant->revoke_reason = $reason;
            $grant->save();

            if ($grant->subscription && ! in_array($grant->subscription->status, [LandlordSubscription::STATUS_REVOKED, LandlordSubscription::STATUS_EXPIRED], true)) {
                $grant->subscription->status = LandlordSubscription::STATUS_REVOKED;
                $grant->subscription->ends_at = now();
                $grant->subscription->save();
            }

            SubscriptionEvent::create([
                'landlord_subscription_id' => $grant->subscription_id,
                'subscription_grant_id' => $grant->id,
                'landlord_id' => $grant->landlord_id,
                'actor_user_id' => $admin->id,
                'event' => 'subscription.grant_revoked',
                'description' => 'Admin revoked subscription grant.',
                'metadata' => [
                    'reason' => $reason,
                ],
            ]);

            return [
                'grant' => $grant->fresh(['plan', 'grantedByAdmin', 'revokedByAdmin', 'subscription.plan']),
                'subscription' => $grant->subscription?->fresh(['plan', 'createdByAdmin']),
            ];
        });
    }

    public function getLandlordTimeline(User $landlord): array
    {
        return [
            'subscriptions' => LandlordSubscription::query()
                ->with(['plan', 'createdByAdmin'])
                ->where('landlord_id', $landlord->id)
                ->orderByDesc('starts_at')
                ->orderByDesc('id')
                ->get(),
            'grants' => SubscriptionGrant::query()
                ->with(['plan', 'grantedByAdmin', 'revokedByAdmin', 'subscription'])
                ->where('landlord_id', $landlord->id)
                ->orderByDesc('starts_at')
                ->orderByDesc('id')
                ->get(),
            'events' => SubscriptionEvent::query()
                ->where('landlord_id', $landlord->id)
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->limit(300)
                ->get(),
        ];
    }

    private function resolveEndsAt(Carbon $startsAt, array $attributes): Carbon
    {
        if (isset($attributes['ends_at'])) {
            $endsAt = Carbon::parse($attributes['ends_at']);
        } elseif (isset($attributes['duration_months'])) {
            $endsAt = $startsAt->copy()->addMonthsNoOverflow((int) $attributes['duration_months']);
        } else {
            throw new InvalidArgumentException('Provide either duration_months or ends_at.');
        }

        if ($endsAt->lte($startsAt)) {
            throw new InvalidArgumentException('Grant end date must be after start date.');
        }

        return $endsAt;
    }

    private function resolveExtendedEndDate(SubscriptionGrant $grant, array $attributes): Carbon
    {
        if (isset($attributes['ends_at'])) {
            $newEndsAt = Carbon::parse($attributes['ends_at']);
        } elseif (isset($attributes['add_months'])) {
            $base = $grant->ends_at ? Carbon::parse($grant->ends_at) : now();
            $newEndsAt = $base->copy()->addMonthsNoOverflow((int) $attributes['add_months']);
        } else {
            throw new InvalidArgumentException('Provide either add_months or ends_at.');
        }

        if ($newEndsAt->lte(Carbon::parse($grant->starts_at))) {
            throw new InvalidArgumentException('Extended end date must be after the grant start date.');
        }

        return $newEndsAt;
    }

    private function expireActiveAdminGrants(int $landlordId, int $adminId): void
    {
        $activeAdminSubscriptions = LandlordSubscription::query()
            ->where('landlord_id', $landlordId)
            ->where('source', LandlordSubscription::SOURCE_ADMIN_GRANT)
            ->effectiveNow()
            ->get();

        foreach ($activeAdminSubscriptions as $subscription) {
            $subscription->status = LandlordSubscription::STATUS_EXPIRED;
            $subscription->ends_at = now();
            $subscription->save();

            SubscriptionGrant::query()
                ->where('subscription_id', $subscription->id)
                ->whereIn('status', [SubscriptionGrant::STATUS_ACTIVE, SubscriptionGrant::STATUS_SCHEDULED])
                ->update([
                    'status' => SubscriptionGrant::STATUS_EXPIRED,
                    'ends_at' => now(),
                ]);

            SubscriptionEvent::create([
                'landlord_subscription_id' => $subscription->id,
                'landlord_id' => $landlordId,
                'actor_user_id' => $adminId,
                'event' => 'subscription.grant_replaced',
                'description' => 'Active admin grant replaced by a new grant.',
                'metadata' => ['subscription_id' => $subscription->id],
            ]);
        }
    }
}
