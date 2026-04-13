<?php

namespace Tests\Feature;

use App\Mail\EmailOtpMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LandlordEmailRecoveryForgotPasswordGateTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_cannot_access_landlord_security_email_recovery_endpoints(): void
    {
        $tenant = User::create([
            'role' => 'tenant',
            'email' => 'tenant-security-otp@example.com',
            'password' => Hash::make('Password12!'),
            'first_name' => 'Tenant',
            'middle_name' => null,
            'last_name' => 'User',
            'phone' => '09171234567',
            'is_verified' => true,
            'is_active' => true,
        ]);

        Sanctum::actingAs($tenant);

        $this->postJson('/api/landlord/security/email-recovery/send-otp')->assertStatus(403);
        $this->postJson('/api/landlord/security/email-recovery/verify-otp', [
            'email_otp_code' => '123456',
        ])->assertStatus(403);
        $this->postJson('/api/landlord/security/email-recovery/disable')->assertStatus(403);
    }

    public function test_landlord_forgot_password_is_blocked_when_security_recovery_not_verified(): void
    {
        $landlord = $this->createLandlord([
            'emailRecoveryEnabled' => false,
            'emailRecoveryVerifiedAt' => null,
        ]);

        $response = $this->postJson('/api/forgot-password', [
            'email' => $landlord->email,
        ]);

        $response
            ->assertStatus(403)
            ->assertJsonPath('message', 'Password reset for landlord accounts is available only after enabling and verifying Email Recovery in Settings > Security.');
    }

    public function test_landlord_forgot_password_is_allowed_after_security_recovery_verification(): void
    {
        Mail::fake();

        $landlord = $this->createLandlord([
            'emailRecoveryEnabled' => true,
            'emailRecoveryVerifiedAt' => now()->subMinute()->toIso8601String(),
        ]);

        $response = $this->postJson('/api/forgot-password', [
            'email' => $landlord->email,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'If your email is registered, a reset code has been sent.');

        $this->assertDatabaseHas('password_reset_codes', [
            'email' => $landlord->email,
        ]);
    }

    public function test_landlord_can_enable_and_verify_email_recovery_only_from_authenticated_settings_endpoint(): void
    {
        Mail::fake();

        $landlord = $this->createLandlord();

        Sanctum::actingAs($landlord);

        $sendResponse = $this->postJson('/api/landlord/security/email-recovery/send-otp');

        $sendResponse
            ->assertOk()
            ->assertJsonPath('email_recovery.enabled', true)
            ->assertJsonPath('email_recovery.verified_at', null);

        $otp = null;
        Mail::assertSent(EmailOtpMail::class, function (EmailOtpMail $mail) use (&$otp) {
            $otp = $mail->otp;

            return true;
        });

        $this->assertNotNull($otp);

        $verifyResponse = $this->postJson('/api/landlord/security/email-recovery/verify-otp', [
            'email_otp_code' => $otp,
        ]);

        $verifyResponse
            ->assertOk()
            ->assertJsonPath('email_recovery.enabled', true);

        $landlord->refresh();

        $this->assertNull($landlord->email_otp_code);
        $this->assertNull($landlord->email_otp_expires_at);

        $security = $landlord->preferences['security'] ?? [];
        $this->assertTrue((bool) ($security['emailRecoveryEnabled'] ?? false));
        $this->assertNotEmpty($security['emailRecoveryVerifiedAt'] ?? null);
    }

    public function test_disabling_landlord_email_recovery_blocks_forgot_password_again(): void
    {
        Mail::fake();

        $landlord = $this->createLandlord();

        Sanctum::actingAs($landlord);

        $sendResponse = $this->postJson('/api/landlord/security/email-recovery/send-otp');
        $sendResponse->assertOk();

        $otp = null;
        Mail::assertSent(EmailOtpMail::class, function (EmailOtpMail $mail) use (&$otp) {
            $otp = $mail->otp;

            return true;
        });

        $this->assertNotNull($otp);

        $this->postJson('/api/landlord/security/email-recovery/verify-otp', [
            'email_otp_code' => $otp,
        ])->assertOk();

        $this->postJson('/api/landlord/security/email-recovery/disable')
            ->assertOk()
            ->assertJsonPath('email_recovery.enabled', false)
            ->assertJsonPath('email_recovery.verified_at', null);

        $forgotResponse = $this->postJson('/api/forgot-password', [
            'email' => $landlord->email,
        ]);

        $forgotResponse
            ->assertStatus(403)
            ->assertJsonPath('message', 'Password reset for landlord accounts is available only after enabling and verifying Email Recovery in Settings > Security.');
    }

    private function createLandlord(array $securityOverrides = []): User
    {
        $security = array_merge([
            'twoFactorAuth' => false,
            'loginAlerts' => true,
            'emailRecoveryEnabled' => false,
            'emailRecoveryVerifiedAt' => null,
        ], $securityOverrides);

        return User::create([
            'role' => 'landlord',
            'email' => 'landlord-recovery-'.uniqid().'@example.com',
            'password' => Hash::make('Password12!'),
            'first_name' => 'Landlord',
            'middle_name' => null,
            'last_name' => 'Recovery',
            'phone' => '09171234567',
            'is_verified' => true,
            'is_active' => true,
            'preferences' => [
                'security' => $security,
            ],
        ]);
    }
}
