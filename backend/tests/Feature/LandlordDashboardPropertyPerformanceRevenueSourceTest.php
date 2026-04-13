<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureUserIsLandlord;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentTransaction;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LandlordDashboardPropertyPerformanceRevenueSourceTest extends TestCase
{
    use RefreshDatabase;

    public function test_property_performance_revenue_uses_payment_transactions_ledger(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        [$property, $room] = $this->createPropertyAndRoom($landlord);

        $booking = Booking::create([
            'property_id' => $property->id,
            'room_id' => $room->id,
            'tenant_id' => $tenant->id,
            'landlord_id' => $landlord->id,
            'booking_reference' => 'BKG-PP-'.uniqid(),
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->addDays(25)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 10000,
            'total_amount' => 10000,
            'status' => 'confirmed',
            'payment_status' => 'partial',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
        ]);

        $invoice = Invoice::create([
            'reference' => 'INV-PP-'.uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'booking_id' => $booking->id,
            'tenant_id' => $tenant->id,
            'description' => 'Property performance ledger fixture',
            'invoice_type' => 'rent',
            'amount_cents' => 20000,
            'total_cents' => 20000,
            'currency' => 'PHP',
            'status' => 'partial',
            'issued_at' => now()->subDay(),
            'due_date' => now()->addDays(3)->toDateString(),
        ]);

        PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 12345,
            'currency' => 'PHP',
            'status' => 'succeeded',
            'method' => 'cash',
            'refunded_amount_cents' => 0,
        ]);

        // Legacy payment row should no longer affect dashboard revenue aggregation.
        Payment::create([
            'tenant_id' => $tenant->id,
            'room_id' => $room->id,
            'booking_id' => $booking->id,
            'amount' => 9999,
            'payment_date' => now()->toDateString(),
            'due_date' => now()->toDateString(),
            'status' => 'paid',
            'payment_method' => 'cash',
        ]);

        $this->withoutMiddleware(EnsureUserIsLandlord::class);
        Sanctum::actingAs($landlord);

        $response = $this->getJson('/api/landlord/dashboard/property-performance');

        $response->assertOk();

        $propertyPayload = collect($response->json())->firstWhere('id', $property->id);
        $this->assertNotNull($propertyPayload);
        $this->assertEqualsWithDelta(123.45, (float) ($propertyPayload['actualRevenue'] ?? 0), 0.001);
    }

    private function createUsers(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-property-performance-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09176660001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-property-performance-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09176660002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        return [$landlord, $tenant];
    }

    private function createPropertyAndRoom(User $landlord): array
    {
        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Property Performance Fixture',
            'description' => 'Property fixture for dashboard revenue source regression test',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Fixture Street',
            'city' => 'Fixture City',
            'province' => 'Fixture Province',
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
            'daily_rate' => 500,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'occupied',
            'billing_policy' => 'monthly',
        ]);

        return [$property, $room];
    }
}
