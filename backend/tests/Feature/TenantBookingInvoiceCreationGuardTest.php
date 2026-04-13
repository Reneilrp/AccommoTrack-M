<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TenantBookingInvoiceCreationGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_create_invoice_returns_existing_rent_invoice_for_same_billing_period(): void
    {
        [$tenant, $booking, $landlord] = $this->createScenario();
        $cycleStart = $this->resolveCycleStart($booking);
        $periodKey = $cycleStart->format('Y-m-d');

        $existing = Invoice::create([
            'reference' => 'INV-TENANT-GUARD-'.uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $tenant->id,
            'description' => 'Existing monthly invoice',
            'invoice_type' => 'rent',
            'billing_period_start' => $cycleStart,
            'billing_period_end' => $cycleStart->copy()->addMonthNoOverflow()->subDay(),
            'billing_period_key' => $periodKey,
            'amount_cents' => 100000,
            'total_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now()->subDay(),
            'due_date' => $cycleStart,
        ]);

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/tenant/bookings/'.$booking->id.'/invoice');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $existing->id);

        $this->assertSame(
            1,
            Invoice::query()
                ->where('booking_id', $booking->id)
                ->where('invoice_type', 'rent')
                ->where('billing_period_key', $periodKey)
                ->count()
        );
    }

    public function test_create_invoice_sets_billing_period_key_for_new_on_demand_invoice(): void
    {
        [$tenant, $booking] = $this->createScenario();
        $cycleStart = $this->resolveCycleStart($booking);
        $periodKey = $cycleStart->format('Y-m-d');

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/tenant/bookings/'.$booking->id.'/invoice');

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.invoice_type', 'rent')
            ->assertJsonPath('data.billing_period_key', $periodKey);

        $invoiceId = (int) $response->json('data.id');
        $invoice = Invoice::find($invoiceId);

        $this->assertNotNull($invoice);
        $this->assertSame('rent', $invoice->invoice_type);
        $this->assertSame($periodKey, $invoice->billing_period_key);
        $this->assertSame($booking->id, $invoice->booking_id);
    }

    public function test_create_invoice_can_generate_advance_next_two_months_with_deduping(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-14'));

        [$tenant, $booking, $landlord] = $this->createScenario();

        $booking->update([
            'status' => 'active',
            'end_date' => null,
            'billing_day' => 14,
            'next_billing_date' => '2026-05-14',
        ]);

        $existingUpcoming = Invoice::create([
            'reference' => 'INV-TENANT-ADVANCE-'.uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $tenant->id,
            'description' => 'Existing upcoming monthly invoice',
            'invoice_type' => 'rent',
            'billing_period_start' => '2026-05-14',
            'billing_period_end' => '2026-06-13',
            'billing_period_key' => '2026-05-14',
            'amount_cents' => 1000000,
            'total_cents' => 1000000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now()->subDay(),
            'due_date' => '2026-05-14',
        ]);

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/tenant/bookings/'.$booking->id.'/invoice', [
            'start_from' => 'next',
            'months_count' => 2,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.start_from', 'next')
            ->assertJsonPath('data.months_count', 2);

        $created = $response->json('data.created', []);
        $existing = $response->json('data.existing', []);

        $this->assertCount(1, $created);
        $this->assertCount(1, $existing);
        $this->assertSame($existingUpcoming->id, $existing[0]['id']);

        $this->assertSame(
            1,
            Invoice::query()
                ->where('booking_id', $booking->id)
                ->where('invoice_type', 'rent')
                ->where('billing_period_key', '2026-05-14')
                ->count()
        );

        $this->assertSame(
            1,
            Invoice::query()
                ->where('booking_id', $booking->id)
                ->where('invoice_type', 'rent')
                ->where('billing_period_key', '2026-06-14')
                ->count()
        );
    }

    /**
     * @return array{User, Booking, User}
     */
    private function createScenario(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-tenant-invoice-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09175550001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-tenant-invoice-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09175550002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Tenant Invoice Guard Property',
            'description' => 'Property fixture for tenant invoice guard tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Tenant Invoice Street',
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
            'room_number' => '301',
            'room_type' => 'single',
            'floor' => 3,
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
            'booking_reference' => 'BKG-TENANT-INV-'.uniqid(),
            'start_date' => now()->subDays(10)->toDateString(),
            'end_date' => now()->addDays(20)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 10000,
            'total_amount' => 10000,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
            'bed_count' => 1,
        ]);

        return [$tenant, $booking, $landlord];
    }

    private function resolveCycleStart(Booking $booking): Carbon
    {
        $startDate = Carbon::parse($booking->start_date);
        $today = Carbon::today();
        $months = 0;
        $cursor = $startDate->copy();

        while ($cursor->copy()->addMonth()->lessThanOrEqualTo($today)) {
            $months++;
            $cursor->addMonth();
        }

        return $startDate->copy()->addMonths($months)->startOfDay();
    }
}
