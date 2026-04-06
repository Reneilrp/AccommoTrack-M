<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use App\Support\SystemToggle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingReservationFeeGapRuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        SystemToggle::setBool('reservation_fee_disabled', false, null);
    }

    public function test_reservation_fee_is_not_required_within_two_days(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id, true, 1500);
        $room = $this->createRoom($property->id, '101');

        Sanctum::actingAs($tenant);

        $startDate = now()->addDays(2)->toDateString();

        $response = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'start_date' => $startDate,
            'end_date' => now()->addDays(32)->toDateString(),
            'contract_mode' => 'monthly',
            'payment_plan' => 'full',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('reservation_invoice', null)
            ->assertJsonPath('reservation_policy.fee_required', false)
            ->assertJsonPath('reservation_policy.days_gap', 2)
            ->assertJsonPath('reservation_policy.move_in_date', $startDate);

        $bookingId = (int) $response->json('booking.id');
        $booking = Booking::findOrFail($bookingId);

        $this->assertSame($startDate, optional($booking->start_date)->toDateString());
        $this->assertSame($startDate, (string) $booking->move_in_date);
        $this->assertSame(0, Invoice::where('booking_id', $bookingId)->where('invoice_type', 'reservation_fee')->count());
    }

    public function test_reservation_fee_is_not_required_when_gap_is_exactly_three_days(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id, true, 1800);
        $room = $this->createRoom($property->id, '102');

        Sanctum::actingAs($tenant);

        $startDate = now()->addDays(3)->toDateString();

        $response = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'start_date' => $startDate,
            'end_date' => now()->addDays(33)->toDateString(),
            'contract_mode' => 'monthly',
            'payment_plan' => 'full',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('reservation_invoice', null)
            ->assertJsonPath('reservation_policy.fee_required', false)
            ->assertJsonPath('reservation_policy.days_gap', 3)
            ->assertJsonPath('reservation_policy.move_in_date', $startDate);

        $bookingId = (int) $response->json('booking.id');
        $this->assertSame(0, Invoice::where('booking_id', $bookingId)->where('invoice_type', 'reservation_fee')->count());
    }

    public function test_reservation_fee_is_required_when_gap_is_more_than_three_days(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id, true, 2000);
        $room = $this->createRoom($property->id, '103');

        Sanctum::actingAs($tenant);

        $startDate = now()->addDays(4)->toDateString();

        $response = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'start_date' => $startDate,
            'end_date' => now()->addDays(34)->toDateString(),
            'contract_mode' => 'monthly',
            'payment_plan' => 'full',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('reservation_policy.fee_required', true)
            ->assertJsonPath('reservation_policy.days_gap', 4)
            ->assertJsonPath('reservation_policy.move_in_date', $startDate)
            ->assertJsonPath('reservation_invoice.invoice_type', 'reservation_fee');

        $bookingId = (int) $response->json('booking.id');
        $invoice = Invoice::where('booking_id', $bookingId)
            ->where('invoice_type', 'reservation_fee')
            ->first();

        $this->assertNotNull($invoice);
        $this->assertSame(200000, $invoice->amount_cents);
    }

    public function test_move_in_date_must_match_start_date_when_provided(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id, true, 1200);
        $room = $this->createRoom($property->id, '104');

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'start_date' => now()->addDays(2)->toDateString(),
            'move_in_date' => now()->addDays(3)->toDateString(),
            'end_date' => now()->addDays(32)->toDateString(),
            'contract_mode' => 'monthly',
            'payment_plan' => 'full',
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['move_in_date']);
    }

    public function test_reservation_fee_is_not_required_when_gap_is_within_custom_threshold(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id, true, 1600, 5);
        $room = $this->createRoom($property->id, '104A');

        Sanctum::actingAs($tenant);

        $startDate = now()->addDays(5)->toDateString();

        $response = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'start_date' => $startDate,
            'end_date' => now()->addDays(35)->toDateString(),
            'contract_mode' => 'monthly',
            'payment_plan' => 'full',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('reservation_invoice', null)
            ->assertJsonPath('reservation_policy.fee_required', false)
            ->assertJsonPath('reservation_policy.days_gap', 5)
            ->assertJsonPath('reservation_policy.threshold_days', 5)
            ->assertJsonPath('reservation_policy.move_in_date', $startDate);
    }

    public function test_reservation_fee_is_required_when_gap_exceeds_custom_threshold(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id, true, 1900, 5);
        $room = $this->createRoom($property->id, '104B');

        Sanctum::actingAs($tenant);

        $startDate = now()->addDays(6)->toDateString();

        $response = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'start_date' => $startDate,
            'end_date' => now()->addDays(36)->toDateString(),
            'contract_mode' => 'monthly',
            'payment_plan' => 'full',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('reservation_policy.fee_required', true)
            ->assertJsonPath('reservation_policy.days_gap', 6)
            ->assertJsonPath('reservation_policy.threshold_days', 5)
            ->assertJsonPath('reservation_policy.move_in_date', $startDate)
            ->assertJsonPath('reservation_invoice.invoice_type', 'reservation_fee');

        $bookingId = (int) $response->json('booking.id');
        $invoice = Invoice::where('booking_id', $bookingId)
            ->where('invoice_type', 'reservation_fee')
            ->first();

        $this->assertNotNull($invoice);
        $this->assertSame(190000, $invoice->amount_cents);
    }

    public function test_tenant_bookings_list_includes_reservation_policy_payload(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id, true, 1500);
        $room = $this->createRoom($property->id, '105');

        Sanctum::actingAs($tenant);

        $startDate = now()->addDays(4)->toDateString();

        $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'start_date' => $startDate,
            'end_date' => now()->addDays(34)->toDateString(),
            'contract_mode' => 'monthly',
            'payment_plan' => 'full',
        ])->assertStatus(201);

        $response = $this->getJson('/api/tenant/bookings');

        $response
            ->assertStatus(200)
            ->assertJsonPath('0.reservation_policy.fee_required', true)
            ->assertJsonPath('0.reservation_policy.days_gap', 4)
            ->assertJsonPath('0.reservation_policy.move_in_date', $startDate);
    }

    public function test_tenant_history_includes_reservation_policy_payload(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $property = $this->createProperty($landlord->id, true, 1700);
        $room = $this->createRoom($property->id, '106');

        Sanctum::actingAs($tenant);

        $startDate = now()->addDays(4)->toDateString();

        $createResponse = $this->postJson('/api/bookings', [
            'room_id' => $room->id,
            'start_date' => $startDate,
            'end_date' => now()->addDays(34)->toDateString(),
            'contract_mode' => 'monthly',
            'payment_plan' => 'full',
        ])->assertStatus(201);

        $bookingId = (int) $createResponse->json('booking.id');

        Booking::where('id', $bookingId)->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => 'Policy payload visibility test',
        ]);

        $historyResponse = $this->getJson('/api/tenant/history');

        $historyResponse
            ->assertStatus(200)
            ->assertJsonPath('bookings.0.id', $bookingId)
            ->assertJsonPath('bookings.0.reservation_policy.fee_required', true)
            ->assertJsonPath('bookings.0.reservation_policy.days_gap', 4)
            ->assertJsonPath('bookings.0.reservation_policy.move_in_date', $startDate);
    }

    private function createUsers(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-res-gap-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170000101',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-res-gap-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09170000102',
            'is_verified' => true,
            'is_active' => true,
        ]);

        return [$landlord, $tenant];
    }

    private function createProperty(
        int $landlordId,
        bool $requireReservationFee,
        float $reservationFee,
        int $reservationFeeGapDays = 3
    ): Property
    {
        return Property::create([
            'landlord_id' => $landlordId,
            'title' => 'Reservation Gap Rule Property',
            'description' => 'Property for reservation fee gap rule tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Gap Street',
            'city' => 'Gap City',
            'province' => 'Gap Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 1,
            'is_published' => true,
            'is_available' => true,
            'require_reservation_fee' => $requireReservationFee,
            'reservation_fee' => $reservationFee,
            'reservation_fee_gap_days' => $reservationFeeGapDays,
        ]);
    }

    private function createRoom(int $propertyId, string $roomNumber): Room
    {
        return Room::create([
            'property_id' => $propertyId,
            'room_number' => $roomNumber,
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 10000,
            'daily_rate' => 500,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'available',
            'billing_policy' => 'monthly',
        ]);
    }
}
