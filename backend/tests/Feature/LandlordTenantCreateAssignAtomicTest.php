<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureUserIsLandlord;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LandlordTenantCreateAssignAtomicTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(EnsureUserIsLandlord::class);
    }

    public function test_landlord_can_create_and_assign_tenant_in_single_request(): void
    {
        $landlord = $this->createLandlord();
        $property = $this->createProperty($landlord->id);
        $room = $this->createRoom($property->id, '301', 'available');
        $tenantEmail = 'tenant-atomic-'.uniqid().'@example.com';

        Sanctum::actingAs($landlord);

        $response = $this->postJson('/api/landlord/tenants', [
            'first_name' => 'Atomic',
            'last_name' => 'Tenant',
            'email' => $tenantEmail,
            'password' => 'password123',
            'phone' => '09170009991',
            'room_id' => $room->id,
            'move_in_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
            'notes' => 'Created and assigned in one request',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('email', $tenantEmail)
            ->assertJsonPath('room.id', $room->id);

        $tenantId = (int) $response->json('id');

        $this->assertDatabaseHas('users', [
            'id' => $tenantId,
            'email' => $tenantEmail,
            'role' => 'tenant',
        ]);

        $this->assertDatabaseHas('bookings', [
            'tenant_id' => $tenantId,
            'room_id' => $room->id,
            'status' => 'confirmed',
        ]);
    }

    public function test_failed_assignment_rolls_back_new_tenant_creation(): void
    {
        $landlord = $this->createLandlord();
        $property = $this->createProperty($landlord->id);
        $room = $this->createRoom($property->id, '302', 'available');
        $tenantEmail = 'tenant-rollback-'.uniqid().'@example.com';
        $moveInDate = now()->addDay()->toDateString();

        Sanctum::actingAs($landlord);

        $response = $this->postJson('/api/landlord/tenants', [
            'first_name' => 'Rollback',
            'last_name' => 'Tenant',
            'email' => $tenantEmail,
            'password' => 'password123',
            'room_id' => $room->id,
            'move_in_date' => $moveInDate,
            'end_date' => $moveInDate,
        ]);

        $response->assertStatus(422);

        $this->assertDatabaseMissing('users', [
            'email' => $tenantEmail,
            'role' => 'tenant',
        ]);
    }

    private function createLandlord(): User
    {
        $suffix = uniqid();

        return User::create([
            'role' => 'landlord',
            'email' => "landlord-tenant-atomic-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170009990',
            'is_verified' => true,
            'is_active' => true,
        ]);
    }

    private function createProperty(int $landlordId): Property
    {
        return Property::create([
            'landlord_id' => $landlordId,
            'title' => 'Atomic Tenant Property',
            'description' => 'Property for tenant atomic creation tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Atomic Street',
            'city' => 'Test City',
            'province' => 'Test Province',
            'country' => 'Philippines',
            'total_rooms' => 2,
            'available_rooms' => 2,
            'is_published' => true,
            'is_available' => true,
        ]);
    }

    private function createRoom(int $propertyId, string $roomNumber, string $status): Room
    {
        return Room::create([
            'property_id' => $propertyId,
            'room_number' => $roomNumber,
            'room_type' => 'single',
            'sex_restriction' => 'mixed',
            'floor' => 1,
            'monthly_rate' => 8500,
            'daily_rate' => 450,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => $status,
            'billing_policy' => 'monthly',
        ]);
    }
}
