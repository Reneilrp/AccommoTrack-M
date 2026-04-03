<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InvoiceSummaryTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_landlord_invoice_summary_defaults_to_current_month(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-04 09:00:00'));

        [$landlord, $tenant] = $this->createUsers();
        [$property, $booking] = $this->createPropertyAndBooking($landlord, $tenant);

        $paidInvoice = $this->createInvoice($booking, [
            'amount_cents' => 100000,
            'total_cents' => 100000,
            'status' => 'paid',
            'issued_at' => now()->startOfMonth()->addDays(2),
            'due_date' => now()->startOfMonth()->addDays(5)->toDateString(),
        ]);

        PaymentTransaction::create([
            'invoice_id' => $paidInvoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'succeeded',
            'method' => 'cash',
            'refunded_amount_cents' => 0,
        ]);

        $this->createInvoice($booking, [
            'amount_cents' => 50000,
            'total_cents' => 50000,
            'status' => 'pending',
            'issued_at' => now()->startOfMonth()->addDays(3),
            'due_date' => now()->startOfMonth()->addDays(8)->toDateString(),
        ]);

        $this->createInvoice($booking, [
            'amount_cents' => 70000,
            'total_cents' => 70000,
            'status' => 'overdue',
            'issued_at' => now()->subMonth()->startOfMonth()->addDays(10),
            'due_date' => now()->subMonth()->startOfMonth()->addDays(15)->toDateString(),
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->getJson('/api/invoices/summary');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.range', 'month')
            ->assertJsonPath('data.totals.total_paid_cents', 100000)
            ->assertJsonPath('data.totals.total_balance_cents', 50000)
            ->assertJsonPath('data.totals.paid_count', 1)
            ->assertJsonPath('data.totals.pending_count', 1)
            ->assertJsonPath('data.totals.overdue_count', 0)
            ->assertJsonPath('data.totals.total_invoices', 2);
    }

    public function test_landlord_invoice_summary_all_range_includes_all_periods(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-04 09:00:00'));

        [$landlord, $tenant] = $this->createUsers();
        [$property, $booking] = $this->createPropertyAndBooking($landlord, $tenant);

        $paidInvoice = $this->createInvoice($booking, [
            'amount_cents' => 15000,
            'total_cents' => 15000,
            'status' => 'paid',
            'issued_at' => now()->startOfMonth()->addDay(),
            'due_date' => now()->startOfMonth()->addDays(4)->toDateString(),
        ]);

        PaymentTransaction::create([
            'invoice_id' => $paidInvoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 15000,
            'currency' => 'PHP',
            'status' => 'succeeded',
            'method' => 'gcash',
            'refunded_amount_cents' => 0,
        ]);

        $this->createInvoice($booking, [
            'amount_cents' => 20000,
            'total_cents' => 20000,
            'status' => 'pending_verification',
            'issued_at' => now()->startOfMonth()->addDays(2),
            'due_date' => now()->startOfMonth()->addDays(6)->toDateString(),
        ]);

        $this->createInvoice($booking, [
            'amount_cents' => 30000,
            'total_cents' => 30000,
            'status' => 'overdue',
            'issued_at' => now()->subMonth()->startOfMonth()->addDays(8),
            'due_date' => now()->subMonth()->startOfMonth()->addDays(12)->toDateString(),
        ]);

        Sanctum::actingAs($landlord);

        $response = $this->getJson('/api/invoices/summary?range=all');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.range', 'all')
            ->assertJsonPath('data.totals.total_paid_cents', 15000)
            ->assertJsonPath('data.totals.total_balance_cents', 50000)
            ->assertJsonPath('data.totals.paid_count', 1)
            ->assertJsonPath('data.totals.pending_verification_count', 1)
            ->assertJsonPath('data.totals.overdue_count', 1)
            ->assertJsonPath('data.totals.total_invoices', 3);
    }

    private function createUsers(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-invoice-summary-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170001111',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-invoice-summary-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09170002222',
            'is_verified' => true,
            'is_active' => true,
        ]);

        return [$landlord, $tenant];
    }

    private function createPropertyAndBooking(User $landlord, User $tenant): array
    {
        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Invoice Summary Property',
            'description' => 'Property fixture for invoice summary tests',
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
            'room_number' => 'R-101',
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 10000,
            'daily_rate' => 500,
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
            'booking_reference' => 'BKG-IS-'.uniqid(),
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->addDays(25)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 10000,
            'total_amount' => 10000,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
        ]);

        return [$property, $booking];
    }

    private function createInvoice(Booking $booking, array $overrides = []): Invoice
    {
        return Invoice::create(array_merge([
            'reference' => 'INV-IS-'.uniqid(),
            'landlord_id' => $booking->landlord_id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'description' => 'Invoice summary fixture',
            'invoice_type' => 'rent',
            'billing_period_key' => substr('BP-'.uniqid(), 0, 20),
            'amount_cents' => 10000,
            'total_cents' => 10000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => now()->addDays(3)->toDateString(),
        ], $overrides));
    }
}
