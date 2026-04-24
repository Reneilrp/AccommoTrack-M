<?php

namespace Tests\Feature;

use App\Models\Addon;
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

class TenantPaymentResponseContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_payment_detail_contract_includes_refund_fields_and_addon_lines(): void
    {
        [$tenant, $booking] = $this->buildScenario();

        $wifi = Addon::create([
            'property_id' => $booking->property_id,
            'name' => 'Wi-Fi',
            'description' => 'Monthly internet',
            'price' => 150,
            'price_type' => 'monthly',
            'addon_type' => 'rental',
            'stock' => 50,
            'is_active' => true,
        ]);

        $parking = Addon::create([
            'property_id' => $booking->property_id,
            'name' => 'Parking',
            'description' => 'Parking slot',
            'price' => 200,
            'price_type' => 'monthly',
            'addon_type' => 'rental',
            'stock' => 20,
            'is_active' => true,
        ]);

        $invoice = Invoice::create([
            'reference' => 'INV-'.now()->format('Ymd').'-CONTRACT',
            'landlord_id' => $booking->landlord_id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'description' => 'Monthly rent with approved add-ons',
            'invoice_type' => 'rent',
            'amount_cents' => 100000,
            'total_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'partial',
            'issued_at' => now()->subDay(),
            'due_date' => now()->addDays(7)->toDateString(),
            'metadata' => [
                'addons' => [
                    [
                        'addon_id' => $wifi->id,
                        'addon_name' => $wifi->name,
                        'quantity' => 1,
                        'price' => 15000,
                    ],
                    [
                        'addon_id' => $parking->id,
                        'addon_name' => $parking->name,
                        'quantity' => 1,
                        'price' => 20000,
                    ],
                ],
            ],
        ]);

        $booking->addons()->attach($wifi->id, [
            'quantity' => 1,
            'price_at_booking_cents' => 15000,
            'status' => 'active',
            'invoice_id' => $invoice->id,
            'approved_at' => now(),
        ]);

        $booking->addons()->attach($parking->id, [
            'quantity' => 1,
            'price_at_booking_cents' => 20000,
            'status' => 'active',
            'invoice_id' => $invoice->id,
            'approved_at' => now(),
        ]);

        PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 50000,
            'currency' => 'PHP',
            'status' => 'succeeded',
            'method' => 'paymongo_gcash',
            'gateway_reference' => 'TXN-SUCCESS-1',
            'refunded_amount_cents' => 0,
        ]);

        PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 40000,
            'currency' => 'PHP',
            'status' => 'partially_refunded',
            'method' => 'paymongo_card',
            'gateway_reference' => 'TXN-PARTIAL-1',
            'refunded_amount_cents' => 10000,
        ]);

        Sanctum::actingAs($tenant);

        $response = $this->getJson("/api/tenant/payments/{$invoice->id}");

        $response
            ->assertStatus(200)
            ->assertJsonPath('id', $invoice->id)
            ->assertJsonPath('status', 'partial')
            ->assertJsonCount(2, 'metadata.addons')
            ->assertJsonFragment([
                'status' => 'partially_refunded',
                'method' => 'paymongo_card',
                'refunded_amount_cents' => 10000,
            ]);

        $payload = $response->json();
        $bookingAddons = $payload['booking']['addons'] ?? [];

        $this->assertCount(2, $bookingAddons);
        $this->assertEqualsCanonicalizing(
            [$wifi->id, $parking->id],
            array_map(static fn (array $item) => (int) $item['id'], $bookingAddons),
        );

        foreach ($bookingAddons as $addonPayload) {
            $this->assertSame($invoice->id, (int) ($addonPayload['pivot']['invoice_id'] ?? 0));
        }
    }

    public function test_payment_index_contract_nets_partial_refunds_for_remaining_balance(): void
    {
        [$tenant, $booking] = $this->buildScenario();

        $invoice = Invoice::create([
            'reference' => 'INV-'.now()->format('Ymd').'-INDEX',
            'landlord_id' => $booking->landlord_id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'description' => 'Monthly rent invoice',
            'invoice_type' => 'rent',
            'amount_cents' => 100000,
            'total_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'partial',
            'issued_at' => now()->subDay(),
            'due_date' => now()->addDays(7)->toDateString(),
        ]);

        PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 50000,
            'currency' => 'PHP',
            'status' => 'succeeded',
            'method' => 'paymongo_gcash',
            'gateway_reference' => 'TXN-SUCCESS-2',
            'refunded_amount_cents' => 0,
        ]);

        PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 40000,
            'currency' => 'PHP',
            'status' => 'partially_refunded',
            'method' => 'paymongo_card',
            'gateway_reference' => 'TXN-PARTIAL-2',
            'refunded_amount_cents' => 10000,
        ]);

        Sanctum::actingAs($tenant);

        $response = $this->getJson('/api/tenant/payments');

        $response
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $invoice->id)
            ->assertJsonPath('0.amount', 1000)
            ->assertJsonPath('0.remainingBalance', 200)
            ->assertJsonPath('0.statusRaw', 'partial')
            ->assertJsonPath('0.status', 'Partially Paid')
            ->assertJsonFragment([
                'status' => 'partially_refunded',
                'method' => 'paymongo_card',
            ]);
    }

    private function buildScenario(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-payment-contract-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170010001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-payment-contract-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09170010002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Payment Contract Property',
            'description' => 'Property for payment contract tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Contract St',
            'city' => 'Contract City',
            'province' => 'Contract Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 0,
            'is_published' => true,
            'is_available' => true,
        ]);

        $room = Room::create([
            'property_id' => $property->id,
            'room_number' => 'A-101',
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
            'booking_reference' => 'BKG-CONTRACT-'.uniqid(),
            'start_date' => now()->subDays(2)->toDateString(),
            'end_date' => now()->addDays(28)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 10000,
            'total_amount' => 10000,
            'status' => 'confirmed',
            'payment_status' => 'partial',
        ]);

        return [$tenant, $booking];
    }
}
