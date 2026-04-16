<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\SystemToggle;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SystemTimeOverrideTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_set_and_clear_forced_system_time(): void
    {
        $admin = $this->createUser('admin');
        Sanctum::actingAs($admin);

        // 1. Set forced time
        $forcedTime = '2025-12-25 10:00:00';
        $response = $this->putJson('/api/admin/settings/payment-controls', [
            'tenant_payments_disabled' => false,
            'reservation_fee_disabled' => false,
            'system_forced_now' => $forcedTime,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.system_forced_now', $forcedTime);

        $this->assertEquals($forcedTime, SystemToggle::getString('system_forced_now'));

        // 2. Clear forced time
        $response = $this->putJson('/api/admin/settings/payment-controls', [
            'tenant_payments_disabled' => false,
            'reservation_fee_disabled' => false,
            'system_forced_now' => '',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.system_forced_now', '');

        $this->assertEquals('', SystemToggle::getString('system_forced_now'));
    }

    public function test_middleware_overrides_system_time_when_forced(): void
    {
        $tenant = $this->createUser('tenant');
        Sanctum::actingAs($tenant);

        // Set a forced time in the future
        $forcedTime = '2030-01-01 12:00:00';
        SystemToggle::setString('system_forced_now', $forcedTime);

        $response = $this->getJson('/api/me');

        $response->assertOk();
    }

    public function test_middleware_logic_sets_carbon_test_now(): void
    {
        $forcedTime = '2028-05-20 15:30:00';
        SystemToggle::setString('system_forced_now', $forcedTime);

        $middleware = new \App\Http\Middleware\HandleSystemTimeOverride;
        $request = new \Illuminate\Http\Request;

        $middleware->handle($request, function ($req) use ($forcedTime) {
            $this->assertEquals(
                Carbon::parse($forcedTime)->toDateTimeString(),
                Carbon::now()->toDateTimeString()
            );

            return new \Symfony\Component\HttpFoundation\Response;
        });

        // Clean up
        Carbon::setTestNow();
    }

    private function createUser(string $role): User
    {
        $suffix = uniqid();

        return User::create([
            'role' => $role,
            'email' => "{$role}-time-test-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => ucfirst($role),
            'last_name' => 'Tester',
            'phone' => '09170001234',
            'is_verified' => true,
            'is_active' => true,
        ]);
    }
}
