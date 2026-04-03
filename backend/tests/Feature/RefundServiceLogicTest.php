<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use App\Services\RefundService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RefundServiceLogicTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_calculate_prorated_credit_counts_only_rent_invoice_payments_for_current_period(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-01'));
        config()->set('refunds.fixed_penalty_cents', 0);

        [$landlord, $tenant, $booking] = $this->buildScenario('2026-03-01', '2026-06-01');

        $rentInvoice = Invoice::create([
            'reference' => 'INV-RENT-'.uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $tenant->id,
            'description' => 'Rent Invoice',
            'invoice_type' => 'rent',
            'amount_cents' => 50000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => '2026-04-05',
        ]);

        $addonInvoice = Invoice::create([
            'reference' => 'INV-ADDON-'.uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $tenant->id,
            'description' => 'Add-on Invoice',
            'invoice_type' => 'addon',
            'amount_cents' => 90000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => '2026-04-05',
        ]);

        PaymentTransaction::create([
            'invoice_id' => $rentInvoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 50000,
            'currency' => 'PHP',
            'status' => 'paid',
            'method' => 'cash',
            'refunded_amount_cents' => 0,
        ]);

        PaymentTransaction::create([
            'invoice_id' => $addonInvoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 90000,
            'currency' => 'PHP',
            'status' => 'paid',
            'method' => 'cash',
            'refunded_amount_cents' => 0,
        ]);

        $service = app(RefundService::class);
        $result = $service->calculateProratedCredit($booking);

        $this->assertSame(50000, $result['paid_amount_cents']);
        $this->assertSame(50000, $result['refundable_amount_cents']);
        $this->assertSame(50000, $result['final_credit_cents']);
    }

    public function test_apply_credit_to_invoice_reduces_amount_and_stores_metadata(): void
    {
        [$landlord, $tenant, $booking] = $this->buildScenario(now()->toDateString(), now()->addMonth()->toDateString());

        $invoice = Invoice::create([
            'reference' => 'INV-CREDIT-'.uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $tenant->id,
            'description' => 'Rent Invoice',
            'invoice_type' => 'rent',
            'amount_cents' => 50000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => now()->addDays(3)->toDateString(),
            'metadata' => ['original' => true],
        ]);

        $service = app(RefundService::class);
        $service->applyCreditToInvoice($invoice, 100.50, ['source' => 'transfer']);

        $invoice->refresh();

        $this->assertSame(39950, (int) $invoice->amount_cents);
        $this->assertSame('pending', $invoice->status);
        $this->assertSame('transfer', $invoice->metadata['source']);
        $this->assertEquals(100.50, (float) $invoice->metadata['credit_applied']);
        $this->assertEquals(500.00, (float) $invoice->metadata['original_amount']);
    }

    public function test_apply_credit_to_invoice_marks_fully_credited_invoice_as_paid(): void
    {
        [$landlord, $tenant, $booking] = $this->buildScenario(now()->toDateString(), now()->addMonth()->toDateString());

        $invoice = Invoice::create([
            'reference' => 'INV-FULL-CREDIT-'.uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $tenant->id,
            'description' => 'Rent Invoice',
            'invoice_type' => 'rent',
            'amount_cents' => 10000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => now()->addDays(3)->toDateString(),
        ]);

        $service = app(RefundService::class);
        $service->applyCreditToInvoice($invoice, 100.00);

        $invoice->refresh();

        $this->assertSame(0, (int) $invoice->amount_cents);
        $this->assertSame('paid', $invoice->status);
        $this->assertNotNull($invoice->paid_at);
    }

    public function test_record_refund_in_booking_sets_amount_and_timestamp(): void
    {
        [, , $booking] = $this->buildScenario(now()->toDateString(), now()->addMonth()->toDateString());

        $service = app(RefundService::class);
        $service->recordRefundInBooking($booking, 250.75);

        $booking->refresh();

        $this->assertEquals(250.75, (float) $booking->refund_amount);
        $this->assertNotNull($booking->refund_processed_at);
    }

    private function buildScenario(string $startDate, string $endDate): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-refund-service-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170000901',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-refund-service-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09170000902',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Refund Service Property',
            'description' => 'Property for refund service tests',
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
            'room_number' => '901',
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
            'booking_reference' => 'BKG-RS-'.uniqid(),
            'start_date' => $startDate,
            'end_date' => $endDate,
            'total_months' => 1,
            'monthly_rent' => 10000,
            'total_amount' => 10000,
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
        ]);

        return [$landlord, $tenant, $booking];
    }
}
