<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\LandlordVerification;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AnalyticsRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_payment_analytics_reports_pending_and_overdue_buckets_correctly(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-13 12:00:00'));

        $landlord = $this->createApprovedLandlord();
        $property = $this->createProperty($landlord, 'Regression Payment Property');
        $tenant = $this->createTenant('payment');

        // Total invoices = 5
        // paid = 1
        // partial = 1
        // overdue = 2 (explicit overdue + pending past due)
        // unpaid/pending = 1 (pending future due)
        $this->createInvoice($landlord, $property, $tenant, 'paid', now()->addDays(3)->toDateString(), 10000);
        $this->createInvoice($landlord, $property, $tenant, 'partial', now()->addDays(3)->toDateString(), 10000);
        $this->createInvoice($landlord, $property, $tenant, 'overdue', now()->subDays(5)->toDateString(), 10000);
        $this->createInvoice($landlord, $property, $tenant, 'pending', now()->subDays(2)->toDateString(), 10000);
        $this->createInvoice($landlord, $property, $tenant, 'pending', now()->addDays(2)->toDateString(), 10000);

        Sanctum::actingAs($landlord);

        $response = $this->getJson('/api/landlord/analytics/payments');

        $response->assertOk();
        $response->assertJsonPath('paid', 1);
        $response->assertJsonPath('partial', 1);
        $response->assertJsonPath('overdue', 2);
        $response->assertJsonPath('unpaid', 1);
        $this->assertEqualsWithDelta(20.0, (float) $response->json('payment_rate'), 0.0001);
    }

    public function test_room_type_analytics_counts_active_occupancy_per_type_for_current_landlord_only(): void
    {
        $landlord = $this->createApprovedLandlord();
        $property = $this->createProperty($landlord, 'Regression Room Type Property');

        $otherLandlord = $this->createApprovedLandlord();
        $otherProperty = $this->createProperty($otherLandlord, 'Other Landlord Property');

        $singleRoomA = $this->createRoom($property, 'single', 2, '101');
        $singleRoomB = $this->createRoom($property, 'single', 1, '102');
        $doubleRoom = $this->createRoom($property, 'double', 4, '201');

        $otherSingleRoom = $this->createRoom($otherProperty, 'single', 3, '301');

        $tenantA = $this->createTenant('room-a');
        $tenantB = $this->createTenant('room-b');
        $tenantC = $this->createTenant('room-c');
        $tenantOther = $this->createTenant('room-other');

        $this->assignTenantToRoom($singleRoomA, $tenantA, 'active');
        $this->assignTenantToRoom($singleRoomB, $tenantB, 'active');
        $this->assignTenantToRoom($doubleRoom, $tenantC, 'active');

        // Guard against cross-landlord leakage in grouped occupancy query.
        $this->assignTenantToRoom($otherSingleRoom, $tenantOther, 'active');

        Sanctum::actingAs($landlord);

        $response = $this->getJson('/api/landlord/analytics/room-types');
        $response->assertOk();

        $payload = collect($response->json())->keyBy('type');

        $this->assertSame(2, (int) data_get($payload, 'single.room_count'));
        $this->assertSame(3, (int) data_get($payload, 'single.total_slots'));
        $this->assertSame(2, (int) data_get($payload, 'single.occupied_slots'));
        $this->assertEqualsWithDelta(66.7, (float) data_get($payload, 'single.occupancy_rate'), 0.01);

        $this->assertSame(1, (int) data_get($payload, 'double.room_count'));
        $this->assertSame(4, (int) data_get($payload, 'double.total_slots'));
        $this->assertSame(1, (int) data_get($payload, 'double.occupied_slots'));
        $this->assertEqualsWithDelta(25.0, (float) data_get($payload, 'double.occupancy_rate'), 0.01);
    }

    private function createInvoice(
        User $landlord,
        Property $property,
        User $tenant,
        string $status,
        string $dueDate,
        int $amountCents
    ): Invoice {
        return Invoice::create([
            'reference' => 'INV-ANL-REG-'.uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'tenant_id' => $tenant->id,
            'description' => 'Analytics regression invoice',
            'invoice_type' => 'rent',
            'amount_cents' => $amountCents,
            'total_cents' => $amountCents,
            'currency' => 'PHP',
            'status' => $status,
            'issued_at' => now()->subDay(),
            'due_date' => $dueDate,
        ]);
    }

    private function createProperty(User $landlord, string $title): Property
    {
        return Property::create([
            'landlord_id' => $landlord->id,
            'title' => $title,
            'description' => 'Property for analytics regression tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Regression Street',
            'city' => 'Regression City',
            'province' => 'Regression Province',
            'country' => 'Philippines',
            'total_rooms' => 3,
            'available_rooms' => 0,
            'is_published' => true,
            'is_available' => true,
        ]);
    }

    private function createRoom(Property $property, string $roomType, int $capacity, string $roomNumber): Room
    {
        return Room::create([
            'property_id' => $property->id,
            'room_number' => $roomNumber,
            'room_type' => $roomType,
            'floor' => 1,
            'monthly_rate' => 10000,
            'daily_rate' => 400,
            'capacity' => $capacity,
            'pricing_model' => 'full_room',
            'status' => 'occupied',
            'billing_policy' => 'monthly',
        ]);
    }

    private function assignTenantToRoom(Room $room, User $tenant, string $status): void
    {
        DB::table('room_tenant_assignments')->insert([
            'room_id' => $room->id,
            'tenant_id' => $tenant->id,
            'bed_count' => 1,
            'start_date' => now()->subMonth()->toDateString(),
            'end_date' => null,
            'monthly_rent' => 10000,
            'status' => $status,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createTenant(string $tag): User
    {
        $suffix = uniqid();

        return User::create([
            'role' => 'tenant',
            'email' => "tenant-analytics-regression-{$tag}-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Regression',
            'last_name' => 'Tenant',
            'phone' => '09170005555',
            'is_verified' => true,
            'is_active' => true,
        ]);
    }

    private function createApprovedLandlord(): User
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-analytics-regression-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Regression',
            'last_name' => 'Owner',
            'phone' => '09170005554',
            'is_verified' => true,
            'is_active' => true,
        ]);

        LandlordVerification::create([
            'user_id' => $landlord->id,
            'first_name' => 'Regression',
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