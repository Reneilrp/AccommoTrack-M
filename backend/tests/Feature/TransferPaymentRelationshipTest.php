<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\LandlordVerification;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use App\Services\AnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TransferPaymentRelationshipTest extends TestCase
{
    use RefreshDatabase;

    public function test_transfer_with_unpaid_old_booking_does_not_mark_old_as_completed_or_add_collected_revenue(): void
    {
        [$landlord, $tenant] = $this->createUsers();
        $this->approveLandlordVerification($landlord);

        $property = $this->createProperty($landlord->id);
        $oldRoom = $this->createRoom($property->id, '101', 'occupied');
        $newRoom = $this->createRoom($property->id, '102', 'available');

        $oldBooking = Booking::create([
            'property_id' => $property->id,
            'room_id' => $oldRoom->id,
            'tenant_id' => $tenant->id,
            'landlord_id' => $landlord->id,
            'booking_reference' => 'BKG-OLD-'.uniqid(),
            'start_date' => now()->subDays(10)->toDateString(),
            'end_date' => now()->addDays(20)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 10000,
            'total_amount' => 10000,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
            'confirmed_at' => now()->subDays(10),
        ]);

        $oldInvoice = Invoice::create([
            'reference' => 'INV-OLD-'.uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'booking_id' => $oldBooking->id,
            'tenant_id' => $tenant->id,
            'description' => 'Old room rent invoice',
            'amount_cents' => 100000,
            'total_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now()->subDays(9),
            'due_date' => now()->addDays(1)->toDateString(),
        ]);

        $analyticsService = app(AnalyticsService::class);
        $beforeOverview = $analyticsService->calculateOverviewStats($landlord->id, $property->id);

        $this->assertSame(0.0, (float) $beforeOverview['total_revenue']);
        $this->assertSame(0.0, (float) $beforeOverview['monthly_revenue']);

        Sanctum::actingAs($landlord);

        $response = $this->postJson("/api/landlord/tenants/{$tenant->id}/transfer-room", [
            'booking_id' => $oldBooking->id,
            'new_room_id' => $newRoom->id,
            'reason' => 'Move to a bigger room',
            'new_end_date' => now()->addDays(45)->toDateString(),
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Room transfer successful');

        $oldBooking->refresh();
        $oldInvoice->refresh();

        $newBooking = Booking::where('tenant_id', $tenant->id)
            ->where('room_id', $newRoom->id)
            ->where('id', '!=', $oldBooking->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($newBooking);
        $this->assertSame('partial-completed', $oldBooking->status);
        $this->assertNotSame('completed', $oldBooking->status);
        $this->assertSame('unpaid', $oldBooking->payment_status);
        $this->assertSame('cancelled', $oldInvoice->status);

        $this->assertSame('confirmed', $newBooking->status);
        $this->assertSame('unpaid', $newBooking->payment_status);

        $afterOverview = $analyticsService->calculateOverviewStats($landlord->id, $property->id);
        $afterRevenue = $analyticsService->calculateRevenueAnalytics(
            $landlord->id,
            $property->id,
            $analyticsService->getDateRange('month'),
            'month'
        );

        // No paid invoice/transaction was created, so collected revenue should remain zero.
        $this->assertSame(0.0, (float) $afterOverview['total_revenue']);
        $this->assertSame(0.0, (float) $afterOverview['monthly_revenue']);
        $this->assertSame(0.0, (float) $afterRevenue['total_revenue']);
        $this->assertSame(0.0, (float) $afterRevenue['actual_monthly']);
    }

    private function createUsers(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-transfer-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170000001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-transfer-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09170000002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        return [$landlord, $tenant];
    }

    private function approveLandlordVerification(User $landlord): void
    {
        LandlordVerification::create([
            'user_id' => $landlord->id,
            'first_name' => $landlord->first_name,
            'middle_name' => null,
            'last_name' => $landlord->last_name,
            'valid_id_type' => 'passport',
            'valid_id_other' => null,
            'valid_id_path' => 'ids/passport.jpg',
            'permit_path' => 'permits/business-permit.jpg',
            'status' => 'approved',
        ]);
    }

    private function createProperty(int $landlordId): Property
    {
        return Property::create([
            'landlord_id' => $landlordId,
            'title' => 'Transfer Test Property',
            'description' => 'Property for transfer-payment relationship tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Test Street',
            'city' => 'Test City',
            'province' => 'Test Province',
            'country' => 'Philippines',
            'total_rooms' => 2,
            'available_rooms' => 1,
            'is_published' => true,
            'is_available' => true,
        ]);
    }

    private function createRoom(int $propertyId, string $roomNumber, string $status): Room
    {
        return Room::create([
            'property_id' => $propertyId,
            'room_number' => $roomNumber,
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 10000,
            'daily_rate' => 500,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => $status,
            'billing_policy' => 'monthly',
        ]);
    }
}
