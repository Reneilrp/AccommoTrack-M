<?php

namespace Tests\Feature;

use App\Models\AuditLog;
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

class AdminPaymentOversightAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_user_cannot_access_admin_oversight_or_audit_endpoints(): void
    {
        $tenant = $this->createUser('tenant');

        Sanctum::actingAs($tenant);

        $this->getJson('/api/admin/payments/oversight')
            ->assertStatus(403)
            ->assertJsonPath('message', 'Forbidden. Admins only.');

        $this->getJson('/api/admin/audit-logs')
            ->assertStatus(403)
            ->assertJsonPath('message', 'Forbidden. Admins only.');
    }

    public function test_oversight_queue_applies_status_property_and_tenant_filters(): void
    {
        $admin = $this->createUser('admin');

        [, $tenantA, $propertyA, $bookingA] = $this->createBookingScenario();
        $invoiceA = $this->createInvoice($bookingA);

        $included = $this->createPaymentTransaction($invoiceA, $tenantA->id, [
            'status' => 'pending_offline',
            'method' => 'Bank Transfer',
        ]);

        $this->createPaymentTransaction($invoiceA, $tenantA->id, [
            'status' => 'voided',
            'method' => 'cash',
        ]);

        $this->createPaymentTransaction($invoiceA, $tenantA->id, [
            'status' => 'pending_offline',
            'method' => 'card',
        ]);

        [, $tenantB, $propertyB, $bookingB] = $this->createBookingScenario();
        $invoiceB = $this->createInvoice($bookingB);
        $this->createPaymentTransaction($invoiceB, $tenantB->id, [
            'status' => 'pending_offline',
            'method' => 'cash',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/payments/oversight?status=pending&property_id='.$propertyA->id.'&tenant_id='.$tenantA->id.'&per_page=20');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.id', $included->id)
            ->assertJsonPath('data.data.0.status', 'pending')
            ->assertJsonPath('data.data.0.property_id', $propertyA->id)
            ->assertJsonPath('data.data.0.method', 'bank_transfer');

        $this->assertNotEquals($propertyA->id, $propertyB->id);
    }

    public function test_oversight_queue_supports_high_denial_rate_filter(): void
    {
        $admin = $this->createUser('admin');

        [$highRiskLandlord, $tenantA, , $bookingA] = $this->createBookingScenario();
        $invoiceA = $this->createInvoice($bookingA);
        $highRiskTransaction = $this->createPaymentTransaction($invoiceA, $tenantA->id, [
            'status' => 'pending_offline',
            'method' => 'gcash',
        ]);

        [$lowRiskLandlord, $tenantB, , $bookingB] = $this->createBookingScenario();
        $invoiceB = $this->createInvoice($bookingB);
        $this->createPaymentTransaction($invoiceB, $tenantB->id, [
            'status' => 'pending_offline',
            'method' => 'gcash',
        ]);

        for ($i = 0; $i < 5; $i++) {
            AuditLog::create([
                'domain' => 'payment',
                'event' => 'payment.denied',
                'severity' => 'warning',
                'landlord_id' => $highRiskLandlord->id,
                'tenant_id' => $tenantA->id,
                'summary' => 'Denied payment attempt',
            ]);
        }

        AuditLog::create([
            'domain' => 'payment',
            'event' => 'payment.denied',
            'severity' => 'warning',
            'landlord_id' => $lowRiskLandlord->id,
            'tenant_id' => $tenantB->id,
            'summary' => 'Denied payment attempt',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/payments/oversight?risk_flag=high_denial_rate&per_page=20');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.id', $highRiskTransaction->id);

        $this->assertContains('high_denial_rate_landlord', $response->json('data.data.0.risk_flags'));
    }

    public function test_override_approve_requires_note(): void
    {
        $admin = $this->createUser('admin');

        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/payments/999999/override-approve', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['note']);
    }

    public function test_override_approve_returns_422_when_invoice_has_no_denied_manual_payment(): void
    {
        $admin = $this->createUser('admin');
        [, $tenant, , $booking] = $this->createBookingScenario();

        $invoice = $this->createInvoice($booking);
        $transaction = $this->createPaymentTransaction($invoice, $tenant->id, [
            'status' => 'pending_offline',
            'method' => 'cash',
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/payments/'.$invoice->id.'/override-approve', [
            'note' => 'Manual verification complete.',
        ])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'No denied manual payment found for this invoice.');

        $this->assertSame('pending_offline', $transaction->fresh()->status);
    }

    public function test_override_approve_updates_statuses_and_creates_audit_log(): void
    {
        $admin = $this->createUser('admin');
        [, $tenant, , $booking] = $this->createBookingScenario();

        $invoice = $this->createInvoice($booking, [
            'status' => 'pending',
            'amount_cents' => 100000,
            'total_cents' => 100000,
        ]);

        $transaction = $this->createPaymentTransaction($invoice, $tenant->id, [
            'status' => 'voided',
            'method' => 'gcash',
            'amount_cents' => 100000,
            'gateway_response' => [
                'denial_reason_code' => 'blurred_proof',
            ],
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/payments/'.$invoice->id.'/override-approve', [
            'note' => 'Approved after independent review.',
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.invoice.id', $invoice->id)
            ->assertJsonPath('message', 'Payment override applied successfully.');

        $transaction->refresh();
        $invoice->refresh();
        $booking->refresh();

        $this->assertSame('succeeded', $transaction->status);
        $this->assertSame('Approved after independent review.', $transaction->gateway_response['admin_override_note']);
        $this->assertSame($admin->id, $transaction->gateway_response['admin_override_by']);

        $this->assertSame('paid', $invoice->status);
        $this->assertNotNull($invoice->paid_at);
        $this->assertSame('paid', $booking->payment_status);

        $this->assertDatabaseHas('audit_logs', [
            'domain' => 'payment',
            'event' => 'payment.admin_overridden',
            'actor_id' => $admin->id,
            'invoice_id' => $invoice->id,
            'payment_transaction_id' => $transaction->id,
            'status_before' => 'voided',
            'status_after' => 'succeeded',
        ]);

        $overrideLog = AuditLog::query()
            ->where('event', 'payment.admin_overridden')
            ->where('invoice_id', $invoice->id)
            ->where('payment_transaction_id', $transaction->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($overrideLog);
        $this->assertSame('Approved after independent review.', $overrideLog->metadata['note'] ?? null);

        $timelineResponse = $this->getJson('/api/admin/audit-logs/timeline?entity_type=invoice&entity_id='.$invoice->id.'&order=asc');

        $timelineResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonFragment([
                'event' => 'payment.admin_overridden',
            ])
            ->assertJsonFragment([
                'note' => 'Approved after independent review.',
            ]);
    }

    public function test_audit_log_index_supports_filters_and_desc_ordering(): void
    {
        $admin = $this->createUser('admin');
        [, , , $booking] = $this->createBookingScenario();
        $invoice = $this->createInvoice($booking);

        $older = AuditLog::create([
            'domain' => 'payment',
            'event' => 'payment.denied',
            'severity' => 'warning',
            'actor_id' => $admin->id,
            'invoice_id' => $invoice->id,
            'summary' => 'Older matching event',
        ]);

        $newer = AuditLog::create([
            'domain' => 'payment',
            'event' => 'payment.denied',
            'severity' => 'warning',
            'actor_id' => $admin->id,
            'invoice_id' => $invoice->id,
            'summary' => 'Newer matching event',
        ]);

        AuditLog::whereKey($older->id)->update([
            'created_at' => now()->subMinutes(20),
            'updated_at' => now()->subMinutes(20),
        ]);

        AuditLog::whereKey($newer->id)->update([
            'created_at' => now()->subMinutes(1),
            'updated_at' => now()->subMinutes(1),
        ]);

        AuditLog::create([
            'domain' => 'booking',
            'event' => 'booking.created',
            'severity' => 'info',
            'actor_id' => $admin->id,
            'invoice_id' => $invoice->id,
            'summary' => 'Non-matching domain',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/audit-logs?domain=payment&event=payment.denied&invoice_id='.$invoice->id.'&per_page=20');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.current_page', 1)
            ->assertJsonCount(2, 'data.data')
            ->assertJsonPath('data.data.0.id', $newer->id)
            ->assertJsonPath('data.data.1.id', $older->id);
    }

    public function test_audit_timeline_returns_entity_specific_records_in_requested_order(): void
    {
        $admin = $this->createUser('admin');
        [, , , $booking] = $this->createBookingScenario();
        $invoice = $this->createInvoice($booking);

        $older = AuditLog::create([
            'domain' => 'payment',
            'event' => 'payment.pending_offline',
            'severity' => 'info',
            'invoice_id' => $invoice->id,
            'summary' => 'Payment submitted',
        ]);

        $newer = AuditLog::create([
            'domain' => 'payment',
            'event' => 'payment.admin_overridden',
            'severity' => 'info',
            'invoice_id' => $invoice->id,
            'summary' => 'Payment overridden',
        ]);

        AuditLog::whereKey($older->id)->update([
            'created_at' => now()->subMinutes(30),
            'updated_at' => now()->subMinutes(30),
        ]);

        AuditLog::whereKey($newer->id)->update([
            'created_at' => now()->subMinutes(2),
            'updated_at' => now()->subMinutes(2),
        ]);

        AuditLog::create([
            'domain' => 'payment',
            'event' => 'payment.denied',
            'severity' => 'warning',
            'invoice_id' => 999999,
            'summary' => 'Unrelated invoice event',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/audit-logs/timeline?entity_type=invoice&entity_id='.$invoice->id.'&order=asc');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $older->id)
            ->assertJsonPath('data.1.id', $newer->id);
    }

    private function createUser(string $role): User
    {
        $suffix = str_replace('.', '', uniqid('admin-oversight-', true));

        return User::create([
            'role' => $role,
            'email' => $role.'-'.$suffix.'@example.com',
            'password' => Hash::make('password'),
            'first_name' => ucfirst($role),
            'last_name' => 'User',
            'phone' => '0917'.random_int(1000000, 9999999),
            'is_verified' => true,
            'is_active' => true,
        ]);
    }

    /**
     * @return array{User, User, Property, Booking}
     */
    private function createBookingScenario(): array
    {
        $landlord = $this->createUser('landlord');
        $tenant = $this->createUser('tenant');

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Admin Oversight Property '.uniqid(),
            'description' => 'Property fixture for admin oversight tests',
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
            'room_number' => 'R'.random_int(100, 999),
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
            'booking_reference' => 'BKG-ADM-'.uniqid(),
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

        return [$landlord, $tenant, $property, $booking];
    }

    private function createInvoice(Booking $booking, array $overrides = []): Invoice
    {
        return Invoice::create(array_merge([
            'reference' => 'INV-ADM-'.uniqid(),
            'landlord_id' => $booking->landlord_id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'description' => 'Admin oversight invoice fixture',
            'invoice_type' => 'rent',
            'billing_period_key' => substr('BP'.uniqid(), 0, 20),
            'amount_cents' => 100000,
            'total_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => now()->addDays(5)->toDateString(),
        ], $overrides));
    }

    private function createPaymentTransaction(Invoice $invoice, int $tenantId, array $overrides = []): PaymentTransaction
    {
        return PaymentTransaction::create(array_merge([
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenantId,
            'amount_cents' => (int) ($invoice->total_cents ?? $invoice->amount_cents),
            'currency' => 'PHP',
            'status' => 'pending_offline',
            'method' => 'cash',
            'gateway_reference' => 'TX-ADM-'.uniqid(),
            'gateway_response' => [
                'proof_image_url' => 'https://example.com/proof.jpg',
            ],
        ], $overrides));
    }
}