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
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CashPaymentFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_can_record_cash_payment_for_own_invoice(): void
    {
        Notification::fake();

        [$landlord, $tenant, $invoice] = $this->createCashPaymentScenario();

        Sanctum::actingAs($tenant);

        $response = $this->postJson("/api/tenant/invoices/{$invoice->id}/record-offline", [
            'amount_cents' => 50000,
            'method' => 'cash',
            'reference' => 'CASH-REC-001',
            'notes' => 'Paid to landlord directly',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('transaction.status', 'pending_offline')
            ->assertJsonPath('transaction.method', 'cash')
            ->assertJsonPath('transaction.amount_cents', 50000);

        $invoice->refresh();
        $this->assertSame('pending_verification', $invoice->status);

        $this->assertDatabaseHas('payment_transactions', [
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'status' => 'pending_offline',
            'method' => 'cash',
            'amount_cents' => 50000,
        ]);
    }

    public function test_landlord_approve_cash_payment_marks_invoice_paid_when_full_amount_received(): void
    {
        Notification::fake();

        [$landlord, $tenant, $invoice, $booking] = $this->createCashPaymentScenario();

        Sanctum::actingAs($tenant);
        $this->postJson("/api/tenant/invoices/{$invoice->id}/record-offline", [
            'amount_cents' => 100000,
            'method' => 'cash',
            'reference' => 'CASH-FULL-001',
            'notes' => 'Full cash payment',
        ])->assertStatus(201);

        Sanctum::actingAs($landlord);
        $response = $this->postJson("/api/invoices/{$invoice->id}/verify-cash", [
            'action' => 'approve',
        ]);

        $response
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('invoice.status', 'paid');

        $invoice->refresh();
        $booking->refresh();

        $this->assertSame('paid', $invoice->status);
        $this->assertNotNull($invoice->paid_at);
        $this->assertSame('paid', $booking->payment_status);

        $this->assertDatabaseHas('payment_transactions', [
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'status' => 'succeeded',
            'method' => 'cash',
            'amount_cents' => 100000,
        ]);
    }

    public function test_landlord_reject_cash_payment_voids_pending_transaction_and_resets_invoice_to_pending(): void
    {
        Notification::fake();

        [$landlord, $tenant, $invoice, $booking] = $this->createCashPaymentScenario();

        Sanctum::actingAs($tenant);
        $this->postJson("/api/tenant/invoices/{$invoice->id}/record-offline", [
            'amount_cents' => 30000,
            'method' => 'cash',
            'reference' => 'CASH-REJECT-001',
            'notes' => 'Cash handoff attempt',
        ])->assertStatus(201);

        Sanctum::actingAs($landlord);
        $response = $this->postJson("/api/invoices/{$invoice->id}/verify-cash", [
            'action' => 'reject',
        ]);

        $response
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('invoice.status', 'pending');

        $invoice->refresh();
        $booking->refresh();

        $this->assertSame('pending', $invoice->status);
        $this->assertSame('unpaid', $booking->payment_status);

        $this->assertDatabaseHas('payment_transactions', [
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'status' => 'voided',
            'method' => 'cash',
            'amount_cents' => 30000,
        ]);
    }

    public function test_tenant_cash_partial_payment_is_blocked_when_property_disallows_partial_payments(): void
    {
        Notification::fake();

        [, $tenant, $invoice] = $this->createCashPaymentScenario([
            'allow_partial_payments' => false,
        ]);

        Sanctum::actingAs($tenant);

        $response = $this->postJson("/api/tenant/invoices/{$invoice->id}/record-offline", [
            'amount_cents' => 50000,
            'method' => 'cash',
            'reference' => 'CASH-PARTIAL-BLOCKED',
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('message', 'Partial payments are not allowed for this property. Please pay the full remaining balance of ₱1,000.00');

        $this->assertDatabaseMissing('payment_transactions', [
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 50000,
            'status' => 'pending_offline',
        ]);
    }

    /**
     * @return array{User, User, Invoice, Booking}
     */
    private function createCashPaymentScenario(array $propertyOverrides = []): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-cash-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170000001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-cash-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09170000002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create(array_merge([
            'landlord_id' => $landlord->id,
            'title' => 'Cash Payment Property',
            'description' => 'Property for cash payment tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Test Street',
            'city' => 'Test City',
            'province' => 'Test Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 0,
            'allow_partial_payments' => true,
            'is_published' => true,
            'is_available' => true,
        ], $propertyOverrides));

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
            'booking_reference' => 'BKG-CASH-'.uniqid(),
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

        $invoice = Invoice::create([
            'reference' => 'INV-CASH-'.uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'booking_id' => $booking->id,
            'tenant_id' => $tenant->id,
            'description' => 'Monthly rent invoice',
            'amount_cents' => 100000,
            'total_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => now()->addDays(3)->toDateString(),
        ]);

        return [$landlord, $tenant, $invoice, $booking];
    }
}
