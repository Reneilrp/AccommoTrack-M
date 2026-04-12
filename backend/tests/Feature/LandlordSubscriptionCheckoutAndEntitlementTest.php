<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\LandlordSubscription;
use App\Models\Property;
use App\Models\Room;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LandlordSubscriptionCheckoutAndEntitlementTest extends TestCase
{
    use RefreshDatabase;

    public function test_landlord_checkout_creates_pending_invoice_for_paid_plan(): void
    {
        $landlord = $this->createLandlord('checkout-paid');
        $basicPlan = $this->createPlan('basic', 'Basic', 49900, 499000, 3, 40);

        Sanctum::actingAs($landlord);

        $response = $this->postJson('/api/landlord/subscriptions/checkout', [
            'plan_id' => $basicPlan->id,
            'billing_cycle' => 'monthly',
            'auto_renew' => true,
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_required', true)
            ->assertJsonPath('data.subscription.source', 'self_checkout')
            ->assertJsonPath('data.subscription.status', 'scheduled')
            ->assertJsonPath('data.plan.slug', 'basic');

        $subscriptionId = (int) $response->json('data.subscription.id');
        $invoiceId = (int) $response->json('data.invoice.id');

        $this->assertDatabaseHas('landlord_subscriptions', [
            'id' => $subscriptionId,
            'landlord_id' => $landlord->id,
            'plan_id' => $basicPlan->id,
            'source' => 'self_checkout',
            'status' => 'scheduled',
        ]);

        $this->assertDatabaseHas('invoices', [
            'id' => $invoiceId,
            'landlord_id' => $landlord->id,
            'invoice_type' => 'subscription',
            'status' => 'pending',
            'amount_cents' => 49900,
        ]);
    }

    public function test_landlord_can_sync_checkout_after_invoice_is_paid(): void
    {
        $landlord = $this->createLandlord('checkout-sync');
        $standardPlan = $this->createPlan('standard', 'Standard', 99900, 999000, 10, 120);

        Sanctum::actingAs($landlord);

        $checkoutResponse = $this->postJson('/api/landlord/subscriptions/checkout', [
            'plan_id' => $standardPlan->id,
            'billing_cycle' => 'monthly',
        ]);

        $checkoutResponse->assertStatus(201);

        $subscriptionId = (int) $checkoutResponse->json('data.subscription.id');
        $invoiceId = (int) $checkoutResponse->json('data.invoice.id');

        $invoice = Invoice::query()->findOrFail($invoiceId);
        $invoice->status = 'paid';
        $invoice->paid_at = now();
        $invoice->save();

        $syncResponse = $this->postJson("/api/landlord/subscriptions/checkout/{$subscriptionId}/sync");

        $syncResponse
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_required', false)
            ->assertJsonPath('data.subscription.status', 'active')
            ->assertJsonPath('data.activated', true);

        $this->assertDatabaseHas('landlord_subscriptions', [
            'id' => $subscriptionId,
            'status' => 'active',
        ]);
    }

    public function test_landlord_cannot_create_property_when_plan_property_limit_is_reached(): void
    {
        $landlord = $this->createLandlord('property-limit');
        $freePlan = $this->createPlan('free', 'Free', 0, 0, 1, 10);

        LandlordSubscription::create([
            'landlord_id' => $landlord->id,
            'plan_id' => $freePlan->id,
            'source' => LandlordSubscription::SOURCE_SYSTEM_DEFAULT,
            'status' => LandlordSubscription::STATUS_ACTIVE,
            'starts_at' => now()->subDay(),
            'ends_at' => null,
            'auto_renew' => false,
        ]);

        $this->createProperty($landlord, 'Existing Free Property');

        Sanctum::actingAs($landlord);

        $response = $this->postJson('/api/landlord/properties', [
            'title' => 'Blocked Property',
            'description' => 'Should be blocked by plan limits.',
            'property_type' => 'dormitory',
            'gender_restriction' => 'mixed',
            'current_status' => 'pending',
            'street_address' => '456 Limit Street',
            'city' => 'Zamboanga City',
            'province' => 'Zamboanga Del Sur',
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('message', 'Validation failed');

        $this->assertNotEmpty($response->json('errors.subscription') ?? []);

        $this->assertDatabaseMissing('properties', [
            'landlord_id' => $landlord->id,
            'title' => 'Blocked Property',
        ]);
    }

    public function test_landlord_cannot_create_room_when_plan_room_limit_is_reached(): void
    {
        $landlord = $this->createLandlord('room-limit');
        $starterPlan = $this->createPlan('starter', 'Starter', 19900, 199000, 3, 1);

        LandlordSubscription::create([
            'landlord_id' => $landlord->id,
            'plan_id' => $starterPlan->id,
            'source' => LandlordSubscription::SOURCE_SELF_CHECKOUT,
            'status' => LandlordSubscription::STATUS_ACTIVE,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addMonth(),
            'auto_renew' => true,
        ]);

        $property = $this->createProperty($landlord, 'Room Limit Property');
        $this->createRoom($property, '101');

        Sanctum::actingAs($landlord);

        $response = $this->postJson('/api/landlord/rooms', [
            'property_id' => $property->id,
            'room_number' => '102',
            'room_type' => 'single',
            'gender_restriction' => 'male',
            'floor' => 1,
            'billing_policy' => 'monthly',
            'monthly_rate' => 3500,
            'capacity' => 1,
            'pricing_model' => 'full_room',
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('message', 'Validation failed');

        $this->assertNotEmpty($response->json('errors.subscription') ?? []);
    }

    private function createLandlord(string $key): User
    {
        return User::create([
            'role' => 'landlord',
            'email' => $key.'@example.com',
            'password' => Hash::make('password'),
            'first_name' => 'Plan',
            'last_name' => 'Landlord',
            'phone' => '0917'.str_pad((string) random_int(1000000, 9999999), 7, '0', STR_PAD_LEFT),
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

    private function createProperty(User $landlord, string $title): Property
    {
        return Property::create([
            'landlord_id' => $landlord->id,
            'title' => $title,
            'description' => 'Test property',
            'property_type' => 'dormitory',
            'gender_restriction' => 'mixed',
            'current_status' => 'active',
            'street_address' => 'Test Street',
            'city' => 'Zamboanga City',
            'province' => 'Zamboanga Del Sur',
            'total_floors' => 1,
            'total_rooms' => 0,
            'available_rooms' => 0,
            'is_published' => true,
            'is_available' => true,
            'allow_partial_payments' => true,
            'require_1month_advance' => false,
        ]);
    }

    private function createRoom(Property $property, string $roomNumber): Room
    {
        return Room::create([
            'property_id' => $property->id,
            'room_number' => $roomNumber,
            'room_type' => 'single',
            'gender_restriction' => 'mixed',
            'floor' => 1,
            'billing_policy' => 'monthly',
            'monthly_rate' => 3000,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'available',
        ]);
    }
}