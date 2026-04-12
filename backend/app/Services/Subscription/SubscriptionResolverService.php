<?php

namespace App\Services\Subscription;

use App\Models\LandlordSubscription;
use App\Models\Room;
use App\Models\SubscriptionEvent;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Support\Collection;

class SubscriptionResolverService
{
    public function getPlanCatalog(bool $onlyActive = true): Collection
    {
        $query = SubscriptionPlan::query()->orderBy('sort_order')->orderBy('id');

        if ($onlyActive) {
            $query->where('is_active', true);
        }

        return $query->get();
    }

    public function ensureDefaultFreeSubscription(User $landlord): LandlordSubscription
    {
        $existing = LandlordSubscription::query()
            ->where('landlord_id', $landlord->id)
            ->where('source', LandlordSubscription::SOURCE_SYSTEM_DEFAULT)
            ->whereIn('status', [
                LandlordSubscription::STATUS_ACTIVE,
                LandlordSubscription::STATUS_GRACE,
                LandlordSubscription::STATUS_RESTRICTED,
                LandlordSubscription::STATUS_SCHEDULED,
            ])
            ->orderByDesc('starts_at')
            ->first();

        if ($existing) {
            return $existing;
        }

        $freePlan = SubscriptionPlan::query()->where('slug', SubscriptionPlan::FREE_SLUG)->first();

        if (! $freePlan) {
            $freePlan = SubscriptionPlan::create([
                'name' => 'Free',
                'slug' => SubscriptionPlan::FREE_SLUG,
                'monthly_price_cents' => 0,
                'annual_price_cents' => 0,
                'currency' => 'PHP',
                'max_properties' => 1,
                'max_rooms_total' => 10,
                'features' => ['core_listing', 'basic_support'],
                'is_active' => true,
                'sort_order' => 1,
            ]);
        }

        $subscription = LandlordSubscription::create([
            'landlord_id' => $landlord->id,
            'plan_id' => $freePlan->id,
            'source' => LandlordSubscription::SOURCE_SYSTEM_DEFAULT,
            'status' => LandlordSubscription::STATUS_ACTIVE,
            'starts_at' => now(),
            'ends_at' => null,
            'auto_renew' => false,
            'metadata' => ['auto_created' => true],
        ]);

        SubscriptionEvent::create([
            'landlord_subscription_id' => $subscription->id,
            'landlord_id' => $landlord->id,
            'actor_user_id' => null,
            'event' => 'subscription.default_assigned',
            'description' => 'Default free plan assigned automatically.',
            'metadata' => ['plan_slug' => $freePlan->slug],
        ]);

        return $subscription;
    }

    public function getCurrentSubscription(User $landlord): ?LandlordSubscription
    {
        $this->ensureDefaultFreeSubscription($landlord);

        $sourcePriority = [
            LandlordSubscription::SOURCE_ADMIN_GRANT,
            LandlordSubscription::SOURCE_SELF_CHECKOUT,
            LandlordSubscription::SOURCE_SYSTEM_DEFAULT,
        ];

        foreach ($sourcePriority as $source) {
            $subscription = $this->getEffectiveSubscriptionBySource($landlord->id, $source);

            if ($subscription) {
                return $subscription;
            }
        }

        return LandlordSubscription::query()
            ->with('plan')
            ->where('landlord_id', $landlord->id)
            ->orderByDesc('starts_at')
            ->first();
    }

    public function getUsageSummary(User $landlord): array
    {
        $currentSubscription = $this->getCurrentSubscription($landlord);
        $plan = $currentSubscription?->plan;

        $propertyIds = $landlord->properties()->pluck('id');
        $propertiesCount = $propertyIds->count();
        $roomsCount = $propertyIds->isEmpty()
            ? 0
            : Room::query()->whereIn('property_id', $propertyIds)->count();

        $maxProperties = $plan?->max_properties;
        $maxRoomsTotal = $plan?->max_rooms_total;

        $isInGrace = $currentSubscription?->status === LandlordSubscription::STATUS_GRACE;

        $propertyLimitReached = $maxProperties !== null && $propertiesCount >= (int) $maxProperties;
        $roomLimitReached = $maxRoomsTotal !== null && $roomsCount >= (int) $maxRoomsTotal;

        $blockedByPropertyLimit = $propertyLimitReached && ! $isInGrace;
        $blockedByRoomLimit = $roomLimitReached && ! $isInGrace;

        return [
            'properties_count' => $propertiesCount,
            'properties_limit' => $maxProperties,
            'properties_remaining' => $maxProperties === null
                ? null
                : max(((int) $maxProperties) - $propertiesCount, 0),
            'rooms_count' => $roomsCount,
            'rooms_limit' => $maxRoomsTotal,
            'rooms_remaining' => $maxRoomsTotal === null
                ? null
                : max(((int) $maxRoomsTotal) - $roomsCount, 0),
            'property_limit_reached' => $propertyLimitReached,
            'room_limit_reached' => $roomLimitReached,
            'is_in_grace' => $isInGrace,
            'can_create_property' => ! $blockedByPropertyLimit,
            'can_create_room' => ! $blockedByRoomLimit,
            'blocked_by_subscription' => $blockedByPropertyLimit || $blockedByRoomLimit,
        ];
    }

    public function getCurrentSubscriptionBundle(User $landlord): array
    {
        $subscription = $this->getCurrentSubscription($landlord);

        return [
            'subscription' => $subscription,
            'plan' => $subscription?->plan,
            'usage' => $this->getUsageSummary($landlord),
        ];
    }

    private function getEffectiveSubscriptionBySource(int $landlordId, string $source): ?LandlordSubscription
    {
        return LandlordSubscription::query()
            ->with('plan')
            ->where('landlord_id', $landlordId)
            ->where('source', $source)
            ->effectiveNow()
            ->orderByDesc('starts_at')
            ->first();
    }
}
