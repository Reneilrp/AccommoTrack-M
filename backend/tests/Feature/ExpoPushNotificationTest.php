<?php

namespace Tests\Feature;

use App\Jobs\SendPushNotificationJob;
use App\Models\DevicePushToken;
use App\Models\User;
use App\Services\ExpoPushNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ExpoPushNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected ExpoPushNotificationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(ExpoPushNotificationService::class);
    }

    private function createUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test-' . uniqid() . '@example.com',
            'password' => Hash::make('password'),
            'role' => 'tenant',
            'phone' => '09123456789',
            'is_verified' => true,
            'is_active' => true,
            'notification_preferences' => ['push' => true],
        ], $overrides));
    }

    public function test_send_to_user_dispatches_job(): void
    {
        Queue::fake();
        $user = $this->createUser(['notification_preferences' => ['push' => true]]);
        $payload = ['title' => 'Test Title', 'message' => 'Test Body'];

        $this->service->sendToUser($user, $payload);

        Queue::assertPushed(SendPushNotificationJob::class, function ($job) use ($user, $payload) {
            return $job->user->id === $user->id && $job->payload === $payload;
        });
    }

    public function test_send_to_user_skips_when_disabled(): void
    {
        Queue::fake();
        $user = $this->createUser(['notification_preferences' => ['push' => false]]);
        $payload = ['title' => 'Test Title', 'message' => 'Test Body'];

        $this->service->sendToUser($user, $payload);

        Queue::assertNotPushed(SendPushNotificationJob::class);
    }

    public function test_send_to_user_now_sends_http_request(): void
    {
        Http::fake([
            'exp.host/*' => Http::response(['data' => [['status' => 'ok']]], 200),
        ]);

        $user = $this->createUser();
        DevicePushToken::create([
            'user_id' => $user->id,
            'token' => 'ExponentPushToken[12345]',
            'is_active' => true,
        ]);

        $payload = ['title' => 'Hello', 'message' => 'World', 'data' => ['key' => 'value']];

        $this->service->sendToUserNow($user, $payload);

        Http::assertSent(function ($request) {
            $data = $request->data();
            return $request->url() === 'https://exp.host/--/api/v2/push/send' &&
                   $data[0]['to'] === 'ExponentPushToken[12345]' &&
                   $data[0]['title'] === 'Hello' &&
                   $data[0]['body'] === 'World' &&
                   $data[0]['data'] === ['key' => 'value'];
        });
    }

    public function test_deactivates_token_on_device_not_registered_error(): void
    {
        Http::fake([
            'exp.host/*' => Http::response([
                'data' => [
                    [
                        'status' => 'error',
                        'message' => '"ExponentPushToken[expired]" is not a registered push notification recipient',
                        'details' => ['error' => 'DeviceNotRegistered']
                    ]
                ]
            ], 200),
        ]);

        $user = $this->createUser();
        $token = DevicePushToken::create([
            'user_id' => $user->id,
            'token' => 'ExponentPushToken[expired]',
            'is_active' => true,
        ]);

        $this->service->sendToUserNow($user, ['title' => 'Test', 'message' => 'Test']);

        $token->refresh();
        $this->assertFalse($token->is_active);
    }

    public function test_job_calls_service_method(): void
    {
        $user = $this->createUser();
        $payload = ['title' => 'Job Test', 'message' => 'Body Test'];

        // We mock the service and expect sendToUserNow to be called
        $mockService = $this->mock(ExpoPushNotificationService::class);
        $mockService->shouldReceive('sendToUserNow')
            ->once()
            ->with($user, $payload);

        $job = new SendPushNotificationJob($user, $payload);
        $job->handle($mockService);
    }
}
