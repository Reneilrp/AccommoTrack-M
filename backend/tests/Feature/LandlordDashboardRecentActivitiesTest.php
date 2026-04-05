<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureUserIsLandlord;
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

class LandlordDashboardRecentActivitiesTest extends TestCase
{
    use RefreshDatabase;

    public function test_pending_paymongo_attempt_is_not_shown_as_payment_received_activity(): void
    {
        [$landlord, $booking, $invoice] = $this->createScenario('pending');

        $this->withoutMiddleware(EnsureUserIsLandlord::class);

        PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $booking->tenant_id,
            'amount_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending',
            'method' => 'paymongo_gcash',
            'gateway_reference' => 'src_test_pending',
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->getJson('/api/landlord/dashboard/recent-activities');

        $response->assertStatus(200);

        $activities = collect($response->json());

        $this->assertFalse(
            $activities->contains(function ($item) {
                return ($item['type'] ?? null) === 'payment'
                    && ($item['action'] ?? null) === 'Payment Received';
            }),
            'Pending PayMongo attempts should not appear as Payment Received activity.'
        );
    }

    public function test_paid_invoice_paymongo_transaction_is_shown_as_payment_received_activity(): void
    {
        [$landlord, $booking, $invoice] = $this->createScenario('paid');

        $this->withoutMiddleware(EnsureUserIsLandlord::class);

        PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $booking->tenant_id,
            'amount_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'succeeded',
            'method' => 'paymongo_gcash',
            'gateway_reference' => 'pay_test_paid',
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->getJson('/api/landlord/dashboard/recent-activities');

        $response->assertStatus(200);

        $activities = collect($response->json());

        $this->assertTrue(
            $activities->contains(function ($item) {
                return ($item['type'] ?? null) === 'payment'
                    && ($item['action'] ?? null) === 'Payment Received';
            }),
            'Paid invoices should surface Payment Received activity.'
        );
    }

    public function test_pending_offline_payment_is_shown_as_cash_verification_activity(): void
    {
        [$landlord, $booking, $invoice] = $this->createScenario('pending_verification');

        $this->withoutMiddleware(EnsureUserIsLandlord::class);

        PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $booking->tenant_id,
            'amount_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending_offline',
            'method' => 'cash',
            'gateway_reference' => 'cash_pending_test',
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->getJson('/api/landlord/dashboard/recent-activities');

        $response->assertStatus(200);

        $activities = collect($response->json());

        $this->assertTrue(
            $activities->contains(function ($item) {
                return ($item['type'] ?? null) === 'payment'
                    && ($item['action'] ?? null) === 'Cash Payment Awaiting Verification';
            }),
            'Pending offline submissions should continue to surface verification activity.'
        );
    }

    public function test_non_paymongo_payment_activity_remains_visible_even_when_invoice_not_paid(): void
    {
        [$landlord, $booking, $invoice] = $this->createScenario('partial');

        $this->withoutMiddleware(EnsureUserIsLandlord::class);

        PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $booking->tenant_id,
            'amount_cents' => 50000,
            'currency' => 'PHP',
            'status' => 'succeeded',
            'method' => 'cash',
            'gateway_reference' => 'cash_partial_paid',
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->getJson('/api/landlord/dashboard/recent-activities');

        $response->assertStatus(200);

        $activities = collect($response->json());

        $this->assertTrue(
            $activities->contains(function ($item) {
                return ($item['type'] ?? null) === 'payment'
                    && ($item['action'] ?? null) === 'Payment Received';
            }),
            'Non-PayMongo payment activity should remain visible with existing behavior.'
        );
    }

    /**
     * @return array{User, Booking, Invoice}
     */
    private function createScenario(string $invoiceStatus): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-dashboard-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09171111001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-dashboard-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09171111002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Dashboard Property',
            'description' => 'Property for landlord dashboard activity tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Test Street',
            'city' => 'Test City',
            'province' => 'Test Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 0,
            'is_published' => true,
            'is_available' => true,
        ]);

        $room = Room::create([
            'property_id' => $property->id,
            'room_number' => '101',
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 10000,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'occupied',
            'billing_policy' => 'monthly',
        ]);

        $booking = Booking::create([
            'property_id' => $property->id,
            'room_id' => $room->id,
            'tenant_id' => $tenant->id,
            'landlord_id' => $landlord->id,
            'booking_reference' => 'BKG-DB-ACT-'.uniqid(),
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->addDays(25)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 10000,
            'total_amount' => 10000,
            'status' => 'confirmed',
            'payment_status' => $invoiceStatus === 'paid' ? 'paid' : 'unpaid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
        ]);

        $invoice = Invoice::create([
            'reference' => 'INV-'.now()->format('Ymd').'-DBACT',
            'landlord_id' => $landlord->id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'description' => 'Monthly rent invoice',
            'invoice_type' => 'rent',
            'amount_cents' => 100000,
            'currency' => 'PHP',
            'status' => $invoiceStatus,
            'issued_at' => now()->subDays(2),
            'due_date' => now()->addDays(3)->toDateString(),
            'paid_at' => $invoiceStatus === 'paid' ? now()->subDay() : null,
        ]);

        return [$landlord, $booking, $invoice];
    }
}
