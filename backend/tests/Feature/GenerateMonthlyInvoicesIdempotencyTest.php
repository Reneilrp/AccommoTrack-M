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
}
