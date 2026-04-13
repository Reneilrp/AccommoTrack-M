<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use App\Notifications\NewPaymentReceived;
use App\Notifications\RentPaidSuccess;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

    public function test_duplicate_link_payment_paid_webhook_is_idempotent_for_transaction_and_notifications(): void
    {
        [$landlord, $tenant, $room, $invoice] = $this->createScenario('pending');

        $tx = PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending',
            'method' => 'paymongo_qrph',
            'gateway_reference' => 'lnk_test_'.uniqid(),
        ]);

        config(['services.paymongo.webhook_secret' => 'test-secret']);
        Notification::fake();

        $payload = $this->buildLinkPaymentPaidPayload($room->id, $tenant->id, $invoice->id, 'gcash', $tx->id);
        $signature = hash_hmac('sha256', json_encode($payload), 'test-secret');

        $this->postJson('/api/payments/webhook/paymongo', $payload, [
            'Paymongo-Signature' => $signature,
        ])->assertStatus(200);

        $this->postJson('/api/payments/webhook/paymongo', $payload, [
            'Paymongo-Signature' => $signature,
        ])
            ->assertStatus(200)
            ->assertJsonPath('duplicate', true);

        $tx->refresh();
        $invoice->refresh();

        $this->assertSame('succeeded', $tx->status);
        $this->assertSame('paid', $invoice->status);

        Notification::assertSentToTimes($tenant, RentPaidSuccess::class, 1);
        Notification::assertSentToTimes($landlord, NewPaymentReceived::class, 1);
    }

    public function test_provider_event_id_unique_constraint_blocks_duplicate_event_claims(): void
    {
        [, $tenant, , $invoice] = $this->createScenario('pending');

        $eventId = 'evt_unique_'.uniqid();

        PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'succeeded',
            'method' => 'paymongo_qrph',
            'gateway_reference' => 'pay_existing_'.uniqid(),
            'provider_event_id' => $eventId,
        ]);

        $candidate = PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending',
            'method' => 'paymongo_qrph',
            'gateway_reference' => 'pay_candidate_'.uniqid(),
        ]);

        $this->expectException(UniqueConstraintViolationException::class);

        $candidate->provider_event_id = $eventId;
        $candidate->save();
    }

    public function test_webhook_unique_constraint_race_is_acknowledged_as_duplicate(): void
    {
        [, $tenant, , $invoice] = $this->createScenario('pending');

        $sourceId = 'src_race_'.uniqid();

        PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending',
            'method' => 'paymongo_qrph',
            'gateway_reference' => $sourceId,
        ]);

        config(['services.paymongo.webhook_secret' => 'test-secret']);

        $payload = $this->buildSourceChargeablePayload($sourceId);
        $signature = hash_hmac('sha256', json_encode($payload), 'test-secret');

        DB::partialMock()
            ->shouldReceive('transaction')
            ->once()
            ->andThrow(new UniqueConstraintViolationException(
                'mysql',
                'update `payment_transactions` set `provider_event_id` = ?',
                ['evt_race'],
                new \Exception('Duplicate entry'),
            ));

        $this->postJson('/api/payments/webhook/paymongo', $payload, [
            'Paymongo-Signature' => $signature,
        ])
            ->assertStatus(200)
            ->assertJsonPath('received', true)
            ->assertJsonPath('duplicate', true);
    }

    public function test_link_and_payment_paid_events_with_same_external_payment_do_not_double_settle(): void
    {
        [$landlord, $tenant, $room, $invoice] = $this->createScenario('pending');

        $externalPaymentId = 'pay_ext_'.uniqid();
        $sourceId = 'src_ext_'.uniqid();

        $tx = PaymentTransaction::create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $tenant->id,
            'amount_cents' => 100000,
            'currency' => 'PHP',
            'status' => 'pending',
            'method' => 'paymongo_qrph',
            'gateway_reference' => $sourceId,
        ]);

        config(['services.paymongo.webhook_secret' => 'test-secret']);
        Notification::fake();

        $linkPayload = $this->buildLinkPaymentPaidPayload($room->id, $tenant->id, $invoice->id, 'gcash', $tx->id);
        $linkPayload['data']['attributes']['data']['id'] = $externalPaymentId;
        $linkPayload['data']['attributes']['data']['attributes']['source']['id'] = $sourceId;

        $linkSignature = hash_hmac('sha256', json_encode($linkPayload), 'test-secret');
        $this->postJson('/api/payments/webhook/paymongo', $linkPayload, [
            'Paymongo-Signature' => $linkSignature,
        ])->assertStatus(200);

        $paymentPayload = $this->buildPaymentPaidPayload($externalPaymentId, $sourceId);
        $paymentSignature = hash_hmac('sha256', json_encode($paymentPayload), 'test-secret');
        $this->postJson('/api/payments/webhook/paymongo', $paymentPayload, [
            'Paymongo-Signature' => $paymentSignature,
        ])->assertStatus(200);

        $tx->refresh();
        $invoice->refresh();

        $this->assertSame('succeeded', $tx->status);
        $this->assertSame($externalPaymentId, $tx->gateway_reference);
        $this->assertSame('paid', $invoice->status);

        $settledCount = PaymentTransaction::query()
            ->where('invoice_id', $invoice->id)
            ->whereIn('status', ['succeeded', 'paid', 'partially_refunded', 'refunded'])
            ->count();

        $this->assertSame(1, $settledCount);

        Notification::assertSentToTimes($tenant, RentPaidSuccess::class, 1);
        Notification::assertSentToTimes($landlord, NewPaymentReceived::class, 1);
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

    private function buildLinkPaymentPaidPayload(int $roomId, int $tenantId, int $invoiceId, string $sourceType = 'gcash', ?int $paymentTransactionId = null): array
    {
        $metadata = [
            'room_id' => $roomId,
            'tenant_id' => $tenantId,
            'invoice_id' => $invoiceId,
        ];

        if ($paymentTransactionId) {
            $metadata['payment_transaction_id'] = $paymentTransactionId;
        }

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
                            'metadata' => $metadata,
                        ],
                    ],
                ],
            ],
        ];
    }

    private function buildPaymentPaidPayload(string $paymentId, string $sourceId): array
    {
        return [
            'data' => [
                'id' => 'evt_test_'.uniqid(),
                'type' => 'event',
                'attributes' => [
                    'type' => 'payment.paid',
                    'data' => [
                        'id' => $paymentId,
                        'type' => 'payment',
                        'attributes' => [
                            'source' => [
                                'id' => $sourceId,
                                'type' => 'source',
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    private function buildSourceChargeablePayload(string $sourceId): array
    {
        return [
            'data' => [
                'id' => 'evt_race_'.uniqid(),
                'type' => 'event',
                'attributes' => [
                    'type' => 'source.chargeable',
                    'data' => [
                        'id' => $sourceId,
                        'type' => 'source',
                        'attributes' => [
                            'status' => 'chargeable',
                        ],
                    ],
                ],
            ],
        ];
    }
}
