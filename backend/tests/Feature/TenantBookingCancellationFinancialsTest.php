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

class TenantBookingCancellationFinancialsTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_cancelled_booking_cancels_open_invoices_and_hides_financial_stay(): void
    {
        [$tenant, $booking, $openInvoice, $paidInvoice] = $this->createScenario();

        Sanctum::actingAs($tenant);

        $before = $this->getJson('/api/tenant/current-stay');
        $before->assertOk()->assertJsonPath('hasActiveStay', true);

        $cancelResponse = $this->patchJson('/api/tenant/bookings/'.$booking->id.'/cancel', [
            'cancellation_reason' => 'Changed plans',
        ]);

        $cancelResponse->assertOk()
            ->assertJsonPath('message', 'Booking cancelled')
            ->assertJsonPath('booking.status', 'cancelled');

        $booking->refresh();
        $openInvoice->refresh();
        $paidInvoice->refresh();

        $this->assertSame('cancelled', $booking->status);
        $this->assertSame('cancelled', $openInvoice->status);
        $this->assertStringContainsString('(Cancelled due to booking cancellation)', (string) $openInvoice->description);

        // Settled invoice should remain immutable.
        $this->assertSame('paid', $paidInvoice->status);

        $this->assertDatabaseHas('payment_transactions', [
            'invoice_id' => $openInvoice->id,
            'status' => 'voided',
        ]);

        $after = $this->getJson('/api/tenant/current-stay');
        $after->assertOk()
            ->assertJsonPath('hasActiveStay', false)
            ->assertJsonCount(0, 'stays');
    }

    /**
     * @return array{User, Booking, Invoice, Invoice}
     */
    private function createScenario(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-cancel-finance-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170010101',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-cancel-finance-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09170010102',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Cancellation Finance Property',
            'description' => 'Property fixture for tenant cancellation finance tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Cancel Street',
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
            'room_number' => '201',
            'room_type' => 'single',
            'floor' => 2,
            'monthly_rate' => 10000,
            'daily_rate' => 400,
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
            'booking_reference' => 'BKG-CANCEL-'.uniqid(),
            'start_date' => now()->subDays(3)->toDateString(),
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

        $room->assignTenant($tenant->id, $booking->start_date->format('Y-m-d'), 1);

        $openInvoice = Invoice::create([
            'reference' => 'INV-CANCEL-PENDING-'.uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'booking_id' => $booking->id,
            'tenant_id' => $tenant->id,
            'description' => 'Open invoice for booking',
            'invoice_type' => 'rent',
            'amount_cents' => 100000,
            'total_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending_verification',
            'issued_at' => now(),
            'due_date' => now()->addDays(3)->toDateString(),
        ]);

        PaymentTransaction::create([
            'invoice_id' => $openInvoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending_offline',
            'method' => 'gcash',
            'gateway_reference' => 'GCASH-CANCEL-'.uniqid(),
            'gateway_response' => [
                'proof_image_url' => 'https://example.com/proof.jpg',
            ],
        ]);

        $paidInvoice = Invoice::create([
            'reference' => 'INV-CANCEL-PAID-'.uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'booking_id' => $booking->id,
            'tenant_id' => $tenant->id,
            'description' => 'Settled invoice should remain paid',
            'invoice_type' => 'rent',
            'amount_cents' => 100000,
            'total_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'paid',
            'issued_at' => now()->subDays(5),
            'due_date' => now()->subDays(2)->toDateString(),
            'paid_at' => now()->subDays(1),
        ]);

        return [$tenant, $booking, $openInvoice, $paidInvoice];
    }
}
