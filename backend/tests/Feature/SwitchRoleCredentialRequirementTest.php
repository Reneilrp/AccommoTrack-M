<?php

namespace Tests\Feature;

use App\Models\LandlordVerification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SwitchRoleCredentialRequirementTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_to_landlord_requires_approved_verification_even_for_verified_users(): void
    {
        $tenant = User::create([
            'role' => 'tenant',
            'email' => 'tenant@example.com',
            'first_name' => 'Tenant',
            'middle_name' => null,
            'last_name' => 'Example',
            'password' => Hash::make('Password12!'),
            'date_of_birth' => now()->subYears(25)->toDateString(),
            'is_verified' => true,
            'is_active' => true,
        ]);

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/switch-role', [
            'role' => 'landlord',
        ]);

        $response
            ->assertStatus(403)
            ->assertJsonPath('message', 'Your landlord registration is not yet in an active state. Please wait for admin partial verification first.')
            ->assertJsonPath('status', 'not_submitted');

        $this->assertDatabaseHas('users', [
            'id' => $tenant->id,
            'role' => 'tenant',
        ]);
    }

    public function test_tenant_to_landlord_switch_succeeds_without_credentials_payload_when_approved(): void
    {
        $tenant = $this->createVerifiedTenantWithApprovedLandlordVerification();

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/switch-role', [
            'role' => 'landlord',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Role switched to landlord')
            ->assertJsonPath('user.role', 'landlord');

        $this->assertDatabaseHas('users', [
            'id' => $tenant->id,
            'role' => 'landlord',
        ]);
    }

    public function test_tenant_to_landlord_rejects_when_verification_is_pending(): void
    {
        $tenant = User::create([
            'role' => 'tenant',
            'email' => 'tenant-pending@example.com',
            'password' => Hash::make('Password12!'),
            'date_of_birth' => now()->subYears(25)->toDateString(),
            'is_verified' => true,
            'is_active' => true,
            'first_name' => 'Tenant',
            'middle_name' => null,
            'last_name' => 'Pending',
        ]);

        LandlordVerification::create([
            'user_id' => $tenant->id,
            'first_name' => $tenant->first_name,
            'middle_name' => $tenant->middle_name,
            'last_name' => $tenant->last_name,
            'valid_id_type' => 'Philippine Passport',
            'valid_id_other' => null,
            'valid_id_path' => 'landlord_ids/test-id-front.png',
            'permit_path' => 'landlord_permits/test-permit.pdf',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/switch-role', [
            'role' => 'landlord',
        ]);

        $response
            ->assertStatus(403)
            ->assertJsonPath('message', 'Your landlord registration is not yet in an active state. Please wait for admin partial verification first.')
            ->assertJsonPath('status', 'pending');

        $this->assertDatabaseHas('users', [
            'id' => $tenant->id,
            'role' => 'tenant',
        ]);
    }

    public function test_tenant_to_landlord_succeeds_with_approved_verification(): void
    {
        $tenant = $this->createVerifiedTenantWithApprovedLandlordVerification();

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/switch-role', [
            'role' => 'landlord',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Role switched to landlord')
            ->assertJsonPath('user.role', 'landlord');

        $this->assertDatabaseHas('users', [
            'id' => $tenant->id,
            'role' => 'landlord',
        ]);
    }

    public function test_landlord_to_tenant_switch_succeeds(): void
    {
        $landlord = User::create([
            'role' => 'landlord',
            'email' => 'landlord-switch@example.com',
            'password' => Hash::make('Password12!'),
            'date_of_birth' => now()->subYears(30)->toDateString(),
            'is_verified' => true,
            'is_active' => true,
            'first_name' => 'Landlord',
            'middle_name' => null,
            'last_name' => 'Switcher',
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->postJson('/api/switch-role', [
            'role' => 'tenant',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Role switched to tenant')
            ->assertJsonPath('user.role', 'tenant');

        $this->assertDatabaseHas('users', [
            'id' => $landlord->id,
            'role' => 'tenant',
        ]);
    }

    private function createVerifiedTenantWithApprovedLandlordVerification(): User
    {
        $tenant = User::create([
            'role' => 'tenant',
            'email' => 'tenant-switch@example.com',
            'password' => Hash::make('Password12!'),
            'date_of_birth' => now()->subYears(25)->toDateString(),
            'is_verified' => true,
            'is_active' => true,
            'first_name' => 'Tenant',
            'middle_name' => null,
            'last_name' => 'Switcher',
        ]);

        LandlordVerification::create([
            'user_id' => $tenant->id,
            'first_name' => $tenant->first_name,
            'middle_name' => $tenant->middle_name,
            'last_name' => $tenant->last_name,
            'valid_id_type' => 'Philippine Passport',
            'valid_id_other' => null,
            'valid_id_path' => 'landlord_ids/test-id.pdf',
            'permit_path' => 'landlord_permits/test-permit.pdf',
            'status' => 'approved',
        ]);

        return $tenant;
    }
}
