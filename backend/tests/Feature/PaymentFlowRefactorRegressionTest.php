<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentFlowRefactorRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_landlord_approve_reservation_creates_payment_transaction_record(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        [$property, $room] = $this->createPropertyAndRoom($landlord);

        $booking = Booking::create([
            'property_id' => $property->id,
            'room_id' => $room->id,
            'tenant_id' => $tenant->id,
            'landlord_id' => $landlord->id,
            'booking_reference' => 'BKG-APR-'.uniqid(),
            'start_date' => now()->addDays(3)->toDateString(),
            'end_date' => now()->addMonths(1)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 12000,
            'total_amount' => 12000,
            'status' => 'pending_reservation',
            'payment_status' => 'unpaid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
            'bed_count' => 1,
        ]);

        $reservationInvoice = Invoice::create([
            'reference' => 'RES-'.uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'booking_id' => $booking->id,
            'tenant_id' => $tenant->id,
            'description' => 'Reservation fee for booking '.$booking->booking_reference,
            'invoice_type' => 'reservation_fee',
            'amount_cents' => 2500,
            'total_cents' => 2500,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => now()->addDays(2)->toDateString(),
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->postJson('/api/bookings/'.$booking->id.'/approve-reservation');

        $response->assertOk();
        $response->assertJsonPath('booking.status', 'reserved');

        $booking->refresh();
        $reservationInvoice->refresh();

        $this->assertSame('paid', $booking->payment_status);
        $this->assertSame('paid', $reservationInvoice->status);

        $transaction = PaymentTransaction::query()
            ->where('invoice_id', $reservationInvoice->id)
            ->where('method', 'reservation_fee_entry')
            ->first();

        $this->assertNotNull($transaction);
        $this->assertSame('succeeded', $transaction->status);
        $this->assertSame(2500, (int) $transaction->amount_cents);
    }

    public function test_get_invoices_no_longer_autogenerates_missing_booking_invoices(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        [$property, $room] = $this->createPropertyAndRoom($landlord);

        $booking = Booking::create([
            'property_id' => $property->id,
            'room_id' => $room->id,
            'tenant_id' => $tenant->id,
            'landlord_id' => $landlord->id,
            'booking_reference' => 'BKG-LST-'.uniqid(),
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->addDays(25)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 10000,
            'total_amount' => 10000,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
            'bed_count' => 1,
        ]);

        Sanctum::actingAs($landlord);

        $this->assertSame(0, Invoice::query()->where('booking_id', $booking->id)->count());

        $response = $this->getJson('/api/invoices');

        $response->assertOk();
        $this->assertSame(0, Invoice::query()->where('booking_id', $booking->id)->count());
    }

    private function createUsers(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-payment-refactor-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09179990001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-payment-refactor-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09179990002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        return [$landlord, $tenant];
    }

    private function createPropertyAndRoom(User $landlord): array
    {
        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Payment Refactor Property',
            'description' => 'Property fixture for payment refactor regression tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Payment Street',
            'city' => 'Payment City',
            'province' => 'Payment Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 0,
            'is_published' => true,
            'is_available' => true,
        ]);

        $room = Room::create([
            'property_id' => $property->id,
            'room_number' => 'R-201',
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 12000,
            'daily_rate' => 500,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'available',
            'billing_policy' => 'monthly',
        ]);

        return [$property, $room];
    }
}
