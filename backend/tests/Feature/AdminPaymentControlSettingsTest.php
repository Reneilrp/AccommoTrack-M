<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\User;
use App\Support\SystemToggle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPaymentControlSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_read_and_update_payment_control_settings(): void
    {
        $admin = $this->createUser('admin');
        Sanctum::actingAs($admin);

        $initialResponse = $this->getJson('/api/admin/settings/payment-controls');
        $initialResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'tenant_payments_disabled',
                    'invoice_paymongo_disabled',
                    'reservation_fee_disabled',
                ],
                'message',
            ]);

        $updateResponse = $this->putJson('/api/admin/settings/payment-controls', [
            'tenant_payments_disabled' => true,
            'invoice_paymongo_disabled' => true,
            'reservation_fee_disabled' => true,
        ]);

        $updateResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'tenant_payments_disabled' => true,
                    'invoice_paymongo_disabled' => true,
                    'reservation_fee_disabled' => true,
                ],
            ]);

        $this->assertTrue(SystemToggle::getBool('tenant_payments_disabled', false));
        $this->assertTrue(SystemToggle::getBool('invoice_paymongo_disabled', false));
        $this->assertTrue(SystemToggle::getBool('reservation_fee_disabled', false));
    }

    public function test_tenant_paymongo_source_is_blocked_when_invoice_paymongo_toggle_is_enabled(): void
    {
        $tenant = $this->createUser('tenant');
        Sanctum::actingAs($tenant);

        SystemToggle::setBool('tenant_payments_disabled', false, null);
        SystemToggle::setBool('invoice_paymongo_disabled', true, null);

        $response = $this->postJson('/api/tenant/invoices/999999/paymongo-source', [
            'method' => 'gcash',
        ]);

        $response->assertStatus(503)
            ->assertJsonFragment([
                'message' => 'Online invoice payments are temporarily unavailable while payment compliance updates are in progress.',
            ]);
    }

    public function test_tenant_paymongo_source_is_blocked_when_invoice_is_pending_verification(): void
    {
        $tenant = $this->createUser('tenant');
        $landlord = $this->createUser('landlord');
        Sanctum::actingAs($tenant);

        SystemToggle::setBool('tenant_payments_disabled', false, null);
        SystemToggle::setBool('invoice_paymongo_disabled', false, null);

        $invoice = Invoice::create([
            'reference' => 'INV-PV-'.uniqid(),
            'landlord_id' => $landlord->id,
            'tenant_id' => $tenant->id,
            'description' => 'Pending verification guard test',
            'invoice_type' => 'rent',
            'amount_cents' => 100000,
            'total_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending_verification',
            'issued_at' => now(),
            'due_date' => now()->addDays(3)->toDateString(),
        ]);

        $response = $this->postJson('/api/tenant/invoices/'.$invoice->id.'/paymongo-source', [
            'method' => 'gcash',
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'This invoice is awaiting manual payment verification. Online checkout is temporarily disabled to prevent duplicate payments.',
            ]);
    }

    public function test_tenant_payment_submission_is_blocked_when_toggle_is_enabled(): void
    {
        $tenant = $this->createUser('tenant');
        Sanctum::actingAs($tenant);

        SystemToggle::setBool('tenant_payments_disabled', true, null);

        $response = $this->postJson('/api/tenant/invoices/999999/record-offline', [
            'amount_cents' => 10000,
            'method' => 'cash',
        ]);

        $response->assertStatus(503)
            ->assertJsonFragment([
                'message' => 'Tenant payment submissions are temporarily unavailable while payment compliance updates are in progress.',
            ]);
    }

    public function test_tenant_payment_submission_is_not_short_circuited_when_toggle_is_disabled(): void
    {
        $tenant = $this->createUser('tenant');
        Sanctum::actingAs($tenant);

        SystemToggle::setBool('tenant_payments_disabled', false, null);

        $response = $this->postJson('/api/tenant/invoices/999999/record-offline', [
            'amount_cents' => 10000,
            'method' => 'cash',
        ]);

        // The guard is bypassed; request proceeds and fails on missing invoice.
        $response->assertStatus(404);
    }

    private function createUser(string $role): User
    {
        $suffix = uniqid();

        return User::create([
            'role' => $role,
            'email' => "{$role}-payment-control-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => ucfirst($role),
            'last_name' => 'Tester',
            'phone' => '09170001234',
            'is_verified' => true,
            'is_active' => true,
        ]);
    }
}
