<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\LandlordVerification;
use App\Models\Property;
use App\Models\Room;
use App\Models\TenantProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingCheckoutLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_payment_update_does_not_complete_confirmed_booking(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $this->approveLandlordVerification($landlord);

        $property = $this->createProperty($landlord->id);
        $room = $this->createRoom($property->id, '201', 'available');

        $booking = $this->createBooking($property->id, $room->id, $landlord->id, $tenant->id, [
            'status' => 'confirmed',
            'payment_status' => 'partial',
            'deposit_balance' => 0,
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->patchJson("/api/bookings/{$booking->id}/payment", [
            'payment_status' => 'paid',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('booking.status', 'confirmed')
            ->assertJsonPath('booking.payment_status', 'paid');

        $booking->refresh();
        $this->assertSame('confirmed', $booking->status);
        $this->assertSame('paid', $booking->payment_status);
    }

    public function test_finalize_checkout_marks_paid_stay_completed_and_ends_assignment(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $this->approveLandlordVerification($landlord);

        $property = $this->createProperty($landlord->id);
        $room = $this->createRoom($property->id, '202', 'available');

        $booking = $this->createBooking($property->id, $room->id, $landlord->id, $tenant->id, [
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'deposit_balance' => 0,
            'start_date' => now()->subDays(7)->toDateString(),
            'end_date' => now()->addDays(1)->toDateString(),
            'confirmed_at' => now()->subDays(7),
        ]);

        $room->assignTenant($tenant->id, now()->subDays(7)->toDateString(), 1);
        TenantProfile::create([
            'user_id' => $tenant->id,
            'booking_id' => $booking->id,
            'status' => 'active',
            'move_in_date' => now()->subDays(7)->toDateString(),
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->postJson("/api/bookings/{$booking->id}/finalize-checkout", [
            'move_out_date' => now()->toDateString(),
            'note' => 'Automated test checkout',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.booking.status', 'completed');

        $this->assertStringStartsWith(
            now()->toDateString(),
            (string) data_get($response->json(), 'data.booking.end_date')
        );

        $booking->refresh();
        $this->assertSame('completed', $booking->status);
        $this->assertSame(now()->toDateString(), optional($booking->end_date)->format('Y-m-d'));

        $room->refresh();
        $this->assertFalse($room->tenants()->where('tenant_id', $tenant->id)->exists());

        $profile = TenantProfile::where('user_id', $tenant->id)->first();

        $this->assertNotNull($profile);
        $this->assertSame('inactive', $profile->status);
        $this->assertSame(now()->toDateString(), optional($profile->move_out_date)->format('Y-m-d'));
    }

    public function test_finalize_checkout_marks_unpaid_stay_partial_completed(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $this->approveLandlordVerification($landlord);

        $property = $this->createProperty($landlord->id);
        $room = $this->createRoom($property->id, '203', 'available');

        $booking = $this->createBooking($property->id, $room->id, $landlord->id, $tenant->id, [
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'deposit_balance' => 0,
            'start_date' => now()->subDays(4)->toDateString(),
            'end_date' => now()->addDays(2)->toDateString(),
            'confirmed_at' => now()->subDays(4),
        ]);

        $room->assignTenant($tenant->id, now()->subDays(4)->toDateString(), 1);

        Sanctum::actingAs($landlord);

        $response = $this->postJson("/api/bookings/{$booking->id}/finalize-checkout", [
            'move_out_date' => now()->toDateString(),
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.booking.status', 'partial-completed');

        $booking->refresh();
        $this->assertSame('partial-completed', $booking->status);
    }

    private function createUsers(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-checkout-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170000101',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-checkout-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09170000102',
            'is_verified' => true,
            'is_active' => true,
        ]);

        return [$landlord, $tenant];
    }

    private function approveLandlordVerification(User $landlord): void
    {
        LandlordVerification::create([
            'user_id' => $landlord->id,
            'first_name' => $landlord->first_name,
            'middle_name' => null,
            'last_name' => $landlord->last_name,
            'valid_id_type' => 'passport',
            'valid_id_other' => null,
            'valid_id_path' => 'ids/passport.jpg',
            'permit_path' => 'permits/business-permit.jpg',
            'status' => 'approved',
        ]);
    }

    private function createProperty(int $landlordId): Property
    {
        return Property::create([
            'landlord_id' => $landlordId,
            'title' => 'Checkout Test Property',
            'description' => 'Property for checkout lifecycle tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Test Street',
            'city' => 'Test City',
            'province' => 'Test Province',
            'country' => 'Philippines',
            'total_rooms' => 2,
            'available_rooms' => 2,
            'is_published' => true,
            'is_available' => true,
        ]);
    }

    private function createRoom(int $propertyId, string $roomNumber, string $status): Room
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
            'status' => $status,
            'billing_policy' => 'monthly',
        ]);
    }

    private function createBooking(int $propertyId, int $roomId, int $landlordId, int $tenantId, array $overrides = []): Booking
    {
        return Booking::create(array_merge([
            'property_id' => $propertyId,
            'room_id' => $roomId,
            'tenant_id' => $tenantId,
            'landlord_id' => $landlordId,
            'booking_reference' => 'BKG-CHECKOUT-'.uniqid(),
            'start_date' => now()->subDays(3)->toDateString(),
            'end_date' => now()->addDays(10)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 10000,
            'total_amount' => 10000,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
            'deposit_balance' => 0,
            'confirmed_at' => now()->subDays(3),
        ], $overrides));
    }
}
