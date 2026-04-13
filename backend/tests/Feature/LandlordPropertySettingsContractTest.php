<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureUserIsLandlord;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LandlordPropertySettingsContractTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(EnsureUserIsLandlord::class);
    }

    public function test_property_show_returns_allow_partial_payments_boolean(): void
    {
        [$landlord, $property] = $this->createLandlordProperty([
            'allow_partial_payments' => false,
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->getJson("/api/landlord/properties/{$property->id}");

        $response
            ->assertStatus(200)
            ->assertJsonPath('allow_partial_payments', false);
    }

    public function test_landlord_can_update_partial_payments_and_public_visibility_flags(): void
    {
        [$landlord, $property] = $this->createLandlordProperty([
            'current_status' => Property::STATUS_ACTIVE,
            'is_published' => true,
            'is_available' => true,
            'allow_partial_payments' => true,
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->putJson("/api/landlord/properties/{$property->id}", [
            'allow_partial_payments' => false,
            'is_published' => false,
        ]);

        $response
            ->assertStatus(200)
            ->assertJsonPath('allow_partial_payments', false)
            ->assertJsonPath('is_published', false);

        $property->refresh();

        $this->assertFalse((bool) $property->allow_partial_payments);
        $this->assertFalse((bool) $property->is_published);
        $this->assertSame(Property::STATUS_ACTIVE, $property->current_status);
    }

    public function test_inactive_property_cannot_be_published_directly(): void
    {
        [$landlord, $property] = $this->createLandlordProperty([
            'current_status' => Property::STATUS_INACTIVE,
            'is_published' => false,
            'is_available' => false,
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->putJson("/api/landlord/properties/{$property->id}", [
            'is_published' => true,
        ]);

        $response
            ->assertStatus(200)
            ->assertJsonPath('current_status', Property::STATUS_INACTIVE)
            ->assertJsonPath('is_published', false);

        $property->refresh();

        $this->assertFalse((bool) $property->is_published);
    }

    /**
     * @return array{User, Property}
     */
    private function createLandlordProperty(array $propertyOverrides = []): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-settings-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09171111001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create(array_merge([
            'landlord_id' => $landlord->id,
            'title' => 'Settings Contract Property',
            'description' => 'Property for settings contract tests',
            'property_type' => 'apartment',
            'gender_restriction' => 'mixed',
            'current_status' => Property::STATUS_ACTIVE,
            'street_address' => '123 Contract Street',
            'city' => 'Test City',
            'province' => 'Test Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 1,
            'is_published' => true,
            'is_available' => true,
            'allow_partial_payments' => true,
            'require_1month_advance' => false,
        ], $propertyOverrides));

        return [$landlord, $property];
    }
}
