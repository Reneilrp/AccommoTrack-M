<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MinimumStayEnforcementTest extends TestCase
{
    use RefreshDatabase;

    protected User $landlord;

    protected User $tenant;

    protected Property $property;

    protected Room $room;

    protected function setUp(): void
    {
        parent::setUp();

        // Create landlord
        $this->landlord = User::factory()->create([
            'role' => 'landlord',
            'email' => 'landlord@test.com',
        ]);

        // Create tenant
        $this->tenant = User::factory()->create([
            'role' => 'tenant',
            'email' => 'tenant@test.com',
        ]);

        // Create property
        $this->property = Property::factory()->create([
            'landlord_id' => $this->landlord->id,
            'property_type' => 'Dormitory',
        ]);
    }

    /** @test */
    public function it_enforces_minimum_stay_for_daily_bookings()
    {
        // Create room with 7-day minimum stay
        $this->room = Room::factory()->create([
            'property_id' => $this->property->id,
            'room_number' => '101',
            'monthly_rate' => 5000,
            'daily_rate' => 200,
            'billing_policy' => 'daily',
            'min_stay_days' => 7,
            'capacity' => 1,
        ]);

        $this->actingAs($this->tenant, 'sanctum');

        // Try to book for only 3 days (should fail)
        $response = $this->postJson('/api/landlord/bookings', [
            'room_id' => $this->room->id,
            'start_date' => now()->addDays(1)->format('Y-m-d'),
            'end_date' => now()->addDays(4)->format('Y-m-d'), // 3 days
            'contract_mode' => 'daily',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('end_date');
        $this->assertStringContainsString('minimum stay of 7 days', $response->json('errors.end_date.0'));
    }

    /** @test */
    public function it_allows_booking_that_meets_minimum_stay()
    {
        // Create room with 7-day minimum stay
        $this->room = Room::factory()->create([
            'property_id' => $this->property->id,
            'room_number' => '101',
            'monthly_rate' => 5000,
            'daily_rate' => 200,
            'billing_policy' => 'daily',
            'min_stay_days' => 7,
            'capacity' => 1,
        ]);

        $this->actingAs($this->tenant, 'sanctum');

        // Book for 7 days (should succeed)
        $response = $this->postJson('/api/landlord/bookings', [
            'room_id' => $this->room->id,
            'start_date' => now()->addDays(1)->format('Y-m-d'),
            'end_date' => now()->addDays(8)->format('Y-m-d'), // 7 days
            'contract_mode' => 'daily',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('bookings', [
            'room_id' => $this->room->id,
            'tenant_id' => $this->tenant->id,
        ]);
    }

    /** @test */
    public function it_enforces_30_day_minimum_for_monthly_contracts()
    {
        // Create room with 15-day minimum (but monthly should enforce 30)
        $this->room = Room::factory()->create([
            'property_id' => $this->property->id,
            'room_number' => '101',
            'monthly_rate' => 5000,
            'billing_policy' => 'monthly',
            'min_stay_days' => 15,
            'capacity' => 1,
        ]);

        $this->actingAs($this->tenant, 'sanctum');

        // Try to book for 20 days (should fail - monthly requires 30)
        $response = $this->postJson('/api/landlord/bookings', [
            'room_id' => $this->room->id,
            'start_date' => now()->addDays(1)->format('Y-m-d'),
            'end_date' => now()->addDays(21)->format('Y-m-d'), // 20 days
            'contract_mode' => 'monthly',
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('30', $response->json('message'));
    }

    /** @test */
    public function it_allows_open_ended_monthly_bookings_without_minimum_stay()
    {
        // Create room with 30-day minimum
        $this->room = Room::factory()->create([
            'property_id' => $this->property->id,
            'room_number' => '101',
            'monthly_rate' => 5000,
            'billing_policy' => 'monthly',
            'min_stay_days' => 30,
            'capacity' => 1,
        ]);

        $this->actingAs($this->tenant, 'sanctum');

        // Book without end_date (open-ended, should succeed)
        $response = $this->postJson('/api/landlord/bookings', [
            'room_id' => $this->room->id,
            'start_date' => now()->addDays(1)->format('Y-m-d'),
            // No end_date
            'contract_mode' => 'monthly',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('bookings', [
            'room_id' => $this->room->id,
            'tenant_id' => $this->tenant->id,
            'end_date' => null,
        ]);
    }

    /** @test */
    public function it_enforces_custom_minimum_stay_greater_than_30_days()
    {
        // Create room with 60-day minimum
        $this->room = Room::factory()->create([
            'property_id' => $this->property->id,
            'room_number' => '101',
            'monthly_rate' => 5000,
            'billing_policy' => 'monthly',
            'min_stay_days' => 60,
            'capacity' => 1,
        ]);

        $this->actingAs($this->tenant, 'sanctum');

        // Try to book for 45 days (should fail - requires 60)
        $response = $this->postJson('/api/landlord/bookings', [
            'room_id' => $this->room->id,
            'start_date' => now()->addDays(1)->format('Y-m-d'),
            'end_date' => now()->addDays(46)->format('Y-m-d'), // 45 days
            'contract_mode' => 'monthly',
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('60', $response->json('message'));
    }

    /** @test */
    public function it_defaults_to_1_day_minimum_when_not_set()
    {
        // Create room without min_stay_days set
        $this->room = Room::factory()->create([
            'property_id' => $this->property->id,
            'room_number' => '101',
            'monthly_rate' => 5000,
            'daily_rate' => 200,
            'billing_policy' => 'daily',
            'min_stay_days' => null, // Not set
            'capacity' => 1,
        ]);

        $this->actingAs($this->tenant, 'sanctum');

        // Book for 1 day (should succeed with default minimum)
        $response = $this->postJson('/api/landlord/bookings', [
            'room_id' => $this->room->id,
            'start_date' => now()->addDays(1)->format('Y-m-d'),
            'end_date' => now()->addDays(2)->format('Y-m-d'), // 1 day
            'contract_mode' => 'daily',
        ]);

        $response->assertStatus(201);
    }
}
