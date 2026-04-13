<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TenantHistoryContractReliabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_history_returns_compatibility_fields_for_mobile_web_clients(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id);
        $room = $this->createRoom($property->id);
        $startDate = now()->subDays(45)->toDateString();
        $endDate = now()->subDays(10)->toDateString();

        $booking = Booking::create([
            'property_id' => $property->id,
            'room_id' => $room->id,
            'tenant_id' => $tenant->id,
            'landlord_id' => $landlord->id,
            'booking_reference' => 'BKG-HISTORY-CONTRACT-'.uniqid(),
            'start_date' => $startDate,
            'end_date' => $endDate,
            'total_months' => 1,
            'monthly_rent' => 8500,
            'total_amount' => 8500,
            'status' => 'cancelled',
            'payment_status' => 'unpaid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
            'cancelled_at' => now()->subDays(8),
            'cancellation_reason' => 'Tenant initiated cancellation',
        ]);

        Sanctum::actingAs($tenant);

        $response = $this->getJson('/api/tenant/history');

        $response
            ->assertStatus(200)
            ->assertJsonPath('bookings.0.id', $booking->id)
            ->assertJsonPath('bookings.0.booking_reference', $booking->booking_reference)
            ->assertJsonPath('bookings.0.property_id', $property->id)
            ->assertJsonPath('bookings.0.property.id', $property->id)
            ->assertJsonPath('bookings.0.start_date', $startDate)
            ->assertJsonPath('bookings.0.period.startDate', $startDate)
            ->assertJsonPath('bookings.0.has_review', false)
            ->assertJsonPath('bookings.0.hasReview', false);
    }

    public function test_tenant_history_returns_bookings_and_pagination_payload_shape(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id);
        $room = $this->createRoom($property->id);

        Booking::create([
            'property_id' => $property->id,
            'room_id' => $room->id,
            'tenant_id' => $tenant->id,
            'landlord_id' => $landlord->id,
            'booking_reference' => 'BKG-HISTORY-PAGINATION-'.uniqid(),
            'start_date' => now()->subDays(60)->toDateString(),
            'end_date' => now()->subDays(20)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 9000,
            'total_amount' => 9000,
            'status' => 'completed',
            'payment_status' => 'paid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
        ]);

        Sanctum::actingAs($tenant);

        $response = $this->getJson('/api/tenant/history');

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'bookings',
                'pagination' => ['currentPage', 'lastPage', 'perPage', 'total'],
            ]);
    }

    private function createUsers(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-history-contract-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09171111221',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-history-contract-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09171111222',
            'is_verified' => true,
            'is_active' => true,
        ]);

        return [$landlord, $tenant];
    }

    private function createProperty(int $landlordId): Property
    {
        return Property::create([
            'landlord_id' => $landlordId,
            'title' => 'Tenant History Contract Property',
            'description' => 'Property used for tenant history response contract tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 History Street',
            'city' => 'History City',
            'province' => 'History Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 0,
            'is_published' => true,
            'is_available' => true,
        ]);
    }

    private function createRoom(int $propertyId): Room
    {
        return Room::create([
            'property_id' => $propertyId,
            'room_number' => '201',
            'room_type' => 'single',
            'floor' => 2,
            'monthly_rate' => 9000,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'occupied',
            'billing_policy' => 'monthly',
        ]);
    }
}
