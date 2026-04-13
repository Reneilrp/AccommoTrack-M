<?php

namespace Tests\Feature;

use App\Models\LandlordSubscription;
use App\Models\LandlordVerification;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubscriptionGrantFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_grant_plan_with_duration_months(): void
    {
        $admin = $this->createUser('admin', 'admin-duration');
        $landlord = $this->createVerifiedLandlord('landlord-duration');
        $basicPlan = $this->createPlan('basic', 'Basic', 49900, 499000, 3, 40);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/admin/subscriptions/grants', [
            'landlord_id' => $landlord->id,
            'plan_id' => $basicPlan->id,
            'duration_months' => 3,
            'notes' => 'Promo grant for launch.',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.grant.status', 'active')
            ->assertJsonPath('data.grant.duration_months', 3)
            ->assertJsonPath('data.subscription.source', 'admin_grant')
            ->assertJsonPath('data.subscription.status', 'active')
            ->assertJsonPath('data.subscription.plan.slug', 'basic');

        $this->assertDatabaseHas('subscription_grants', [
            'landlord_id' => $landlord->id,
            'plan_id' => $basicPlan->id,
            'status' => 'active',
            'duration_months' => 3,
        ]);

        $this->assertDatabaseHas('landlord_subscriptions', [
            'landlord_id' => $landlord->id,
            'plan_id' => $basicPlan->id,
            'source' => 'admin_grant',
            'status' => 'active',
            'created_by_admin_id' => $admin->id,
        ]);
    }

    public function test_admin_can_grant_plan_with_explicit_end_date_and_future_start(): void
    {
        $admin = $this->createUser('admin', 'admin-explicit-end');
        $landlord = $this->createVerifiedLandlord('landlord-explicit-end');
        $premiumPlan = $this->createPlan('premium', 'Premium', 399900, 3999000, 30, 800);

        $startsAt = now()->addDays(2)->toISOString();
        $endsAt = now()->addMonths(4)->toISOString();

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/admin/subscriptions/grants', [
            'landlord_id' => $landlord->id,
            'plan_id' => $premiumPlan->id,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'notes' => 'Scheduled premium trial.',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.grant.status', 'scheduled')
            ->assertJsonPath('data.subscription.status', 'scheduled')
            ->assertJsonPath('data.subscription.plan.slug', 'premium');

        $this->assertDatabaseHas('subscription_grants', [
            'landlord_id' => $landlord->id,
            'plan_id' => $premiumPlan->id,
            'status' => 'scheduled',
        ]);
    }

    public function test_landlord_current_subscription_prioritizes_admin_grant(): void
    {
        $landlord = $this->createVerifiedLandlord('landlord-priority');
        $freePlan = $this->createPlan('free', 'Free', 0, 0, 1, 10);
        $standardPlan = $this->createPlan('standard', 'Standard', 149900, 1499000, 10, 200);

        LandlordSubscription::create([
            'landlord_id' => $landlord->id,
            'plan_id' => $freePlan->id,
            'source' => LandlordSubscription::SOURCE_SYSTEM_DEFAULT,
            'status' => LandlordSubscription::STATUS_ACTIVE,
            'starts_at' => now()->subDay(),
            'ends_at' => null,
            'auto_renew' => false,
        ]);

        LandlordSubscription::create([
            'landlord_id' => $landlord->id,
            'plan_id' => $standardPlan->id,
            'source' => LandlordSubscription::SOURCE_ADMIN_GRANT,
            'status' => LandlordSubscription::STATUS_ACTIVE,
            'starts_at' => now()->subHours(3),
            'ends_at' => now()->addMonths(2),
            'auto_renew' => false,
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->getJson('/api/landlord/subscriptions/current');

        $response
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.plan.slug', 'standard')
            ->assertJsonPath('data.subscription.source', 'admin_grant')
            ->assertJsonPath('data.subscription.status', 'active');
    }

    private function createVerifiedLandlord(string $key): User
    {
        $landlord = $this->createUser('landlord', $key);

        LandlordVerification::create([
            'user_id' => $landlord->id,
            'first_name' => $landlord->first_name,
            'middle_name' => null,
            'last_name' => $landlord->last_name,
            'valid_id_type' => 'passport',
            'valid_id_other' => null,
            'valid_id_path' => 'landlord_ids/test-'.$key.'.jpg',
            'permit_path' => 'landlord_permits/test-'.$key.'.jpg',
            'status' => LandlordVerification::STATUS_APPROVED,
        ]);

        return $landlord;
    }

    private function createUser(string $role, string $key): User
    {
        return User::create([
            'role' => $role,
            'email' => $key.'@example.com',
            'password' => Hash::make('password'),
            'first_name' => ucfirst($role),
            'last_name' => 'User',
            'phone' => '09170000000',
            'is_verified' => true,
            'is_active' => true,
        ]);
    }

    private function createPlan(
        string $slug,
        string $name,
        int $monthlyPriceCents,
        int $annualPriceCents,
        int $maxProperties,
        int $maxRoomsTotal,
    ): SubscriptionPlan {
        return SubscriptionPlan::create([
            'name' => $name,
            'slug' => $slug,
            'monthly_price_cents' => $monthlyPriceCents,
            'annual_price_cents' => $annualPriceCents,
            'currency' => 'PHP',
            'max_properties' => $maxProperties,
            'max_rooms_total' => $maxRoomsTotal,
            'features' => ['test_feature'],
            'is_active' => true,
            'sort_order' => 1,
        ]);
    }
}
