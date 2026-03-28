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

class TenantBookingContractModeTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_can_create_daily_booking_with_end_date(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id);
        $room = $this->createRoom($property->id, 'daily');

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(4)->toDateString(),
            'payment_plan' => 'monthly',
            'notes' => 'Daily stay test',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('booking.contract_mode', 'daily')
            ->assertJsonPath('booking.payment_plan', 'full');

        $bookingId = (int) $response->json('booking.id');
        $booking = Booking::findOrFail($bookingId);

        $this->assertSame($tenant->id, $booking->tenant_id);
        $this->assertSame('daily', $booking->contract_mode);
        $this->assertSame('full', $booking->payment_plan);
        $this->assertNotNull($booking->end_date);
    }

    public function test_tenant_can_create_open_ended_monthly_booking(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id);
        $room = $this->createRoom($property->id, 'monthly');

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'start_date' => now()->addDay()->toDateString(),
            'payment_plan' => 'full',
            'notes' => 'Open-ended monthly stay',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('booking.contract_mode', 'monthly')
            ->assertJsonPath('booking.payment_plan', 'monthly')
            ->assertJsonPath('booking.end_date', null);

        $bookingId = (int) $response->json('booking.id');
        $booking = Booking::findOrFail($bookingId);

        $this->assertSame('monthly', $booking->contract_mode);
        $this->assertSame('monthly', $booking->payment_plan);
        $this->assertNull($booking->end_date);
    }

    public function test_tenant_can_create_monthly_with_daily_booking_in_daily_mode(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id);
        $room = $this->createRoom($property->id, 'monthly_with_daily');

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'contract_mode' => 'daily',
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(5)->toDateString(),
            'payment_plan' => 'monthly',
            'notes' => 'Hybrid room daily mode',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('booking.contract_mode', 'daily')
            ->assertJsonPath('booking.payment_plan', 'full');

        $bookingId = (int) $response->json('booking.id');
        $booking = Booking::findOrFail($bookingId);

        $this->assertSame('daily', $booking->contract_mode);
        $this->assertSame('full', $booking->payment_plan);
        $this->assertNotNull($booking->end_date);
    }

    public function test_tenant_can_create_monthly_with_daily_booking_in_monthly_mode_open_ended(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id);
        $room = $this->createRoom($property->id, 'monthly_with_daily');

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'contract_mode' => 'monthly',
            'start_date' => now()->addDay()->toDateString(),
            'payment_plan' => 'full',
            'notes' => 'Hybrid room monthly mode',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('booking.contract_mode', 'monthly')
            ->assertJsonPath('booking.payment_plan', 'monthly')
            ->assertJsonPath('booking.end_date', null);

        $bookingId = (int) $response->json('booking.id');
        $booking = Booking::findOrFail($bookingId);

        $this->assertSame('monthly', $booking->contract_mode);
        $this->assertSame('monthly', $booking->payment_plan);
        $this->assertNull($booking->end_date);
    }

    private function createUsers(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-booking-mode-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170000001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-booking-mode-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09170000002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        return [$landlord, $tenant];
    }

    private function createProperty(int $landlordId): Property
    {
        return Property::create([
            'landlord_id' => $landlordId,
            'title' => 'Booking Mode Test Property',
            'description' => 'Property for booking mode tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Test Street',
            'city' => 'Test City',
            'province' => 'Test Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 1,
            'is_published' => true,
            'is_available' => true,
        ]);
    }

    private function createRoom(int $propertyId, string $billingPolicy): Room
    {
        return Room::create([
            'property_id' => $propertyId,
            'room_number' => '101',
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 12000,
            'daily_rate' => 600,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'available',
            'billing_policy' => $billingPolicy,
        ]);
    }
}
