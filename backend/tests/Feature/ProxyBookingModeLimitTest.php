<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingOccupant;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProxyBookingModeLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_normal_booking_blocks_second_active_booking_in_same_property(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id);

        $roomA = $this->createRoom($property->id, '101');
        $roomB = $this->createRoom($property->id, '102');

        Booking::create([
            'property_id' => $property->id,
            'room_id' => $roomA->id,
            'tenant_id' => $tenant->id,
            'booking_mode' => 'normal',
            'landlord_id' => $landlord->id,
            'booking_reference' => 'BK-NORMAL-EXIST-'.uniqid(),
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(31)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 12000,
            'total_amount' => 12000,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'payment_plan' => 'full',
            'contract_mode' => 'monthly',
        ]);

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/bookings', [
            'room_id' => $roomB->id,
            'booking_mode' => 'normal',
            'start_date' => now()->addDays(2)->toDateString(),
            'end_date' => now()->addDays(35)->toDateString(),
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Normal booking allows only 1 active or pending booking(s) in this property.');
    }

    public function test_normal_and_proxy_booking_limits_are_independent(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id);

        $roomA = $this->createRoom($property->id, '101');
        $roomB = $this->createRoom($property->id, '102');

        // Create 1 normal booking
        Booking::create([
            'property_id' => $property->id,
            'room_id' => $roomA->id,
            'tenant_id' => $tenant->id,
            'booking_mode' => 'normal',
            'landlord_id' => $landlord->id,
            'booking_reference' => 'BK-NORMAL-'.uniqid(),
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(31)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 12000,
            'total_amount' => 12000,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'payment_plan' => 'full',
            'contract_mode' => 'monthly',
        ]);

        Sanctum::actingAs($tenant);

        // Should still be able to create a proxy booking
        $response = $this->postJson('/api/bookings', [
            'room_id' => $roomB->id,
            'booking_mode' => 'proxy',
            'start_date' => now()->addDays(2)->toDateString(),
            'end_date' => now()->addDays(35)->toDateString(),
            'occupants' => [
                [
                    'first_name' => 'Proxy',
                    'last_name' => 'Occupant',
                    'date_of_birth' => '2000-01-01',
                    'sex' => 'male',
                    'relationship_to_booker' => 'child',
                ],
            ],
        ]);

        $response->assertStatus(201);
    }

    public function test_proxy_booking_allows_three_and_blocks_fourth_in_same_property(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id);

        $rooms = [
            $this->createRoom($property->id, '201'),
            $this->createRoom($property->id, '202'),
            $this->createRoom($property->id, '203'),
            $this->createRoom($property->id, '204'),
        ];

        foreach ([0, 1, 2] as $index) {
            Booking::create([
                'property_id' => $property->id,
                'room_id' => $rooms[$index]->id,
                'tenant_id' => $tenant->id,
                'booking_mode' => 'proxy',
                'landlord_id' => $landlord->id,
                'booking_reference' => 'BK-PROXY-EXIST-'.$index.'-'.uniqid(),
                'start_date' => now()->addDay()->toDateString(),
                'end_date' => now()->addDays(31)->toDateString(),
                'total_months' => 1,
                'monthly_rent' => 12000,
                'total_amount' => 12000,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'payment_plan' => 'full',
                'contract_mode' => 'monthly',
            ]);
        }

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/bookings', [
            'room_id' => $rooms[3]->id,
            'booking_mode' => 'proxy',
            'start_date' => now()->addDays(2)->toDateString(),
            'end_date' => now()->addDays(35)->toDateString(),
            'occupants' => [
                [
                    'first_name' => 'Proxy',
                    'last_name' => 'Occupant',
                    'date_of_birth' => '2000-01-01',
                    'sex' => 'male',
                    'relationship_to_booker' => 'child',
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Proxy booking limit reached. Only up to 3 active or pending bookings are allowed in this property.');
    }

    public function test_proxy_booking_requires_occupants_and_persists_mode_and_occupants(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id);
        $room = $this->createRoom($property->id, '301', 2, 'per_bed');

        Sanctum::actingAs($tenant);

        $missingOccupantsResponse = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'booking_mode' => 'proxy',
            'bed_count' => 1,
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(20)->toDateString(),
        ]);

        $missingOccupantsResponse->assertStatus(422)
            ->assertJsonValidationErrors(['occupants']);

        $successResponse = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'booking_mode' => 'proxy',
            'bed_count' => 2,
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(40)->toDateString(),
            'occupants' => [
                [
                    'first_name' => 'Child',
                    'last_name' => 'One',
                    'date_of_birth' => '1990-01-01',
                    'sex' => 'female',
                    'relationship_to_booker' => 'child',
                    'phone' => '09171234567',
                    'email' => 'child.one@example.com',
                ],
                [
                    'first_name' => 'Child',
                    'last_name' => 'Two',
                    'date_of_birth' => '1992-06-01',
                    'sex' => 'male',
                    'relationship_to_booker' => 'child',
                ],
            ],
        ]);

        $successResponse->assertStatus(201)
            ->assertJsonPath('data.booking.booking_mode', 'proxy');

        $bookingId = (int) $successResponse->json('data.booking.id');
        $booking = Booking::findOrFail($bookingId);

        $this->assertSame('proxy', $booking->booking_mode);
        $this->assertSame(2, BookingOccupant::where('booking_id', $bookingId)->count());
    }

    public function test_proxy_booking_exposes_occupancy_fields_in_tenant_booking_and_current_stay_payloads(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id);
        $room = $this->createRoom($property->id, '305', 4, 'per_bed');

        $booking = Booking::create([
            'property_id' => $property->id,
            'room_id' => $room->id,
            'tenant_id' => $tenant->id,
            'booking_mode' => 'proxy',
            'landlord_id' => $landlord->id,
            'booking_reference' => 'BK-PROXY-VIEW-'.uniqid(),
            'start_date' => now()->subDay()->toDateString(),
            'end_date' => now()->addDays(29)->toDateString(),
            'bed_count' => 2,
            'total_months' => 1,
            'monthly_rent' => 12000,
            'total_amount' => 24000,
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'payment_plan' => 'full',
            'contract_mode' => 'monthly',
        ]);

        $booking->occupants()->createMany([
            [
                'first_name' => 'Proxy',
                'last_name' => 'Occupant One',
                'date_of_birth' => '1990-01-01',
                'sex' => 'female',
                'relationship_to_booker' => 'child',
            ],
            [
                'first_name' => 'Proxy',
                'last_name' => 'Occupant Two',
                'date_of_birth' => '1991-01-01',
                'sex' => 'male',
                'relationship_to_booker' => 'child',
            ],
        ]);

        $room->assignTenant($tenant->id, $booking->start_date, $booking->bed_count);

        Sanctum::actingAs($tenant);

        $bookingsResponse = $this->getJson('/api/tenant/bookings');

        $bookingsResponse->assertStatus(200)
            ->assertJsonPath('0.booking_mode', 'proxy')
            ->assertJsonPath('0.bed_count', 2)
            ->assertJsonPath('0.occupant_count', 2)
            ->assertJsonPath('0.occupants.0.first_name', 'Proxy')
            ->assertJsonPath('0.occupants.0.last_name', 'Occupant One')
            ->assertJsonPath('0.occupants.1.first_name', 'Proxy')
            ->assertJsonPath('0.occupants.1.last_name', 'Occupant Two')
            ->assertJsonPath('0.room.capacity', 4);

        $currentStayResponse = $this->getJson('/api/tenant/current-stay');

        $currentStayResponse->assertStatus(200)
            ->assertJsonPath('hasActiveStay', true)
            ->assertJsonPath('stays.0.booking.booking_mode', 'proxy')
            ->assertJsonPath('stays.0.booking.bed_count', 2)
            ->assertJsonPath('stays.0.booking.occupant_count', 2)
            ->assertJsonPath('stays.0.booking.occupants.0.first_name', 'Proxy')
            ->assertJsonPath('stays.0.booking.occupants.0.last_name', 'Occupant One')
            ->assertJsonPath('stays.0.booking.occupants.1.first_name', 'Proxy')
            ->assertJsonPath('stays.0.booking.occupants.1.last_name', 'Occupant Two')
            ->assertJsonPath('stays.0.room.capacity', 4);

        Sanctum::actingAs($landlord);

        $landlordBookingsResponse = $this->getJson('/api/bookings');

        $landlordBookingsResponse->assertStatus(200)
            ->assertJsonPath('0.booking_mode', 'proxy')
            ->assertJsonPath('0.bed_count', 2)
            ->assertJsonPath('0.occupant_count', 2)
            ->assertJsonPath('0.occupants.0.first_name', 'Proxy')
            ->assertJsonPath('0.occupants.0.last_name', 'Occupant One')
            ->assertJsonPath('0.occupants.1.first_name', 'Proxy')
            ->assertJsonPath('0.occupants.1.last_name', 'Occupant Two');

        $landlordBookingDetailResponse = $this->getJson('/api/bookings/'.$booking->id);

        $landlordBookingDetailResponse->assertStatus(200)
            ->assertJsonPath('booking_mode', 'proxy')
            ->assertJsonPath('bed_count', 2)
            ->assertJsonPath('occupant_count', 2)
            ->assertJsonPath('occupants.0.first_name', 'Proxy')
            ->assertJsonPath('occupants.0.last_name', 'Occupant One')
            ->assertJsonPath('occupants.1.first_name', 'Proxy')
            ->assertJsonPath('occupants.1.last_name', 'Occupant Two');
    }

    public function test_normal_booking_limit_counts_pending_reservation_status(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id);

        $roomA = $this->createRoom($property->id, '111');
        $roomB = $this->createRoom($property->id, '112');

        Booking::create([
            'property_id' => $property->id,
            'room_id' => $roomA->id,
            'tenant_id' => $tenant->id,
            'booking_mode' => 'normal',
            'landlord_id' => $landlord->id,
            'booking_reference' => 'BK-PRES-'.uniqid(),
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(31)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 12000,
            'total_amount' => 12000,
            'status' => 'pending_reservation',
            'payment_status' => 'unpaid',
            'payment_plan' => 'full',
            'contract_mode' => 'monthly',
            'receipt_image_path' => 'receipts/mock.jpg',
        ]);

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/bookings', [
            'room_id' => $roomB->id,
            'booking_mode' => 'normal',
            'start_date' => now()->addDays(2)->toDateString(),
            'end_date' => now()->addDays(35)->toDateString(),
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Normal booking allows only 1 active or pending booking(s) in this property.');
    }

    public function test_proxy_booking_limit_counts_reserved_confirmed_and_active_statuses(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id);

        $rooms = [
            $this->createRoom($property->id, '211'),
            $this->createRoom($property->id, '212'),
            $this->createRoom($property->id, '213'),
            $this->createRoom($property->id, '214'),
        ];

        foreach (['reserved', 'confirmed', 'active'] as $index => $status) {
            Booking::create([
                'property_id' => $property->id,
                'room_id' => $rooms[$index]->id,
                'tenant_id' => $tenant->id,
                'booking_mode' => 'proxy',
                'landlord_id' => $landlord->id,
                'booking_reference' => 'BK-PROXY-SCOPE-'.$index.'-'.uniqid(),
                'start_date' => now()->addDay()->toDateString(),
                'end_date' => now()->addDays(31)->toDateString(),
                'total_months' => 1,
                'monthly_rent' => 12000,
                'total_amount' => 12000,
                'status' => $status,
                'payment_status' => $status === 'reserved' ? 'paid' : 'unpaid',
                'payment_plan' => 'full',
                'contract_mode' => 'monthly',
            ]);
        }

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/bookings', [
            'room_id' => $rooms[3]->id,
            'booking_mode' => 'proxy',
            'start_date' => now()->addDays(2)->toDateString(),
            'end_date' => now()->addDays(35)->toDateString(),
            'occupants' => [
                [
                    'first_name' => 'Scope',
                    'last_name' => 'Occupant',
                    'date_of_birth' => '2000-01-01',
                    'sex' => 'male',
                    'relationship_to_booker' => 'child',
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Proxy booking limit reached. Only up to 3 active or pending bookings are allowed in this property.');
    }

    public function test_proxy_booking_rejects_when_occupants_exceed_requested_bed_count(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id);
        $room = $this->createRoom($property->id, '401', 3, 'per_bed');

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'booking_mode' => 'proxy',
            'bed_count' => 1,
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(40)->toDateString(),
            'occupants' => [
                [
                    'first_name' => 'Occupant',
                    'last_name' => 'One',
                    'date_of_birth' => '1990-01-01',
                    'sex' => 'female',
                    'relationship_to_booker' => 'child',
                ],
                [
                    'first_name' => 'Occupant',
                    'last_name' => 'Two',
                    'date_of_birth' => '1991-01-01',
                    'sex' => 'male',
                    'relationship_to_booker' => 'child',
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Occupant count cannot exceed requested bed slots for this booking.');
    }

    public function test_proxy_booking_rejects_when_occupant_gender_mismatches_room_restriction(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id);
        $room = $this->createRoom($property->id, '501', 1, 'per_bed', 'female');

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'booking_mode' => 'proxy',
            'bed_count' => 1,
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(40)->toDateString(),
            'occupants' => [
                [
                    'first_name' => 'Occupant',
                    'last_name' => 'One',
                    'date_of_birth' => '1990-01-01',
                    'sex' => 'male',
                    'relationship_to_booker' => 'child',
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Occupant 1 sex must match the room restriction (female).');
    }

    public function test_proxy_booking_allows_tenant_sex_mismatch_when_occupant_matches_room_restriction(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $tenant->update(['sex' => 'female']);

        $property = $this->createProperty($landlord->id);
        $property->update(['property_type' => 'dormitory']);

        $room = $this->createRoom($property->id, '502', 1, 'per_bed', 'male');

        Sanctum::actingAs($tenant);

        $normalResponse = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'booking_mode' => 'normal',
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(40)->toDateString(),
        ]);

        $normalResponse->assertStatus(422);
        $this->assertSame(
            'Sorry, this room is only for specifically male only',
            $normalResponse->json('error') ?? $normalResponse->json('message'),
        );

        $proxyResponse = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'booking_mode' => 'proxy',
            'bed_count' => 1,
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(40)->toDateString(),
            'occupants' => [
                [
                    'first_name' => 'Proxy Male',
                    'last_name' => 'Occupant',
                    'date_of_birth' => '1990-01-01',
                    'sex' => 'male',
                    'relationship_to_booker' => 'sibling',
                ],
            ],
        ]);

        $proxyResponse->assertStatus(201);

        $this->assertSame(
            'proxy',
            $proxyResponse->json('booking.booking_mode') ?? $proxyResponse->json('data.booking.booking_mode'),
        );

        $bookingId = (int) ($proxyResponse->json('booking.id') ?? $proxyResponse->json('data.booking.id'));

        $this->assertDatabaseHas('bookings', [
            'id' => $bookingId,
            'tenant_id' => $tenant->id,
            'room_id' => $room->id,
            'booking_mode' => 'proxy',
        ]);

        $this->assertDatabaseHas('booking_occupants', [
            'booking_id' => $bookingId,
            'sex' => 'male',
        ]);
    }

    private function createUsers(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-proxy-mode-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170000011',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-proxy-mode-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Proxy',
            'last_name' => 'Booker',
            'phone' => '09170000012',
            'is_verified' => true,
            'is_active' => true,
        ]);

        return [$landlord, $tenant];
    }

    private function createProperty(int $landlordId): Property
    {
        return Property::create([
            'landlord_id' => $landlordId,
            'title' => 'Proxy Mode Test Property',
            'description' => 'Property for proxy mode tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Test Street',
            'city' => 'Test City',
            'province' => 'Test Province',
            'country' => 'Philippines',
            'total_rooms' => 10,
            'available_rooms' => 10,
            'is_published' => true,
            'is_available' => true,
        ]);
    }

    private function createRoom(
        int $propertyId,
        string $roomNumber,
        int $capacity = 1,
        string $pricingModel = 'full_room',
        string $sexRestriction = 'mixed',
    ): Room {
        return Room::create([
            'property_id' => $propertyId,
            'room_number' => $roomNumber,
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 12000,
            'daily_rate' => 600,
            'capacity' => $capacity,
            'pricing_model' => $pricingModel,
            'sex_restriction' => $sexRestriction,
            'status' => 'available',
            'billing_policy' => 'monthly',
        ]);
    }
}
