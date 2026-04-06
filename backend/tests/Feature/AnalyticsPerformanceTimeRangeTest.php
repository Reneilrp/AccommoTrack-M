<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\LandlordVerification;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AnalyticsPerformanceTimeRangeTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_dashboard_property_and_room_performance_follow_selected_time_range(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-06 10:00:00'));

        $landlord = $this->createApprovedLandlord();
        $scenario = $this->createPerformanceScenario($landlord);

        Sanctum::actingAs($landlord);

        $propertyId = (int) $scenario['property']->id;

        $weekResponse = $this->getJson('/api/landlord/analytics/dashboard?property_id='.$propertyId.'&time_range=week');
        $monthResponse = $this->getJson('/api/landlord/analytics/dashboard?property_id='.$propertyId.'&time_range=month');
        $yearResponse = $this->getJson('/api/landlord/analytics/dashboard?property_id='.$propertyId.'&time_range=year');

        $weekResponse->assertOk();
        $monthResponse->assertOk();
        $yearResponse->assertOk();

        $weekPropertyRevenue = (float) data_get($weekResponse->json(), 'properties.0.monthly_revenue', 0);
        $monthPropertyRevenue = (float) data_get($monthResponse->json(), 'properties.0.monthly_revenue', 0);
        $yearPropertyRevenue = (float) data_get($yearResponse->json(), 'properties.0.monthly_revenue', 0);

        $weekRoomRevenue = (float) data_get($weekResponse->json(), 'room_performance.0.revenue', 0);
        $monthRoomRevenue = (float) data_get($monthResponse->json(), 'room_performance.0.revenue', 0);
        $yearRoomRevenue = (float) data_get($yearResponse->json(), 'room_performance.0.revenue', 0);

        // Seeded paid invoices by period:
        // - 2026-04-05 => 100.00 (week + month + year)
        // - 2026-03-31 => 200.00 (week + year)
        // - 2026-02-15 => 300.00 (year)
        $this->assertEqualsWithDelta(300.0, $weekPropertyRevenue, 0.0001);
        $this->assertEqualsWithDelta(100.0, $monthPropertyRevenue, 0.0001);
        $this->assertEqualsWithDelta(600.0, $yearPropertyRevenue, 0.0001);

        $this->assertEqualsWithDelta(300.0, $weekRoomRevenue, 0.0001);
        $this->assertEqualsWithDelta(100.0, $monthRoomRevenue, 0.0001);
        $this->assertEqualsWithDelta(600.0, $yearRoomRevenue, 0.0001);

        $this->assertGreaterThan($monthPropertyRevenue, $weekPropertyRevenue);
        $this->assertGreaterThan($weekPropertyRevenue, $yearPropertyRevenue);

        $this->assertGreaterThan($monthRoomRevenue, $weekRoomRevenue);
        $this->assertGreaterThan($weekRoomRevenue, $yearRoomRevenue);
    }

    public function test_property_comparison_endpoint_respects_selected_time_range(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-06 10:00:00'));

        $landlord = $this->createApprovedLandlord();
        $scenario = $this->createPerformanceScenario($landlord);

        Sanctum::actingAs($landlord);

        $propertyId = (int) $scenario['property']->id;

        $weekResponse = $this->getJson('/api/landlord/analytics/properties?property_id='.$propertyId.'&time_range=week');
        $monthResponse = $this->getJson('/api/landlord/analytics/properties?property_id='.$propertyId.'&time_range=month');
        $yearResponse = $this->getJson('/api/landlord/analytics/properties?property_id='.$propertyId.'&time_range=year');

        $weekResponse->assertOk();
        $monthResponse->assertOk();
        $yearResponse->assertOk();

        $this->assertCount(1, $weekResponse->json());
        $this->assertCount(1, $monthResponse->json());
        $this->assertCount(1, $yearResponse->json());

        $weekPropertyRevenue = (float) data_get($weekResponse->json(), '0.monthly_revenue', 0);
        $monthPropertyRevenue = (float) data_get($monthResponse->json(), '0.monthly_revenue', 0);
        $yearPropertyRevenue = (float) data_get($yearResponse->json(), '0.monthly_revenue', 0);

        $this->assertEqualsWithDelta(300.0, $weekPropertyRevenue, 0.0001);
        $this->assertEqualsWithDelta(100.0, $monthPropertyRevenue, 0.0001);
        $this->assertEqualsWithDelta(600.0, $yearPropertyRevenue, 0.0001);

        $this->assertGreaterThan($monthPropertyRevenue, $weekPropertyRevenue);
        $this->assertGreaterThan($weekPropertyRevenue, $yearPropertyRevenue);
    }

    /**
     * @return array{property: Property, room: Room}
     */
    private function createPerformanceScenario(User $landlord): array
    {
        $suffix = uniqid();

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-analytics-range-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Range',
            'last_name' => 'Tenant',
            'phone' => '09170004441',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Time Range Property',
            'description' => 'Property for analytics time range performance test',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Range Street',
            'city' => 'Range City',
            'province' => 'Range Province',
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
            'booking_reference' => 'BKG-ANL-RANGE-'.uniqid(),
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'total_months' => 12,
            'monthly_rent' => 10000,
            'total_amount' => 120000,
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
        ]);

        $this->createPaidInvoice(
            $landlord,
            $tenant,
            $property,
            $booking,
            10000,
            Carbon::parse('2026-04-05 11:00:00')
        );

        $this->createPaidInvoice(
            $landlord,
            $tenant,
            $property,
            $booking,
            20000,
            Carbon::parse('2026-03-31 14:00:00')
        );

        $this->createPaidInvoice(
            $landlord,
            $tenant,
            $property,
            $booking,
            30000,
            Carbon::parse('2026-02-15 09:00:00')
        );

        return [
            'property' => $property,
            'room' => $room,
        ];
    }

    private function createPaidInvoice(
        User $landlord,
        User $tenant,
        Property $property,
        Booking $booking,
        int $amountCents,
        Carbon $paidAt
    ): void {
        Invoice::create([
            'reference' => 'INV-RANGE-'.uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'booking_id' => $booking->id,
            'tenant_id' => $tenant->id,
            'description' => 'Time-range analytics invoice',
            'invoice_type' => 'rent',
            'amount_cents' => $amountCents,
            'total_cents' => $amountCents,
            'currency' => 'PHP',
            'status' => 'paid',
            'issued_at' => $paidAt->copy()->subDay(),
            'due_date' => $paidAt->copy()->addDays(7)->toDateString(),
            'paid_at' => $paidAt,
        ]);
    }

    private function createApprovedLandlord(): User
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-analytics-range-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Range',
            'last_name' => 'Owner',
            'phone' => '09170004440',
            'is_verified' => true,
            'is_active' => true,
        ]);

        LandlordVerification::create([
            'user_id' => $landlord->id,
            'first_name' => 'Range',
            'middle_name' => null,
            'last_name' => 'Owner',
            'valid_id_type' => 'passport',
            'valid_id_path' => 'verifications/test-valid-id.jpg',
            'permit_path' => 'verifications/test-permit.jpg',
            'status' => 'approved',
            'reviewed_at' => now(),
        ]);

        return $landlord;
    }
}
