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
            ->assertJsonPath('error', 'Normal booking allows only 1 active or pending booking in this property.');
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
                    'full_name' => 'Proxy Occupant',
                    'date_of_birth' => '2000-01-01',
                    'gender' => 'male',
                    'relationship_to_booker' => 'child',
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'Proxy booking limit reached. Only up to 3 active or pending bookings are allowed in this property.');
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
                    'full_name' => 'Child One',
                    'date_of_birth' => '2010-01-01',
                    'gender' => 'female',
                    'relationship_to_booker' => 'child',
                    'phone' => '09171234567',
                    'email' => 'child.one@example.com',
                ],
                [
                    'full_name' => 'Child Two',
                    'date_of_birth' => '2012-06-01',
                    'gender' => 'male',
                    'relationship_to_booker' => 'child',
                ],
            ],
        ]);

        $successResponse->assertStatus(201)
            ->assertJsonPath('booking.booking_mode', 'proxy');

        $bookingId = (int) $successResponse->json('booking.id');
        $booking = Booking::findOrFail($bookingId);

        $this->assertSame('proxy', $booking->booking_mode);
        $this->assertSame(2, BookingOccupant::where('booking_id', $bookingId)->count());
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
            ->assertJsonPath('error', 'Normal booking allows only 1 active or pending booking in this property.');
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
                    'full_name' => 'Scope Occupant',
                    'date_of_birth' => '2000-01-01',
                    'gender' => 'male',
                    'relationship_to_booker' => 'child',
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'Proxy booking limit reached. Only up to 3 active or pending bookings are allowed in this property.');
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
                    'full_name' => 'Occupant One',
                    'date_of_birth' => '2010-01-01',
                    'gender' => 'female',
                    'relationship_to_booker' => 'child',
                ],
                [
                    'full_name' => 'Occupant Two',
                    'date_of_birth' => '2011-01-01',
                    'gender' => 'male',
                    'relationship_to_booker' => 'child',
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'Occupant count cannot exceed requested bed slots for this booking.');
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

    private function createRoom(int $propertyId, string $roomNumber, int $capacity = 1, string $pricingModel = 'full_room'): Room
    {
        return Room::create([
            'property_id' => $propertyId,
            'room_number' => $roomNumber,
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 12000,
            'daily_rate' => 600,
            'capacity' => $capacity,
            'pricing_model' => $pricingModel,
            'status' => 'available',
            'billing_policy' => 'monthly',
        ]);
    }
}
