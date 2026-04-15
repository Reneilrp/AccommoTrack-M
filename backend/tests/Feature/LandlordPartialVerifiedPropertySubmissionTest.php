<?php

namespace Tests\Feature;

use App\Models\LandlordVerification;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LandlordPartialVerifiedPropertySubmissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_fully_verified_landlord_without_verification_row_can_create_property_with_pending_status(): void
    {
        $landlord = $this->createFullyVerifiedLandlordWithoutVerification();

        Sanctum::actingAs($landlord);

        $response = $this->postJson('/api/landlord/properties', [
            'title' => 'Verified Legacy Property',
            'description' => 'Created by fully verified landlord without verification row.',
            'property_type' => 'dormitory',
            'sex_restriction' => 'mixed',
            'current_status' => Property::STATUS_PENDING,
            'street_address' => '123 Verified Street',
            'city' => 'Zamboanga City',
            'province' => 'Zamboanga Del Sur',
        ]);

        $response
            ->assertStatus(200)
            ->assertJsonPath('current_status', Property::STATUS_PENDING);

        $this->assertDatabaseHas('properties', [
            'landlord_id' => $landlord->id,
            'title' => 'Verified Legacy Property',
            'current_status' => Property::STATUS_PENDING,
        ]);
    }

    public function test_my_verification_returns_approved_for_fully_verified_landlord_without_verification_row(): void
    {
        $landlord = $this->createFullyVerifiedLandlordWithoutVerification();

        Sanctum::actingAs($landlord);

        $this->getJson('/api/landlord/my-verification')
            ->assertStatus(200)
            ->assertJsonPath('status', LandlordVerification::STATUS_APPROVED)
            ->assertJsonPath('user.is_verified', true);
    }

    public function test_partial_verified_landlord_can_create_property_with_pending_status(): void
    {
        $landlord = $this->createLandlordWithVerificationStatus(LandlordVerification::STATUS_PARTIAL_VERIFIED);

        Sanctum::actingAs($landlord);

        $response = $this->postJson('/api/landlord/properties', [
            'title' => 'Partial Verified Property',
            'description' => 'Created while partial verified.',
            'property_type' => 'dormitory',
            'sex_restriction' => 'mixed',
            'current_status' => Property::STATUS_PENDING,
            'street_address' => '123 Partial Street',
            'city' => 'Zamboanga City',
            'province' => 'Zamboanga Del Sur',
        ]);

        $response
            ->assertStatus(200)
            ->assertJsonPath('current_status', Property::STATUS_PENDING);

        $this->assertDatabaseHas('properties', [
            'landlord_id' => $landlord->id,
            'title' => 'Partial Verified Property',
            'current_status' => Property::STATUS_PENDING,
        ]);
    }

    public function test_partial_verified_landlord_can_submit_draft_to_pending(): void
    {
        $landlord = $this->createLandlordWithVerificationStatus(LandlordVerification::STATUS_PARTIAL_VERIFIED);
        $property = $this->createLandlordProperty($landlord, [
            'current_status' => Property::STATUS_DRAFT,
            'is_published' => false,
            'is_available' => false,
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->putJson("/api/landlord/properties/{$property->id}", [
            'current_status' => Property::STATUS_PENDING,
            'is_draft' => false,
        ]);

        $response
            ->assertStatus(200)
            ->assertJsonPath('current_status', Property::STATUS_PENDING);

        $property->refresh();

        $this->assertSame(Property::STATUS_PENDING, $property->current_status);
    }

    public function test_pending_documents_review_landlord_can_login(): void
    {
        $landlord = $this->createLandlordWithVerificationStatus(LandlordVerification::STATUS_PENDING_DOCUMENTS_REVIEW);

        $this->postJson('/api/login', [
            'email' => $landlord->email,
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('user.id', $landlord->id)
            ->assertJsonPath('verification_status', LandlordVerification::STATUS_PENDING_DOCUMENTS_REVIEW);
    }

    public function test_pending_landlord_cannot_login(): void
    {
        $landlord = $this->createLandlordWithVerificationStatus(LandlordVerification::STATUS_PENDING);

        $this->postJson('/api/login', [
            'email' => $landlord->email,
            'password' => 'password',
        ])
            ->assertStatus(403)
            ->assertJsonPath('status', 'pending_verification');
    }

    public function test_pending_landlord_is_still_blocked_from_property_submission_routes(): void
    {
        $landlord = $this->createLandlordWithVerificationStatus(LandlordVerification::STATUS_PENDING);
        $property = $this->createLandlordProperty($landlord, [
            'current_status' => Property::STATUS_DRAFT,
            'is_published' => false,
            'is_available' => false,
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->putJson("/api/landlord/properties/{$property->id}", [
            'current_status' => Property::STATUS_PENDING,
            'is_draft' => false,
        ]);

        $response
            ->assertStatus(403)
            ->assertJsonPath('status', LandlordVerification::STATUS_PENDING);

        $property->refresh();

        $this->assertSame(Property::STATUS_DRAFT, $property->current_status);
    }

    public function test_partial_verified_landlord_can_publish_active_property(): void
    {
        $landlord = $this->createLandlordWithVerificationStatus(LandlordVerification::STATUS_PARTIAL_VERIFIED);
        $property = $this->createLandlordProperty($landlord, [
            'current_status' => Property::STATUS_ACTIVE,
            'is_published' => false,
            'is_available' => true,
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->putJson("/api/landlord/properties/{$property->id}", [
            'is_published' => true,
        ]);

        $response
            ->assertStatus(200)
            ->assertJsonPath('current_status', Property::STATUS_ACTIVE)
            ->assertJsonPath('is_published', true);

        $property->refresh();

        $this->assertTrue((bool) $property->is_published);
    }

    private function createLandlordWithVerificationStatus(string $status): User
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "partial-verified-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Partial',
            'last_name' => 'Verifier',
            'phone' => '09171111001',
            'is_verified' => false,
            'is_active' => true,
        ]);

        LandlordVerification::create([
            'user_id' => $landlord->id,
            'first_name' => $landlord->first_name,
            'middle_name' => $landlord->middle_name,
            'last_name' => $landlord->last_name,
            'valid_id_type' => 'Philippine Passport',
            'valid_id_other' => null,
            'valid_id_path' => 'landlord_ids/sample-id.jpg',
            'permit_path' => 'landlord_permits/sample-permit.pdf',
            'status' => $status,
        ]);

        return $landlord;
    }

    private function createLandlordProperty(User $landlord, array $overrides = []): Property
    {
        return Property::create(array_merge([
            'landlord_id' => $landlord->id,
            'title' => 'Draft Property',
            'description' => 'Draft property for submission tests',
            'property_type' => 'dormitory',
            'sex_restriction' => 'mixed',
            'current_status' => Property::STATUS_DRAFT,
            'street_address' => 'Draft Street',
            'city' => 'Zamboanga City',
            'province' => 'Zamboanga Del Sur',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 1,
            'is_published' => false,
            'is_available' => false,
            'allow_partial_payments' => true,
            'require_1month_advance' => false,
        ], $overrides));
    }

    private function createFullyVerifiedLandlordWithoutVerification(): User
    {
        $suffix = uniqid();

        return User::create([
            'role' => 'landlord',
            'email' => "verified-legacy-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Verified',
            'last_name' => 'Legacy',
            'phone' => '09171111999',
            'is_verified' => true,
            'is_active' => true,
        ]);
    }
}
