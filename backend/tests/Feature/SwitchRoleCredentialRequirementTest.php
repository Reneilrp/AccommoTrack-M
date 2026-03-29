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
            'email' => 'tenant@example.com',
            'password' => 'Password12!',
            'password_confirmation' => 'Password12!',
            'agree' => true,
        ]);

        $response
            ->assertStatus(403)
            ->assertJsonPath('message', 'Your landlord verification is not yet approved. Please complete verification first.')
            ->assertJsonPath('status', 'not_submitted');

        $this->assertDatabaseHas('users', [
            'id' => $tenant->id,
            'role' => 'tenant',
        ]);
    }

    public function test_tenant_to_landlord_requires_credentials_payload(): void
    {
        $tenant = $this->createVerifiedTenantWithApprovedLandlordVerification();

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/switch-role', [
            'role' => 'landlord',
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password', 'password_confirmation', 'agree']);

        $this->assertDatabaseHas('users', [
            'id' => $tenant->id,
            'role' => 'tenant',
        ]);
    }

    public function test_tenant_to_landlord_rejects_non_matching_email_or_invalid_password(): void
    {
        $tenant = $this->createVerifiedTenantWithApprovedLandlordVerification();

        Sanctum::actingAs($tenant);

        $wrongEmailResponse = $this->postJson('/api/switch-role', [
            'role' => 'landlord',
            'email' => 'other@example.com',
            'password' => 'Password12!',
            'password_confirmation' => 'Password12!',
            'agree' => true,
        ]);

        $wrongEmailResponse
            ->assertStatus(422)
            ->assertJsonPath('message', 'The provided email does not match your current account.');

        $wrongPasswordResponse = $this->postJson('/api/switch-role', [
            'role' => 'landlord',
            'email' => 'tenant-switch@example.com',
            'password' => 'WrongPassword12!',
            'password_confirmation' => 'WrongPassword12!',
            'agree' => true,
        ]);

        $wrongPasswordResponse
            ->assertStatus(422)
            ->assertJsonPath('message', 'Invalid password. Please try again.');

        $this->assertDatabaseHas('users', [
            'id' => $tenant->id,
            'role' => 'tenant',
        ]);
    }

    public function test_tenant_to_landlord_succeeds_with_approved_verification_and_matching_credentials(): void
    {
        $tenant = $this->createVerifiedTenantWithApprovedLandlordVerification();

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/switch-role', [
            'role' => 'landlord',
            'email' => 'tenant-switch@example.com',
            'password' => 'Password12!',
            'password_confirmation' => 'Password12!',
            'agree' => true,
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
