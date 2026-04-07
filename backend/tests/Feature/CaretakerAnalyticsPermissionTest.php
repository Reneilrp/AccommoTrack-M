<?php

namespace Tests\Feature;

use App\Models\CaretakerAssignment;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CaretakerAnalyticsPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_caretaker_with_analytics_permission_can_access_analytics_dashboard(): void
    {
        $scenario = $this->createScenario(['can_view_analytics' => true]);

        Sanctum::actingAs($scenario['caretaker']);

        $response = $this->getJson(
            '/api/landlord/analytics/dashboard?property_id='.$scenario['property']->id.'&time_range=month'
        );

        $response->assertOk();
        $response->assertJsonStructure([
            'overview',
            'revenue',
            'occupancy',
            'roomTypes',
            'properties',
            'tenants',
            'payments',
            'bookings',
        ]);
    }

    public function test_caretaker_without_analytics_permission_cannot_access_analytics_dashboard(): void
    {
        $scenario = $this->createScenario(['can_view_analytics' => false]);

        Sanctum::actingAs($scenario['caretaker']);

        $response = $this->getJson(
            '/api/landlord/analytics/dashboard?property_id='.$scenario['property']->id.'&time_range=month'
        );

        $response->assertStatus(403);
        $this->assertStringContainsString(
            'analytics',
            strtolower((string) $response->json('message'))
        );
    }

    /**
     * @param  array<string, bool>  $permissionOverrides
     * @return array{landlord: User, caretaker: User, property: Property}
     */
    private function createScenario(array $permissionOverrides = []): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-analytics-guard-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Analytics',
            'last_name' => 'Landlord',
            'phone' => '09170004001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $caretaker = User::create([
            'role' => 'caretaker',
            'email' => "caretaker-analytics-guard-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Analytics',
            'last_name' => 'Caretaker',
            'phone' => '09170004002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Caretaker Analytics Property',
            'description' => 'Property for caretaker analytics permission tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Analytics Street',
            'city' => 'Analytics City',
            'province' => 'Analytics Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 1,
            'is_published' => true,
            'is_available' => true,
        ]);

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

        $assignment->properties()->sync([$property->id]);

        return [
            'landlord' => $landlord,
            'caretaker' => $caretaker,
            'property' => $property,
        ];
    }
}
