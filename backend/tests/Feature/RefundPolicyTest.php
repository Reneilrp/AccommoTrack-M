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

class RefundPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_refund_rejects_amount_above_prorated_cap_after_penalty(): void
    {
        config()->set('refunds.fixed_penalty_cents', 50000);

        [$landlord, $transaction] = $this->buildScenario(
            now()->subDays(9)->toDateString(),
            now()->addDays(20)->toDateString(),
            300000
        );

        Sanctum::actingAs($landlord);

        $response = $this->postJson("/api/transactions/{$transaction->id}/refund", [
            'amount_cents' => 200000,
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('data.max_refundable_cents', 150000);
    }

    public function test_refund_accepts_amount_within_policy_cap(): void
    {
        config()->set('refunds.fixed_penalty_cents', 50000);

        [$landlord, $transaction] = $this->buildScenario(
            now()->subDays(9)->toDateString(),
            now()->addDays(20)->toDateString(),
            300000
        );

        Sanctum::actingAs($landlord);

        $response = $this->postJson("/api/transactions/{$transaction->id}/refund", [
            'amount_cents' => 100000,
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.applied_refund_cents', 100000);

        $transaction->refresh();
        $this->assertSame(100000, (int) $transaction->refunded_amount_cents);
        $this->assertSame('partially_refunded', $transaction->status);
    }

    public function test_refund_uses_current_cap_when_amount_is_omitted(): void
    {
        config()->set('refunds.fixed_penalty_cents', 50000);

        [$landlord, $transaction] = $this->buildScenario(
            now()->subDays(9)->toDateString(),
            now()->addDays(20)->toDateString(),
            300000
        );

        Sanctum::actingAs($landlord);

        $response = $this->postJson("/api/transactions/{$transaction->id}/refund", []);

        $response
            ->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.applied_refund_cents', 150000);

        $transaction->refresh();
        $this->assertSame(150000, (int) $transaction->refunded_amount_cents);
    }

    public function test_refund_is_blocked_after_stay_window_ends(): void
    {
        config()->set('refunds.fixed_penalty_cents', 0);

        [$landlord, $transaction] = $this->buildScenario(
            now()->subDays(30)->toDateString(),
            now()->subDay()->toDateString(),
            300000
        );

        Sanctum::actingAs($landlord);

        $response = $this->postJson("/api/transactions/{$transaction->id}/refund", [
            'amount_cents' => 1000,
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('data.max_refundable_cents', 0);
    }

    private function buildScenario(string $startDate, string $endDate, int $transactionAmountCents): array
    {
        $suffix = uniqid();
        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170000001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09170000002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Test Property',
            'description' => 'Test listing',
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
            'booking_reference' => 'BKG-' . uniqid(),
            'start_date' => $startDate,
            'end_date' => $endDate,
            'total_months' => 1,
            'monthly_rent' => 10000,
            'total_amount' => 10000,
            'status' => 'confirmed',
            'payment_status' => 'paid',
        ]);

        $invoice = Invoice::create([
            'reference' => 'INV-' . uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'booking_id' => $booking->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => $transactionAmountCents,
            'currency' => 'PHP',
            'status' => 'paid',
            'issued_at' => now(),
        ]);

        $transaction = PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => $transactionAmountCents,
            'currency' => 'PHP',
            'status' => 'succeeded',
            'method' => 'cash',
            'refunded_amount_cents' => 0,
        ]);

        return [$landlord, $transaction];
    }
}
