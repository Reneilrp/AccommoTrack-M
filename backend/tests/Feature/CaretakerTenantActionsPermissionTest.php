<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\CaretakerAssignment;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CaretakerTenantActionsPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_caretaker_with_tenant_permission_can_generate_claim_code_and_schedule_eviction(): void
    {
        $scenario = $this->createBaseScenario();

        $this->assignCaretaker(
            $scenario['landlord'],
            $scenario['caretaker'],
            [$scenario['property']->id],
            ['can_view_tenants' => true]
        );

        Sanctum::actingAs($scenario['caretaker']);

        $claimCodeResponse = $this->postJson('/api/landlord/tenants/'.$scenario['tenant']->id.'/claim-code');
        $claimCodeResponse
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.tenant.id', $scenario['tenant']->id);

        $scheduleResponse = $this->postJson('/api/landlord/tenants/'.$scenario['tenant']->id.'/evictions/schedule', [
            'reason' => 'Repeated lease violations',
            'grace_hours' => 24,
        ]);

        $scheduleResponse
            ->assertStatus(201)
            ->assertJsonPath('message', 'Eviction scheduled successfully.');

        $this->assertDatabaseHas('tenant_evictions', [
            'landlord_id' => $scenario['landlord']->id,
            'tenant_id' => $scenario['tenant']->id,
            'status' => 'scheduled',
            'reason' => 'Repeated lease violations',
        ]);
    }

    public function test_caretaker_with_tenant_permission_can_create_and_update_tenant(): void
    {
        $scenario = $this->createBaseScenario();

        $this->assignCaretaker(
            $scenario['landlord'],
            $scenario['caretaker'],
            [$scenario['property']->id],
            ['can_view_tenants' => true]
        );

        $extraRoom = Room::create([
            'property_id' => $scenario['property']->id,
            'room_number' => 'A-102',
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 10100,
            'daily_rate' => 390,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'available',
            'billing_policy' => 'monthly',
        ]);

        Sanctum::actingAs($scenario['caretaker']);

        $suffix = uniqid();
        $createResponse = $this->postJson('/api/landlord/tenants', [
            'first_name' => 'Created',
            'last_name' => 'ByCaretaker',
            'email' => "caretaker-created-{$suffix}@example.com",
            'password' => 'StrongPass1!',
            'phone' => '09171110000',
            'date_of_birth' => '2001-03-01',
            'room_id' => $extraRoom->id,
            'move_in_date' => now()->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
        ]);

        $createResponse
            ->assertStatus(201)
            ->assertJsonPath('role', 'tenant');

        $createdTenantId = (int) $createResponse->json('id');

        $updateResponse = $this->putJson('/api/landlord/tenants/'.$createdTenantId, [
            'first_name' => 'UpdatedByCaretaker',
            'phone' => '09172220000',
        ]);

        $updateResponse
            ->assertStatus(200)
            ->assertJsonPath('first_name', 'UpdatedByCaretaker')
            ->assertJsonPath('phone', '09172220000');
    }

    public function test_caretaker_with_tenant_permission_can_assign_and_unassign_room(): void
    {
        $scenario = $this->createBaseScenario();

        $this->assignCaretaker(
            $scenario['landlord'],
            $scenario['caretaker'],
            [$scenario['property']->id],
            ['can_view_tenants' => true]
        );

        $scenario['room']->assignTenant($scenario['tenant']->id);

        $availableRoom = Room::create([
            'property_id' => $scenario['property']->id,
            'room_number' => 'A-103',
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 10200,
            'daily_rate' => 395,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'available',
            'billing_policy' => 'monthly',
        ]);

        Sanctum::actingAs($scenario['caretaker']);

        $unassignResponse = $this->deleteJson('/api/landlord/tenants/'.$scenario['tenant']->id.'/unassign-room');

        $unassignResponse->assertStatus(200);

        $assignResponse = $this->postJson('/api/landlord/tenants/'.$scenario['tenant']->id.'/assign-room', [
            'room_id' => $availableRoom->id,
            'move_in_date' => now()->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
            'notes' => 'Caretaker room assignment smoke',
        ]);

        $assignResponse->assertStatus(200);
    }

    public function test_caretaker_with_tenant_permission_can_transfer_room(): void
    {
        $scenario = $this->createBaseScenario();

        $this->assignCaretaker(
            $scenario['landlord'],
            $scenario['caretaker'],
            [$scenario['property']->id],
            ['can_view_tenants' => true]
        );

        $scenario['room']->assignTenant($scenario['tenant']->id);

        $destinationRoom = Room::create([
            'property_id' => $scenario['property']->id,
            'room_number' => 'A-104',
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 10300,
            'daily_rate' => 405,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'available',
            'billing_policy' => 'monthly',
        ]);

        Sanctum::actingAs($scenario['caretaker']);

        $transferResponse = $this->postJson('/api/landlord/tenants/'.$scenario['tenant']->id.'/transfer-room', [
            'new_room_id' => $destinationRoom->id,
            'reason' => 'Smoke transfer initiated by caretaker',
            'transfer_reason' => 'Tenant Request',
        ]);

        $transferResponse
            ->assertStatus(200)
            ->assertJsonPath('message', 'Room transfer successful');
    }

    public function test_caretaker_without_tenant_permission_cannot_generate_claim_code(): void
    {
        $scenario = $this->createBaseScenario();

        $this->assignCaretaker(
            $scenario['landlord'],
            $scenario['caretaker'],
            [$scenario['property']->id],
            ['can_view_tenants' => false]
        );

        Sanctum::actingAs($scenario['caretaker']);

        $response = $this->postJson('/api/landlord/tenants/'.$scenario['tenant']->id.'/claim-code');

        $response->assertStatus(403);
        $this->assertStringContainsString(
            'Caretaker does not have permission',
            (string) $response->json('message')
        );
    }

    public function test_caretaker_without_tenant_permission_cannot_create_tenant(): void
    {
        $scenario = $this->createBaseScenario();

        $this->assignCaretaker(
            $scenario['landlord'],
            $scenario['caretaker'],
            [$scenario['property']->id],
            ['can_view_tenants' => false]
        );

        Sanctum::actingAs($scenario['caretaker']);

        $suffix = uniqid();
        $response = $this->postJson('/api/landlord/tenants', [
            'first_name' => 'Denied',
            'last_name' => 'CaretakerCreate',
            'email' => "caretaker-denied-create-{$suffix}@example.com",
            'password' => 'StrongPass1!',
            'room_id' => $scenario['room']->id,
        ]);

        $response->assertStatus(403);
        $this->assertStringContainsString(
            'Caretaker does not have permission',
            (string) $response->json('message')
        );
    }

    public function test_caretaker_cannot_schedule_eviction_for_unassigned_property_tenant(): void
    {
        $scenario = $this->createBaseScenario();

        $unassignedProperty = Property::create([
            'landlord_id' => $scenario['landlord']->id,
            'title' => 'Unassigned Property',
            'description' => 'Second property for caretaker scope checks',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '89 Scope Street',
            'city' => 'Scope City',
            'province' => 'Scope Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 1,
            'is_published' => true,
            'is_available' => true,
        ]);

        $unassignedRoom = Room::create([
            'property_id' => $unassignedProperty->id,
            'room_number' => 'B-201',
            'room_type' => 'single',
            'floor' => 2,
            'monthly_rate' => 10500,
            'daily_rate' => 400,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'available',
            'billing_policy' => 'monthly',
        ]);

        $unassignedTenant = User::create([
            'role' => 'tenant',
            'email' => 'scope-tenant-'.uniqid().'@example.com',
            'password' => Hash::make('password'),
            'first_name' => 'Scope',
            'last_name' => 'Tenant',
            'phone' => '09170009099',
            'date_of_birth' => '1999-02-02',
            'is_verified' => true,
            'is_active' => true,
        ]);

        Booking::create([
            'property_id' => $unassignedProperty->id,
            'room_id' => $unassignedRoom->id,
            'tenant_id' => $unassignedTenant->id,
            'landlord_id' => $scenario['landlord']->id,
            'booking_reference' => 'BK-SCOPE-'.uniqid(),
            'start_date' => now()->subDays(2)->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
            'total_months' => 6,
            'monthly_rent' => 10500,
            'total_amount' => 63000,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'payment_plan' => 'full',
        ]);

        $this->assignCaretaker(
            $scenario['landlord'],
            $scenario['caretaker'],
            [$scenario['property']->id],
            ['can_view_tenants' => true]
        );

        Sanctum::actingAs($scenario['caretaker']);

        $response = $this->postJson('/api/landlord/tenants/'.$unassignedTenant->id.'/evictions/schedule', [
            'reason' => 'Scope violation test',
            'grace_hours' => 24,
        ]);

        $response->assertStatus(403);
        $this->assertSame(
            'You do not have permission to manage this tenant.',
            (string) $response->json('message')
        );
    }

    public function test_caretaker_with_tenant_permission_can_cancel_scheduled_eviction(): void
    {
        $scenario = $this->createBaseScenario();

        $this->assignCaretaker(
            $scenario['landlord'],
            $scenario['caretaker'],
            [$scenario['property']->id],
            ['can_view_tenants' => true]
        );

        Sanctum::actingAs($scenario['caretaker']);

        $scheduleResponse = $this->postJson('/api/landlord/tenants/'.$scenario['tenant']->id.'/evictions/schedule', [
            'reason' => 'Temporary smoke schedule',
            'grace_hours' => 24,
        ]);

        $scheduleResponse->assertStatus(201);

        $cancelResponse = $this->postJson('/api/landlord/tenants/'.$scenario['tenant']->id.'/evictions/cancel', [
            'note' => 'Smoke cancellation by caretaker',
        ]);

        $cancelResponse
            ->assertStatus(200)
            ->assertJsonPath('message', 'Pending eviction schedule cancelled.');
    }

    public function test_caretaker_with_tenant_permission_can_finalize_and_undo_eviction(): void
    {
        $scenario = $this->createBaseScenario();

        $this->assignCaretaker(
            $scenario['landlord'],
            $scenario['caretaker'],
            [$scenario['property']->id],
            ['can_view_tenants' => true]
        );

        Sanctum::actingAs($scenario['caretaker']);

        $scheduleResponse = $this->postJson('/api/landlord/tenants/'.$scenario['tenant']->id.'/evictions/schedule', [
            'reason' => 'Finalize-and-undo smoke schedule',
            'grace_hours' => 0,
        ]);

        $scheduleResponse->assertStatus(201);

        $finalizeResponse = $this->postJson('/api/landlord/tenants/'.$scenario['tenant']->id.'/evictions/finalize', [
            'force' => true,
        ]);

        $finalizeResponse
            ->assertStatus(200)
            ->assertJsonPath('message', 'Tenant eviction finalized successfully.');

        $undoResponse = $this->postJson('/api/landlord/tenants/'.$scenario['tenant']->id.'/evictions/undo', [
            'reason' => 'Caretaker undo smoke',
        ]);

        $undoResponse
            ->assertStatus(200)
            ->assertJsonPath('message', 'Eviction has been undone and tenancy was restored.');
    }

    /**
     * @return array{landlord: User, caretaker: User, tenant: User, property: Property, room: Room}
     */
    private function createBaseScenario(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "tenant-action-landlord-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Tenant',
            'last_name' => 'Landlord',
            'phone' => '09170009001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $caretaker = User::create([
            'role' => 'caretaker',
            'email' => "tenant-action-caretaker-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Tenant',
            'last_name' => 'Caretaker',
            'phone' => '09170009002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-action-tenant-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Booked',
            'last_name' => 'Tenant',
            'phone' => '09170009003',
            'date_of_birth' => '2000-01-01',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Tenant Action Property',
            'description' => 'Property for caretaker tenant action tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '12 Tenant Action Street',
            'city' => 'Action City',
            'province' => 'Action Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 1,
            'is_published' => true,
            'is_available' => true,
        ]);

        $room = Room::create([
            'property_id' => $property->id,
            'room_number' => 'A-101',
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 9800,
            'daily_rate' => 380,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'available',
            'billing_policy' => 'monthly',
        ]);

        Booking::create([
            'property_id' => $property->id,
            'room_id' => $room->id,
            'tenant_id' => $tenant->id,
            'landlord_id' => $landlord->id,
            'booking_reference' => 'BK-BASE-'.uniqid(),
            'start_date' => now()->subDays(3)->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
            'total_months' => 6,
            'monthly_rent' => 9800,
            'total_amount' => 58800,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'payment_plan' => 'full',
        ]);

        return [
            'landlord' => $landlord,
            'caretaker' => $caretaker,
            'tenant' => $tenant,
            'property' => $property,
            'room' => $room,
        ];
    }

    private function assignCaretaker(User $landlord, User $caretaker, array $propertyIds, array $permissionOverrides = []): void
    {
        $permissions = array_merge([
            'can_view_bookings' => true,
            'can_view_messages' => true,
            'can_view_tenants' => true,
            'can_view_rooms' => true,
            'can_view_properties' => true,
            'can_manage_maintenance' => true,
            'can_manage_payments' => true,
            'can_view_analytics' => true,
        ], $permissionOverrides);

        $assignment = CaretakerAssignment::create([
            'landlord_id' => $landlord->id,
            'caretaker_id' => $caretaker->id,
            ...$permissions,
        ]);

        $assignment->properties()->sync($propertyIds);
    }
}
