<?php

namespace Tests\Feature;

use App\Models\CaretakerAssignment;
use App\Models\Invoice;
use App\Models\LandlordVerification;
use App\Models\PaymentTransaction;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CaretakerPermissionEnforcementTest extends TestCase
{
    use RefreshDatabase;

    public function test_caretaker_without_payments_permission_cannot_access_transaction_endpoints(): void
    {
        $scenario = $this->createBaseScenario();
        $this->assignCaretaker(
            $scenario['landlord'],
            $scenario['caretaker'],
            $scenario['property'],
            ['can_manage_payments' => false]
        );

        Sanctum::actingAs($scenario['caretaker']);

        $showResponse = $this->getJson('/api/transactions/'.$scenario['transaction']->id);
        $showResponse->assertStatus(403);
        $this->assertStringContainsString(
            'Caretaker does not have permission',
            (string) $showResponse->json('message')
        );

        $refundResponse = $this->postJson('/api/transactions/'.$scenario['transaction']->id.'/refund', [
            'amount_cents' => 100,
        ]);
        $refundResponse->assertStatus(403);
        $this->assertStringContainsString(
            'Caretaker does not have permission',
            (string) $refundResponse->json('message')
        );
    }

    public function test_caretaker_without_payments_permission_cannot_access_paymongo_endpoints(): void
    {
        $scenario = $this->createBaseScenario();
        $this->assignCaretaker(
            $scenario['landlord'],
            $scenario['caretaker'],
            $scenario['property'],
            ['can_manage_payments' => false]
        );

        Sanctum::actingAs($scenario['caretaker']);

        $sourceResponse = $this->postJson('/api/invoices/'.$scenario['invoice']->id.'/paymongo-source', [
            'method' => 'gcash',
        ]);
        $sourceResponse->assertStatus(403);
        $this->assertStringContainsString(
            'Caretaker does not have permission',
            (string) $sourceResponse->json('message')
        );

        $paymentResponse = $this->postJson('/api/invoices/'.$scenario['invoice']->id.'/paymongo-pay', [
            'source_id' => 'src_test_123',
        ]);
        $paymentResponse->assertStatus(403);
        $this->assertStringContainsString(
            'Caretaker does not have permission',
            (string) $paymentResponse->json('message')
        );
    }

    public function test_caretaker_without_bookings_permission_cannot_create_booking(): void
    {
        $scenario = $this->createBaseScenario();
        $this->assignCaretaker(
            $scenario['landlord'],
            $scenario['caretaker'],
            $scenario['property'],
            ['can_view_bookings' => false]
        );

        Sanctum::actingAs($scenario['caretaker']);

        $response = $this->postJson('/api/bookings', [
            'room_id' => $scenario['room']->id,
            'tenant_id' => $scenario['tenant']->id,
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(31)->toDateString(),
            'contract_mode' => 'monthly',
            'payment_plan' => 'full',
        ]);

        $response->assertStatus(403);
        $this->assertStringContainsString(
            'Caretaker does not have permission',
            (string) $response->json('message')
        );
    }

    public function test_caretaker_without_rooms_permission_cannot_extend_stay(): void
    {
        $scenario = $this->createBaseScenario();
        $this->assignCaretaker(
            $scenario['landlord'],
            $scenario['caretaker'],
            $scenario['property'],
            ['can_view_rooms' => false]
        );

        Sanctum::actingAs($scenario['caretaker']);

        $response = $this->postJson('/api/rooms/'.$scenario['room']->id.'/extend', [
            'tenant_id' => $scenario['tenant']->id,
            'type' => 'monthly',
            'value' => 1,
        ]);

        $response->assertStatus(403);
        $this->assertStringContainsString(
            'Caretaker does not have permission',
            (string) $response->json('message')
        );
    }

    public function test_caretaker_cannot_access_transactions_for_unassigned_property(): void
    {
        $scenario = $this->createBaseScenario();
        $this->assignCaretaker($scenario['landlord'], $scenario['caretaker'], $scenario['property']);

        $unassigned = $this->createUnassignedPropertyResources($scenario['landlord']->id, $scenario['tenant']->id);

        Sanctum::actingAs($scenario['caretaker']);

        $showResponse = $this->getJson('/api/transactions/'.$unassigned['transaction']->id);
        $showResponse->assertStatus(403);
        $this->assertSame('Caretaker is not assigned to this property.', (string) $showResponse->json('message'));

        $refundResponse = $this->postJson('/api/transactions/'.$unassigned['transaction']->id.'/refund', [
            'amount_cents' => 100,
        ]);
        $refundResponse->assertStatus(403);
        $this->assertSame('Caretaker is not assigned to this property.', (string) $refundResponse->json('message'));
    }

    public function test_caretaker_cannot_access_paymongo_endpoints_for_unassigned_property(): void
    {
        $scenario = $this->createBaseScenario();
        $this->assignCaretaker($scenario['landlord'], $scenario['caretaker'], $scenario['property']);

        $unassigned = $this->createUnassignedPropertyResources($scenario['landlord']->id, $scenario['tenant']->id);

        Sanctum::actingAs($scenario['caretaker']);

        $sourceResponse = $this->postJson('/api/invoices/'.$unassigned['invoice']->id.'/paymongo-source', [
            'method' => 'gcash',
        ]);
        $sourceResponse->assertStatus(403);
        $this->assertSame('Caretaker is not assigned to this property.', (string) $sourceResponse->json('message'));

        $paymentResponse = $this->postJson('/api/invoices/'.$unassigned['invoice']->id.'/paymongo-pay', [
            'source_id' => 'src_test_123',
        ]);
        $paymentResponse->assertStatus(403);
        $this->assertSame('Caretaker is not assigned to this property.', (string) $paymentResponse->json('message'));
    }

    public function test_caretaker_cannot_create_booking_for_unassigned_property_room(): void
    {
        $scenario = $this->createBaseScenario();
        $this->assignCaretaker($scenario['landlord'], $scenario['caretaker'], $scenario['property']);

        $unassigned = $this->createUnassignedPropertyResources($scenario['landlord']->id, $scenario['tenant']->id);

        Sanctum::actingAs($scenario['caretaker']);

        $response = $this->postJson('/api/bookings', [
            'room_id' => $unassigned['room']->id,
            'tenant_id' => $scenario['tenant']->id,
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(31)->toDateString(),
            'contract_mode' => 'monthly',
            'payment_plan' => 'full',
        ]);

        $response->assertStatus(403);
        $this->assertSame('Caretaker is not assigned to this property.', (string) $response->json('message'));
    }

    public function test_caretaker_cannot_extend_stay_for_unassigned_property_room(): void
    {
        $scenario = $this->createBaseScenario();
        $this->assignCaretaker($scenario['landlord'], $scenario['caretaker'], $scenario['property']);

        $unassigned = $this->createUnassignedPropertyResources($scenario['landlord']->id, $scenario['tenant']->id);

        Sanctum::actingAs($scenario['caretaker']);

        $response = $this->postJson('/api/rooms/'.$unassigned['room']->id.'/extend', [
            'tenant_id' => $scenario['tenant']->id,
            'type' => 'monthly',
            'value' => 1,
        ]);

        $response->assertStatus(403);
        $this->assertSame('Caretaker is not assigned to this property.', (string) $response->json('message'));
    }

    public function test_landlord_cannot_create_caretaker_with_unowned_property_ids(): void
    {
        $scenario = $this->createBaseScenario();
        $this->approveLandlord($scenario['landlord']);
        $suffix = uniqid();

        $otherLandlord = User::create([
            'role' => 'landlord',
            'email' => "other-landlord-caretaker-guard-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Other',
            'last_name' => 'Landlord',
            'phone' => '09170003001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $foreignProperty = Property::create([
            'landlord_id' => $otherLandlord->id,
            'title' => 'Foreign Caretaker Property',
            'description' => 'Property not owned by acting landlord',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '789 Foreign Street',
            'city' => 'Foreign City',
            'province' => 'Foreign Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 1,
            'is_published' => true,
            'is_available' => true,
        ]);

        Sanctum::actingAs($scenario['landlord']);

        $response = $this->postJson('/api/landlord/caretakers', [
            'first_name' => 'Denied',
            'last_name' => 'Caretaker',
            'email' => "denied-create-caretaker-{$suffix}@example.com",
            'password' => 'StrongPass1!',
            'password_confirmation' => 'StrongPass1!',
            'property_ids' => [$foreignProperty->id],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['property_ids']);
        $this->assertSame(
            'One or more selected properties are not owned by this landlord.',
            (string) data_get($response->json(), 'errors.property_ids.0')
        );
    }

    public function test_landlord_cannot_update_caretaker_with_unowned_property_ids(): void
    {
        $scenario = $this->createBaseScenario();
        $this->approveLandlord($scenario['landlord']);
        $this->assignCaretaker($scenario['landlord'], $scenario['caretaker'], $scenario['property']);
        $suffix = uniqid();

        $otherLandlord = User::create([
            'role' => 'landlord',
            'email' => "other-landlord-update-caretaker-guard-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Other',
            'last_name' => 'Landlord',
            'phone' => '09170003002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $foreignProperty = Property::create([
            'landlord_id' => $otherLandlord->id,
            'title' => 'Foreign Update Property',
            'description' => 'Foreign property for caretaker update guard',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '987 Foreign Update Street',
            'city' => 'Foreign City',
            'province' => 'Foreign Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 1,
            'is_published' => true,
            'is_available' => true,
        ]);

        $assignment = CaretakerAssignment::where('landlord_id', $scenario['landlord']->id)
            ->where('caretaker_id', $scenario['caretaker']->id)
            ->firstOrFail();

        Sanctum::actingAs($scenario['landlord']);

        $response = $this->patchJson('/api/landlord/caretakers/'.$assignment->id, [
            'property_ids' => [$foreignProperty->id],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['property_ids']);
        $this->assertSame(
            'One or more selected properties are not owned by this landlord.',
            (string) data_get($response->json(), 'errors.property_ids.0')
        );
    }

    /**
     * @return array{landlord: User, caretaker: User, tenant: User, property: Property, room: Room, invoice: Invoice, transaction: PaymentTransaction}
     */
    private function createBaseScenario(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-caretaker-guard-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Guard',
            'last_name' => 'Landlord',
            'phone' => '09170002001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $caretaker = User::create([
            'role' => 'caretaker',
            'email' => "caretaker-caretaker-guard-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Guard',
            'last_name' => 'Caretaker',
            'phone' => '09170002002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-caretaker-guard-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Guard',
            'last_name' => 'Tenant',
            'phone' => '09170002003',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Caretaker Guard Property',
            'description' => 'Property for caretaker permission enforcement tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '123 Guard Street',
            'city' => 'Guard City',
            'province' => 'Guard Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 1,
            'is_published' => true,
            'is_available' => true,
        ]);

        $room = Room::create([
            'property_id' => $property->id,
            'room_number' => '101',
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 9000,
            'daily_rate' => 350,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'available',
            'billing_policy' => 'monthly',
        ]);

        $invoice = Invoice::create([
            'reference' => 'INV-CG-'.uniqid(),
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'tenant_id' => $tenant->id,
            'description' => 'Permission guard test invoice',
            'invoice_type' => 'rent',
            'amount_cents' => 90000,
            'total_cents' => 90000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => now()->addDays(5)->toDateString(),
        ]);

        $transaction = PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 90000,
            'currency' => 'PHP',
            'status' => 'paid',
            'method' => 'cash',
            'refunded_amount_cents' => 0,
        ]);

        return [
            'landlord' => $landlord,
            'caretaker' => $caretaker,
            'tenant' => $tenant,
            'property' => $property,
            'room' => $room,
            'invoice' => $invoice,
            'transaction' => $transaction,
        ];
    }

    /**
     * @return array{property: Property, room: Room, invoice: Invoice, transaction: PaymentTransaction}
     */
    private function createUnassignedPropertyResources(int $landlordId, int $tenantId): array
    {
        $property = Property::create([
            'landlord_id' => $landlordId,
            'title' => 'Unassigned Guard Property',
            'description' => 'Unassigned property for caretaker scope tests',
            'property_type' => 'apartment',
            'current_status' => 'active',
            'street_address' => '456 Scope Street',
            'city' => 'Scope City',
            'province' => 'Scope Province',
            'country' => 'Philippines',
            'total_rooms' => 1,
            'available_rooms' => 1,
            'is_published' => true,
            'is_available' => true,
        ]);

        $room = Room::create([
            'property_id' => $property->id,
            'room_number' => '201',
            'room_type' => 'single',
            'floor' => 2,
            'monthly_rate' => 9500,
            'daily_rate' => 375,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'available',
            'billing_policy' => 'monthly',
        ]);

        $invoice = Invoice::create([
            'reference' => 'INV-CG-UN-'.uniqid(),
            'landlord_id' => $landlordId,
            'property_id' => $property->id,
            'tenant_id' => $tenantId,
            'description' => 'Permission guard unassigned invoice',
            'invoice_type' => 'rent',
            'amount_cents' => 95000,
            'total_cents' => 95000,
            'currency' => 'PHP',
            'status' => 'pending',
            'issued_at' => now(),
            'due_date' => now()->addDays(5)->toDateString(),
        ]);

        $transaction = PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenantId,
            'amount_cents' => 95000,
            'currency' => 'PHP',
            'status' => 'paid',
            'method' => 'cash',
            'refunded_amount_cents' => 0,
        ]);

        return [
            'property' => $property,
            'room' => $room,
            'invoice' => $invoice,
            'transaction' => $transaction,
        ];
    }

    private function assignCaretaker(User $landlord, User $caretaker, Property $property, array $permissionOverrides = []): void
    {
        $permissions = array_merge([
            'can_view_bookings' => true,
            'can_view_messages' => true,
            'can_view_tenants' => true,
            'can_view_rooms' => true,
            'can_view_properties' => true,
            'can_manage_maintenance' => true,
            'can_manage_payments' => true,
        ], $permissionOverrides);

        $assignment = CaretakerAssignment::create([
            'landlord_id' => $landlord->id,
            'caretaker_id' => $caretaker->id,
            ...$permissions,
        ]);

        $assignment->properties()->sync([$property->id]);
    }

    private function approveLandlord(User $landlord): void
    {
        LandlordVerification::create([
            'user_id' => $landlord->id,
            'first_name' => $landlord->first_name,
            'middle_name' => $landlord->middle_name,
            'last_name' => $landlord->last_name,
            'valid_id_type' => 'passport',
            'valid_id_path' => 'verifications/test-valid-id.jpg',
            'permit_path' => 'verifications/test-permit.jpg',
            'status' => 'approved',
            'reviewed_at' => now(),
        ]);
    }
}
