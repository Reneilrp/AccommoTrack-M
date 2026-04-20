<?php

namespace Tests\Feature;

use App\Mail\EmailOtpMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TenantTwoFactorAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_can_enable_verify_and_disable_two_factor_from_settings(): void
    {
        Mail::fake();

        $tenant = $this->createTenant();

        Sanctum::actingAs($tenant);

        $sendResponse = $this->postJson('/api/tenant/security/two-factor/send-otp');

        $sendResponse
            ->assertOk()
            ->assertJsonPath('two_factor.enabled', false)
            ->assertJsonPath('two_factor.enrollment_pending', true)
            ->assertJsonPath('two_factor.verified_at', null);

        $otp = null;
        Mail::assertSent(EmailOtpMail::class, function (EmailOtpMail $mail) use (&$otp) {
            $otp = $mail->otp;

            return true;
        });

        $this->assertNotNull($otp);

        $verifyResponse = $this
            ->withHeader('X-Device-Fingerprint', 'tenant-device-1')
            ->postJson('/api/tenant/security/two-factor/verify-otp', [
                'email_otp_code' => $otp,
            ]);

        $verifyResponse
            ->assertOk()
            ->assertJsonPath('two_factor.enabled', true)
            ->assertJsonPath('two_factor.enrollment_pending', false);

        $tenant->refresh();
        $security = $tenant->preferences['security'] ?? [];

        $this->assertTrue((bool) ($security['twoFactorAuth'] ?? false));
        $this->assertNotEmpty($security['twoFactorVerifiedAt'] ?? null);
        $this->assertSame('tenant-device-1', $security['twoFactorLastDeviceFingerprint'] ?? null);

        $disableResponse = $this->postJson('/api/tenant/security/two-factor/disable');

        $disableResponse
            ->assertOk()
            ->assertJsonPath('two_factor.enabled', false)
            ->assertJsonPath('two_factor.enrollment_pending', false)
            ->assertJsonPath('two_factor.verified_at', null);

        $tenant->refresh();
        $security = $tenant->preferences['security'] ?? [];

        $this->assertFalse((bool) ($security['twoFactorAuth'] ?? false));
        $this->assertNull($security['twoFactorVerifiedAt'] ?? null);
        $this->assertNull($security['twoFactorLastDeviceFingerprint'] ?? null);
    }

    public function test_tenant_login_requires_two_factor_when_device_fingerprint_changes(): void
    {
        Mail::fake();

        $tenant = $this->createTenant([
            'twoFactorAuth' => true,
            'twoFactorVerifiedAt' => now()->subMinute()->toIso8601String(),
            'twoFactorLastIp' => '127.0.0.1',
            'twoFactorLastDeviceFingerprint' => 'trusted-device',
        ]);

        $this
            ->withHeader('X-Device-Fingerprint', 'trusted-device')
            ->postJson('/api/login', [
                'email' => $tenant->email,
                'password' => 'Password12!',
            ])
            ->assertOk();

        $challengeResponse = $this
            ->withHeader('X-Device-Fingerprint', 'new-device')
            ->postJson('/api/login', [
                'email' => $tenant->email,
                'password' => 'Password12!',
            ]);

        $challengeResponse
            ->assertStatus(403)
            ->assertJsonPath('status', 'pending_verification')
            ->assertJsonPath('requires_email_otp', true)
            ->assertJsonPath('otp_resent', true);

        Mail::assertSent(EmailOtpMail::class, 1);

        $tenant->refresh();
        $security = $tenant->preferences['security'] ?? [];

        $this->assertTrue((bool) ($security['twoFactorPendingLogin'] ?? false));
    }

    public function test_verify_email_otp_completes_tenant_two_factor_login_and_updates_trusted_context(): void
    {
        Mail::fake();

        $tenant = $this->createTenant([
            'twoFactorAuth' => true,
            'twoFactorVerifiedAt' => now()->subMinute()->toIso8601String(),
            'twoFactorLastIp' => '127.0.0.1',
            'twoFactorLastDeviceFingerprint' => 'trusted-device',
        ]);

        $this
            ->withHeader('X-Device-Fingerprint', 'temporary-device')
            ->postJson('/api/login', [
                'email' => $tenant->email,
                'password' => 'Password12!',
            ])
            ->assertStatus(403)
            ->assertJsonPath('status', 'pending_verification')
            ->assertJsonPath('requires_email_otp', true);

        $otp = null;
        Mail::assertSent(EmailOtpMail::class, function (EmailOtpMail $mail) use (&$otp) {
            $otp = $mail->otp;

            return true;
        });

        $this->assertNotNull($otp);

        $verifyResponse = $this
            ->withHeader('X-Device-Fingerprint', 'temporary-device')
            ->postJson('/api/verify-email-otp', [
                'email' => $tenant->email,
                'email_otp_code' => $otp,
            ]);

        $verifyResponse
            ->assertOk()
            ->assertJsonPath('user.email', $tenant->email)
            ->assertJsonPath('message', 'Two-factor verification successful. You are now logged in.');

        $tenant->refresh();
        $security = $tenant->preferences['security'] ?? [];

        $this->assertFalse((bool) ($security['twoFactorPendingLogin'] ?? false));
        $this->assertSame('temporary-device', $security['twoFactorLastDeviceFingerprint'] ?? null);
        $this->assertNull($tenant->email_otp_code);
        $this->assertNull($tenant->email_otp_expires_at);
    }

    private function createTenant(array $securityOverrides = []): User
    {
        $security = array_merge([
            'twoFactorAuth' => false,
            'twoFactorVerifiedAt' => null,
            'twoFactorEnrollmentPending' => false,
            'twoFactorPendingLogin' => false,
            'twoFactorLastIp' => null,
            'twoFactorLastDeviceFingerprint' => null,
            'twoFactorLastVerifiedAt' => null,
            'loginAlerts' => true,
            'emailRecoveryEnabled' => false,
            'emailRecoveryVerifiedAt' => null,
        ], $securityOverrides);

        return User::create([
            'role' => 'tenant',
            'email' => 'tenant-2fa-'.uniqid().'@example.com',
            'password' => Hash::make('Password12!'),
            'first_name' => 'Tenant',
            'middle_name' => null,
            'last_name' => 'TwoFactor',
            'phone' => '09171234567',
            'is_verified' => true,
            'is_active' => true,
            'preferences' => [
                'security' => $security,
            ],
        ]);
    }
}
