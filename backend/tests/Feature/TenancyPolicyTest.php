<?php

namespace Tests\Feature;

use App\Models\BillingReminderLog;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use App\Notifications\UpcomingPaymentNotification;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TenancyPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_cannot_request_extension_for_open_ended_monthly_booking(): void
    {
        [, $tenant, , , $booking] = $this->createTenantBooking([
            'contract_mode' => 'monthly',
            'end_date' => null,
            'status' => 'confirmed',
        ]);

        Sanctum::actingAs($tenant);

        $response = $this->postJson("/api/bookings/{$booking->id}/extend", [
            'extension_type' => 'monthly',
            'requested_end_date' => now()->addDays(30)->toDateString(),
            'notes' => 'Need one more month',
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Open-ended monthly stays do not need extension requests. Submit move-out notice when you are ready to leave.');

        $this->assertDatabaseCount('extension_requests', 0);
    }

    public function test_daily_contract_only_allows_daily_extension_type(): void
    {
        [, $tenant, , , $booking] = $this->createTenantBooking([
            'contract_mode' => 'daily',
            'end_date' => now()->addDays(5)->toDateString(),
            'status' => 'confirmed',
        ], [
            'billing_policy' => 'daily',
        ]);

        Sanctum::actingAs($tenant);

        $response = $this->postJson("/api/bookings/{$booking->id}/extend", [
            'extension_type' => 'monthly',
            'requested_end_date' => now()->addDays(10)->toDateString(),
            'notes' => 'Switch to monthly please',
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Daily contracts must use daily extension requests.');

        $this->assertDatabaseCount('extension_requests', 0);
    }

    public function test_upcoming_payment_notification_payload_reflects_reminder_type(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 3, 28, 10, 0, 0));

        try {
            [$landlord, $tenant, $property, , $booking] = $this->createTenantBooking([
                'payment_plan' => 'monthly',
                'status' => 'confirmed',
                'contract_mode' => 'monthly',
            ]);

            $invoice = Invoice::create([
                'reference' => 'INV-'.uniqid(),
                'landlord_id' => $landlord->id,
                'property_id' => $property->id,
                'booking_id' => $booking->id,
                'tenant_id' => $tenant->id,
                'description' => 'Monthly rent',
                'amount_cents' => 100000,
                'currency' => 'PHP',
                'status' => 'pending',
                'issued_at' => now(),
                'due_date' => Carbon::today()->addDays(1)->toDateString(),
            ]);

            $notification = new UpcomingPaymentNotification($invoice, 'due_1_day');
            $payload = $notification->toArray($tenant);

            $this->assertSame('billing_reminder', $payload['type']);
            $this->assertSame('due_1_day', $payload['reminder_type']);
            $this->assertSame('Payment Due Tomorrow', $payload['title']);
            $this->assertStringContainsString('due tomorrow', strtolower($payload['message']));
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_billing_reminder_log_dedupes_same_invoice_type_and_target_date(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 3, 28, 10, 0, 0));

        try {
            [$landlord, $tenant, $property, , $booking] = $this->createTenantBooking([
                'payment_plan' => 'monthly',
                'status' => 'confirmed',
                'contract_mode' => 'monthly',
            ]);

            $dueDate = Carbon::today()->addDays(3)->toDateString();

            $invoice = Invoice::create([
                'reference' => 'INV-'.uniqid(),
                'landlord_id' => $landlord->id,
                'property_id' => $property->id,
                'booking_id' => $booking->id,
                'tenant_id' => $tenant->id,
                'description' => 'Monthly rent',
                'amount_cents' => 100000,
                'currency' => 'PHP',
                'status' => 'pending',
                'issued_at' => now(),
                'due_date' => $dueDate,
            ]);

            $first = BillingReminderLog::firstOrCreate(
                [
                    'invoice_id' => $invoice->id,
                    'reminder_type' => 'due_3_days',
                    'target_date' => $dueDate,
                ],
                [
                    'booking_id' => $booking->id,
                    'tenant_id' => $tenant->id,
                    'sent_at' => now(),
                ]
            );

            $second = BillingReminderLog::firstOrCreate(
                [
                    'invoice_id' => $invoice->id,
                    'reminder_type' => 'due_3_days',
                    'target_date' => $dueDate,
                ],
                [
                    'booking_id' => $booking->id,
                    'tenant_id' => $tenant->id,
                    'sent_at' => now(),
                ]
            );

            $this->assertSame($first->id, $second->id);

            $this->assertDatabaseCount('billing_reminder_logs', 1);
            $this->assertDatabaseHas('billing_reminder_logs', [
                'invoice_id' => $invoice->id,
                'booking_id' => $booking->id,
                'reminder_type' => 'due_3_days',
                'target_date' => $dueDate,
                'tenant_id' => $tenant->id,
            ]);
        } finally {
            Carbon::setTestNow();
        }
    }

    /**
     * @return array{User, User, Property, Room, Booking}
     */
    private function createTenantBooking(array $bookingOverrides = [], array $roomOverrides = []): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-tenancy-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09170000001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-tenancy-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09170000002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Tenancy Test Property',
            'description' => 'Property for tenancy policy tests',
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

        $room = Room::create(array_merge([
            'property_id' => $property->id,
            'room_number' => '101',
            'room_type' => 'single',
            'floor' => 1,
            'monthly_rate' => 10000,
            'daily_rate' => 500,
            'capacity' => 1,
            'pricing_model' => 'full_room',
            'status' => 'occupied',
            'billing_policy' => 'monthly',
        ], $roomOverrides));

        $booking = Booking::create(array_merge([
            'property_id' => $property->id,
            'room_id' => $room->id,
            'tenant_id' => $tenant->id,
            'landlord_id' => $landlord->id,
            'booking_reference' => 'BKG-TENANCY-'.uniqid(),
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->addDays(25)->toDateString(),
            'total_months' => 1,
            'monthly_rent' => 10000,
            'total_amount' => 10000,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'payment_plan' => 'monthly',
            'contract_mode' => 'monthly',
        ], $bookingOverrides));

        return [$landlord, $tenant, $property, $room, $booking];
    }
}
