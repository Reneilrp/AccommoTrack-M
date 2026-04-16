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
use Tests\TestCase;

class GenerateMonthlyInvoicesIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_monthly_generation_is_idempotent_for_same_booking_period_key(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-15'));

        [$booking] = $this->buildScenario();
        $periodKey = '2026-04-15';

        $this->artisan('invoices:generate-monthly')->assertExitCode(0);

        $this->assertSame(
            1,
            Invoice::query()
                ->where('booking_id', $booking->id)
                ->where('invoice_type', 'rent')
                ->where('billing_period_key', $periodKey)
                ->count()
        );

        // Simulate a stale queue retry that points to the same period again.
        $booking->next_billing_date = $periodKey;
        $booking->save();

        $this->artisan('invoices:generate-monthly')->assertExitCode(0);

        $this->assertSame(
            1,
            Invoice::query()
                ->where('booking_id', $booking->id)
                ->where('invoice_type', 'rent')
                ->where('billing_period_key', $periodKey)
                ->count()
        );
    }

    public function test_open_ended_monthly_booking_generates_within_five_day_window(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-10'));

        [$booking] = $this->buildScenario();
        $booking->update([
            'end_date' => null,
            'next_billing_date' => '2026-04-15',
        ]);

        $this->artisan('invoices:generate-monthly')->assertExitCode(0);

        $this->assertSame(
            1,
            Invoice::query()
                ->where('booking_id', $booking->id)
                ->where('invoice_type', 'rent')
                ->where('billing_period_key', '2026-04-15')
                ->count()
        );
    }

    public function test_fixed_term_monthly_booking_does_not_generate_before_due_date(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-10'));

        [$booking] = $this->buildScenario();
        $booking->update([
            'end_date' => '2026-09-15',
            'next_billing_date' => '2026-04-15',
        ]);

        $this->artisan('invoices:generate-monthly')->assertExitCode(0);

        $this->assertSame(
            0,
            Invoice::query()
                ->where('booking_id', $booking->id)
                ->where('invoice_type', 'rent')
                ->where('billing_period_key', '2026-04-15')
                ->count()
        );
    }

    public function test_proxy_booking_generates_missing_slot_invoice_for_same_period(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-15'));

        [$booking] = $this->buildProxyScenario();
        $periodKey = '2026-04-15';

        $booking->refresh();
        $this->assertSame('proxy', $booking->booking_mode);
        $this->assertSame(2, (int) $booking->bed_count);
        $this->assertSame(2, $booking->occupants()->count());

        // Simulate a legacy/incomplete state where only one slot invoice exists.
        Invoice::create([
            'reference' => 'INV-LEGACY-'.strtoupper(uniqid()),
            'landlord_id' => $booking->landlord_id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'description' => 'Monthly rent for Proxy Occupant One - April 2026',
            'invoice_type' => 'rent',
            'billing_period_start' => Carbon::parse('2026-04-15'),
            'billing_period_end' => Carbon::parse('2026-05-14'),
            'billing_period_key' => $periodKey,
            'amount_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => Carbon::parse('2026-04-15'),
            'metadata' => [
                'occupant_slot' => 1,
                'proxy_booking' => true,
            ],
        ]);

        $this->artisan('invoices:generate-monthly')->assertExitCode(0);

        $periodInvoices = Invoice::query()
            ->where('booking_id', $booking->id)
            ->where('invoice_type', 'rent')
            ->where(function ($query) use ($periodKey) {
                $query->where('billing_period_key', $periodKey)
                    ->orWhere('billing_period_key', 'like', $periodKey.'#%');
            })
            ->get();

        $this->assertCount(2, $periodInvoices);

        $slots = $periodInvoices
            ->map(fn (Invoice $invoice) => (int) data_get($invoice->metadata, 'occupant_slot'))
            ->sort()
            ->values()
            ->all();

        $this->assertSame([1, 2], $slots);

        $periodKeys = $periodInvoices
            ->pluck('billing_period_key')
            ->sort()
            ->values()
            ->all();

        $this->assertSame([$periodKey, $periodKey.'#2'], $periodKeys);
    }

    public function test_proxy_booking_legacy_per_bed_monthly_rent_is_scaled_to_all_slots(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-15'));

        [$booking] = $this->buildProxyScenario();
        $periodKey = '2026-04-15';

        // Simulate legacy records where monthly_rent stored only one bed amount.
        $booking->update([
            'monthly_rent' => 10000,
            'next_billing_date' => $periodKey,
        ]);

        $this->artisan('invoices:generate-monthly')->assertExitCode(0);

        $periodInvoices = Invoice::query()
            ->where('booking_id', $booking->id)
            ->where('invoice_type', 'rent')
            ->where(function ($query) use ($periodKey) {
                $query->where('billing_period_key', $periodKey)
                    ->orWhere('billing_period_key', 'like', $periodKey.'#%');
            })
            ->get();

        $this->assertCount(2, $periodInvoices);
        $this->assertSame(4000000, (int) $periodInvoices->sum('amount_cents'));

        $amounts = $periodInvoices
            ->pluck('amount_cents')
            ->sort()
            ->values()
            ->all();

        $this->assertSame([2000000, 2000000], $amounts);
    }

    /**
     * @return array{Booking}
     */
    private function buildScenario(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-billing-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09172221001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-billing-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09172221002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Monthly Idempotency Property',
            'description' => 'Property fixture for monthly invoice idempotency tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Billing Street',
            'city' => 'Test City',
            'province' => 'Test Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 0,
            'is_published' => true,
            'is_available' => true,
            'require_1month_advance' => false,
        ]);

        $room = Room::create([
            'property_id' => $property->id,
            'room_number' => 'B-101',
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 10000,
            'daily_rate' => 400,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'occupied',
            'billing_policy' => 'monthly',
            'require_1month_advance' => false,
        ]);

        $booking = Booking::create([
            'property_id' => $property->id,
            'room_id' => $room->id,
            'tenant_id' => $tenant->id,
            'landlord_id' => $landlord->id,
            'booking_reference' => 'BKG-BILL-'.uniqid(),
            'start_date' => '2026-03-15',
            'end_date' => '2026-09-15',
            'total_months' => 6,
            'monthly_rent' => 10000,
            'total_amount' => 60000,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
            'billing_day' => 15,
            'next_billing_date' => '2026-04-15',
        ]);

        return [$booking];
    }

    /**
     * @return array{Booking}
     */
    private function buildProxyScenario(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-proxy-billing-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09172221011',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-proxy-billing-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09172221012',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Proxy Monthly Idempotency Property',
            'description' => 'Property fixture for proxy monthly invoice generation tests',
            'property_type' => 'dormitory',
            'current_status' => 'active',
            'street_address' => '456 Proxy Street',
            'city' => 'Test City',
            'province' => 'Test Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 0,
            'is_published' => true,
            'is_available' => true,
            'require_1month_advance' => false,
        ]);

        $room = Room::create([
            'property_id' => $property->id,
            'room_number' => 'P-201',
            'room_type' => 'single',
            'floor' => 2,
            'monthly_rate' => 20000,
            'daily_rate' => 800,
            'capacity' => 2,
            'pricing_model' => 'per_bed',
            'status' => 'occupied',
            'billing_policy' => 'monthly',
            'require_1month_advance' => false,
        ]);

        $booking = Booking::create([
            'property_id' => $property->id,
            'room_id' => $room->id,
            'tenant_id' => $tenant->id,
            'landlord_id' => $landlord->id,
            'booking_mode' => 'proxy',
            'bed_count' => 2,
            'booking_reference' => 'BKG-PROXY-BILL-'.uniqid(),
            'start_date' => '2026-03-15',
            'end_date' => '2026-09-15',
            'total_months' => 6,
            'monthly_rent' => 20000,
            'total_amount' => 120000,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
            'billing_day' => 15,
            'next_billing_date' => '2026-04-15',
        ]);

        $booking->occupants()->createMany([
            ['first_name' => 'Proxy', 'last_name' => 'Occupant One', 'sex' => 'female'],
            ['first_name' => 'Proxy', 'last_name' => 'Occupant Two', 'sex' => 'female'],
        ]);

        return [$booking];
    }
}
