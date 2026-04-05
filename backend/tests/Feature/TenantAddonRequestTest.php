<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureUserIsLandlord;
use App\Models\Addon;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TenantAddonRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_regular_addon_request_succeeds_without_suggested_price_key(): void
    {
        [$tenant, $booking, $addon] = $this->buildScenario();

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/tenant/addons/request', [
            'addon_id' => $addon->id,
            'quantity' => 1,
            'note' => 'Please deliver tonight',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('addon.id', $addon->id);

        $pivot = DB::table('booking_addons')
            ->where('booking_id', $booking->id)
            ->where('addon_id', $addon->id)
            ->first();

        $this->assertNotNull($pivot);
        $this->assertSame('pending', $pivot->status);
        $this->assertSame('Please deliver tonight', $pivot->request_note);
    }

    public function test_custom_addon_request_appends_suggested_price_to_note(): void
    {
        [$tenant, $booking] = $this->buildScenario();

        Sanctum::actingAs($tenant);

        $response = $this->postJson('/api/tenant/addons/request', [
            'is_custom' => true,
            'name' => 'Portable Air Purifier',
            'addon_type' => 'rental',
            'price_type' => 'monthly',
            'quantity' => 1,
            'note' => 'Prefer compact model',
            'suggested_price' => 550,
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('success', true);

        $addonId = (int) $response->json('addon.id');
        $this->assertGreaterThan(0, $addonId);

        $pivot = DB::table('booking_addons')
            ->where('booking_id', $booking->id)
            ->where('addon_id', $addonId)
            ->first();

        $this->assertNotNull($pivot);
        $this->assertStringContainsString('Prefer compact model', $pivot->request_note);
        $this->assertStringContainsString('Suggested price: ₱550.00', $pivot->request_note);
    }

    public function test_landlord_approval_uses_custom_suggested_price_for_pivot_and_invoice(): void
    {
        [$tenant, $booking, , $landlord] = $this->buildScenario();

        Sanctum::actingAs($tenant);

        $requestResponse = $this->postJson('/api/tenant/addons/request', [
            'is_custom' => true,
            'name' => 'Portable Air Purifier',
            'addon_type' => 'rental',
            'price_type' => 'monthly',
            'quantity' => 1,
            'note' => 'Prefer compact model',
            'suggested_price' => 550,
        ]);

        $requestResponse
            ->assertStatus(201)
            ->assertJsonPath('success', true);

        $addonId = (int) $requestResponse->json('addon.id');
        $this->assertGreaterThan(0, $addonId);

        Sanctum::actingAs($landlord);
        $this->withoutMiddleware(EnsureUserIsLandlord::class);

        $approveResponse = $this->patchJson("/api/landlord/bookings/{$booking->id}/addons/{$addonId}", [
            'action' => 'approve',
        ]);

        $approveResponse
            ->assertStatus(200)
            ->assertJsonPath('status', 'active');

        $pivot = DB::table('booking_addons')
            ->where('booking_id', $booking->id)
            ->where('addon_id', $addonId)
            ->first();

        $this->assertNotNull($pivot);
        $this->assertSame('active', $pivot->status);
        $this->assertEquals(550.00, (float) $pivot->price_at_booking);
        $this->assertNotNull($pivot->invoice_id);

        $invoice = DB::table('invoices')
            ->where('id', $pivot->invoice_id)
            ->first();

        $this->assertNotNull($invoice);
        $this->assertSame('addon', $invoice->invoice_type);
        $this->assertSame(55000, (int) $invoice->amount_cents);
    }

    public function test_landlord_approval_fails_when_custom_request_has_no_resolvable_price(): void
    {
        [$tenant, $booking, , $landlord] = $this->buildScenario();

        Sanctum::actingAs($tenant);

        $requestResponse = $this->postJson('/api/tenant/addons/request', [
            'is_custom' => true,
            'name' => 'Portable Drawer',
            'addon_type' => 'rental',
            'price_type' => 'monthly',
            'quantity' => 1,
            'note' => 'No quoted price yet',
        ]);

        $requestResponse
            ->assertStatus(201)
            ->assertJsonPath('success', true);

        $addonId = (int) $requestResponse->json('addon.id');
        $this->assertGreaterThan(0, $addonId);

        Sanctum::actingAs($landlord);
        $this->withoutMiddleware(EnsureUserIsLandlord::class);

        $approveResponse = $this->patchJson("/api/landlord/bookings/{$booking->id}/addons/{$addonId}", [
            'action' => 'approve',
        ]);

        $approveResponse
            ->assertStatus(422)
            ->assertJsonValidationErrors(['approved_price']);

        $pivot = DB::table('booking_addons')
            ->where('booking_id', $booking->id)
            ->where('addon_id', $addonId)
            ->first();

        $this->assertNotNull($pivot);
        $this->assertSame('pending', $pivot->status);
        $this->assertNull($pivot->invoice_id);

        $this->assertSame(0, Invoice::where('booking_id', $booking->id)->where('invoice_type', 'addon')->count());
    }

    private function buildScenario(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-addon-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170000001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-addon-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09170000002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Addon Test Property',
            'description' => 'Property for addon request test',
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
            'booking_reference' => 'BKG-ADDON-'.uniqid(),
            'start_date' => now()->subDays(2)->toDateString(),
            'end_date' => now()->addDays(28)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 10000,
            'total_amount' => 10000,
            'status' => 'confirmed',
            'payment_status' => 'paid',
        ]);

        $addon = Addon::create([
            'property_id' => $property->id,
            'name' => 'Electric Fan',
            'description' => 'Standard fan rental',
            'price' => 300,
            'price_type' => 'monthly',
            'addon_type' => 'rental',
            'stock' => 5,
            'is_active' => true,
        ]);

        return [$tenant, $booking, $addon, $landlord];
    }
}
