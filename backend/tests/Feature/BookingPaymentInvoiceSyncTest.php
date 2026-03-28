<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingPaymentInvoiceSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_booking_payment_update_only_syncs_rent_invoice_when_addon_invoice_exists(): void
    {
        [$landlord, , $booking] = $this->createScenario();

        $rentInvoice = Invoice::create([
            'reference' => 'INV-'.now()->format('Ymd').'-RENT01',
            'landlord_id' => $landlord->id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'description' => 'Monthly rent invoice',
            'invoice_type' => 'rent',
            'amount_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => now()->addDays(3)->toDateString(),
        ]);

        $addonInvoice = Invoice::create([
            'reference' => 'INV-ADD-'.now()->format('Ymd').'-ADD001',
            'landlord_id' => $landlord->id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'description' => 'Add-on: Cleaning service (One-time fee)',
            'invoice_type' => 'addon',
            'amount_cents' => 25000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => now()->addDays(3)->toDateString(),
        ]);

        Sanctum::actingAs($landlord);

        $this->patchJson("/api/bookings/{$booking->id}/payment", [
            'payment_status' => 'paid',
        ])->assertStatus(200);

        $booking->refresh();
        $rentInvoice->refresh();
        $addonInvoice->refresh();

        $this->assertSame('paid', $booking->payment_status);
        $this->assertSame('paid', $rentInvoice->status);
        $this->assertNotNull($rentInvoice->paid_at);

        $this->assertSame('pending', $addonInvoice->status);
        $this->assertNull($addonInvoice->paid_at);
    }

    public function test_booking_payment_update_does_not_sync_legacy_inv_add_invoice(): void
    {
        [$landlord, , $booking] = $this->createScenario();

        $rentInvoice = Invoice::create([
            'reference' => 'INV-'.now()->format('Ymd').'-RENT02',
            'landlord_id' => $landlord->id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'description' => 'Monthly rent invoice',
            'invoice_type' => 'rent',
            'amount_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => now()->addDays(3)->toDateString(),
        ]);

        // Legacy add-on rows may still default to invoice_type=rent; reference and description prevent accidental sync.
        $legacyAddonInvoice = Invoice::create([
            'reference' => 'INV-ADD-'.now()->format('Ymd').'-LEG001',
            'landlord_id' => $landlord->id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'description' => 'Add-on: Water gallon refill (One-time fee)',
            'invoice_type' => 'rent',
            'amount_cents' => 12000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => now()->addDays(3)->toDateString(),
        ]);

        Sanctum::actingAs($landlord);

        $this->patchJson("/api/bookings/{$booking->id}/payment", [
            'payment_status' => 'paid',
        ])->assertStatus(200);

        $rentInvoice->refresh();
        $legacyAddonInvoice->refresh();

        $this->assertSame('paid', $rentInvoice->status);
        $this->assertSame('pending', $legacyAddonInvoice->status);
        $this->assertNull($legacyAddonInvoice->paid_at);
    }

    /**
     * @return array{User, User, Booking}
     */
    private function createScenario(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-payment-sync-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170001001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-payment-sync-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09170001002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Payment Sync Property',
            'description' => 'Property for booking payment sync test',
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
            'booking_reference' => 'BKG-PAYSYNC-'.uniqid(),
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->addDays(25)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 10000,
            'total_amount' => 10000,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
        ]);

        return [$landlord, $tenant, $booking];
    }
}
