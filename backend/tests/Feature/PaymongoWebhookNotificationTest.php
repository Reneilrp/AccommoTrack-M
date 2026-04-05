<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use App\Notifications\NewPaymentReceived;
use App\Notifications\RentPaidSuccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PaymongoWebhookNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_link_payment_paid_webhook_does_not_notify_landlord_when_invoice_not_paid(): void
    {
        [$landlord, $tenant, $room, $invoice] = $this->createScenario('pending');

        config(['services.paymongo.webhook_secret' => 'test-secret']);
        Notification::fake();

        $payload = $this->buildLinkPaymentPaidPayload($room->id, $tenant->id, $invoice->id, 'gcash');
        $signature = hash_hmac('sha256', json_encode($payload), 'test-secret');

        $this->postJson('/api/payments/webhook/paymongo', $payload, [
            'Paymongo-Signature' => $signature,
        ])->assertStatus(200);

        Notification::assertSentTo($tenant, RentPaidSuccess::class, function (RentPaidSuccess $notification) use ($tenant) {
            $data = $notification->toArray($tenant);

            return ($data['payment_method'] ?? null) === 'paymongo_gcash';
        });

        Notification::assertNotSentTo($landlord, NewPaymentReceived::class);
    }

    public function test_link_payment_paid_webhook_notifies_landlord_only_when_invoice_paid(): void
    {
        [$landlord, $tenant, $room, $invoice] = $this->createScenario('paid');

        config(['services.paymongo.webhook_secret' => 'test-secret']);
        Notification::fake();

        $payload = $this->buildLinkPaymentPaidPayload($room->id, $tenant->id, $invoice->id, 'gcash');
        $signature = hash_hmac('sha256', json_encode($payload), 'test-secret');

        $this->postJson('/api/payments/webhook/paymongo', $payload, [
            'Paymongo-Signature' => $signature,
        ])->assertStatus(200);

        Notification::assertSentTo($tenant, RentPaidSuccess::class);
        Notification::assertSentTo($landlord, NewPaymentReceived::class);
    }

    /**
     * @return array{User, User, Room, Invoice}
     */
    private function createScenario(string $invoiceStatus): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-webhook-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Land',
            'last_name' => 'Lord',
            'phone' => '09172222001',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-webhook-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Ten',
            'last_name' => 'Ant',
            'phone' => '09172222002',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Webhook Property',
            'description' => 'Property for paymongo webhook tests',
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

        $invoice = Invoice::create([
            'reference' => 'INV-'.now()->format('Ymd').'-WEBHK',
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'tenant_id' => $tenant->id,
            'description' => 'Monthly rent invoice',
            'invoice_type' => 'rent',
            'amount_cents' => 100000,
            'currency' => 'PHP',
            'status' => $invoiceStatus,
            'issued_at' => now()->subDays(2),
            'due_date' => now()->addDays(3)->toDateString(),
            'paid_at' => $invoiceStatus === 'paid' ? now()->subDay() : null,
        ]);

        return [$landlord, $tenant, $room, $invoice];
    }

    private function buildLinkPaymentPaidPayload(int $roomId, int $tenantId, int $invoiceId, string $sourceType = 'gcash'): array
    {
        return [
            'data' => [
                'id' => 'evt_test_'.uniqid(),
                'type' => 'event',
                'attributes' => [
                    'type' => 'link.payment.paid',
                    'data' => [
                        'id' => 'pay_test_'.uniqid(),
                        'type' => 'payment',
                        'attributes' => [
                            'source' => [
                                'id' => 'src_test_'.uniqid(),
                                'type' => $sourceType,
                            ],
                            'metadata' => [
                                'room_id' => $roomId,
                                'tenant_id' => $tenantId,
                                'invoice_id' => $invoiceId,
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}
