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

class GenerateMonthlyInvoicesCancelledBookingGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_monthly_generation_skips_cancelled_bookings_even_when_billing_fields_are_populated(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-15'));

        [$booking] = $this->buildScenario();

        $this->artisan('invoices:generate-monthly')->assertExitCode(0);

        $this->assertSame(
            0,
            Invoice::query()
                ->where('booking_id', $booking->id)
                ->where('invoice_type', 'rent')
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
            'email' => "landlord-cancelled-cron-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170020101',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-cancelled-cron-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09170020102',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Cancelled Booking Cron Guard Property',
            'description' => 'Property fixture for cancelled booking invoice generation guard tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Guard Street',
            'city' => 'Test City',
            'province' => 'Test Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 1,
            'is_published' => true,
            'is_available' => true,
            'require_1month_advance' => false,
        ]);

        $room = Room::create([
            'property_id' => $property->id,
            'room_number' => 'C-101',
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 9000,
            'daily_rate' => 350,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'available',
            'billing_policy' => 'monthly',
            'require_1month_advance' => false,
        ]);

        $booking = Booking::create([
            'property_id' => $property->id,
            'room_id' => $room->id,
            'tenant_id' => $tenant->id,
            'landlord_id' => $landlord->id,
            'booking_reference' => 'BKG-CANCELLED-'.uniqid(),
            'start_date' => '2026-03-15',
            'end_date' => '2026-09-15',
            'total_months' => 6,
            'monthly_rent' => 9000,
            'total_amount' => 54000,
            'status' => 'cancelled',
            'payment_status' => 'unpaid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
            'billing_day' => 15,
            'next_billing_date' => '2026-04-15',
            'cancelled_at' => now()->subDay(),
            'cancellation_reason' => 'Tenant cancelled before move-in.',
        ]);

        return [$booking];
    }
}
