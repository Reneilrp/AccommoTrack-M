<?php

namespace Tests\Feature;

use App\Mail\EmailOtpMail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RegisterOtpFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_and_verify_email_otp_successfully(): void
    {
        Mail::fake();

        $registerResponse = $this->postJson('/api/register', [
            'first_name' => 'Otp',
            'middle_name' => null,
            'last_name' => 'User',
            'email' => 'otp-register@example.com',
            'password' => 'Password12!',
            'password_confirmation' => 'Password12!',
            'role' => 'tenant',
            'phone' => '09171234567',
            'date_of_birth' => now()->subYears(22)->toDateString(),
            'gender' => 'male',
            'agree_to_terms' => true,
            'terms_version' => 'v2.0',
            'privacy_version' => 'v2.0',
            'consent_platform' => 'web',
        ]);

        $registerResponse
            ->assertStatus(201)
            ->assertJsonPath('otp_delivery', 'sent');

        $user = User::where('email', 'otp-register@example.com')->first();
        $this->assertNotNull($user);
        $this->assertFalse((bool) $user->is_verified);
        $this->assertNotNull($user->email_otp_code);

        $otp = null;
        Mail::assertSent(EmailOtpMail::class, function (EmailOtpMail $mail) use (&$otp) {
            $otp = $mail->otp;

            return true;
        });

        $this->assertNotNull($otp);

        $verifyResponse = $this->postJson('/api/verify-email-otp', [
            'email' => 'otp-register@example.com',
            'email_otp_code' => $otp,
        ]);

        $verifyResponse
            ->assertOk()
            ->assertJsonPath('user.email', 'otp-register@example.com');

        $user->refresh();
        $this->assertTrue((bool) $user->is_verified);
        $this->assertNull($user->email_otp_code);
        $this->assertNull($user->email_otp_expires_at);
    }

    public function test_unverified_tenant_login_resends_otp_after_cooldown_window(): void
    {
        Mail::fake();

        $user = $this->createUnverifiedTenant([
            'email' => 'otp-cooldown-elapsed@example.com',
            'email_otp_expires_at' => Carbon::now()->subMinute(),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'Password12!',
        ]);

        $response
            ->assertStatus(403)
            ->assertJsonPath('status', 'pending_verification')
            ->assertJsonPath('requires_email_otp', true)
            ->assertJsonPath('otp_resent', true);

        Mail::assertSent(EmailOtpMail::class, 1);

        $user->refresh();
        $this->assertNotNull($user->email_otp_expires_at);
        $this->assertTrue(Carbon::parse($user->email_otp_expires_at)->greaterThan(Carbon::now()->addMinutes(14)));
    }

    public function test_unverified_tenant_login_enforces_resend_cooldown_without_resending(): void
    {
        Mail::fake();

        $user = $this->createUnverifiedTenant([
            'email' => 'otp-cooldown-active@example.com',
            'email_otp_expires_at' => Carbon::now()->addMinutes(15)->subSeconds(20),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'Password12!',
        ]);

        $response
            ->assertStatus(403)
            ->assertJsonPath('status', 'pending_verification')
            ->assertJsonPath('requires_email_otp', true)
            ->assertJsonPath('otp_resent', false);

        $retryAfterSeconds = (int) $response->json('retry_after_seconds');
        $this->assertGreaterThan(0, $retryAfterSeconds);
        $this->assertLessThanOrEqual(60, $retryAfterSeconds);

        Mail::assertNothingSent();
    }

    private function createUnverifiedTenant(array $overrides = []): User
    {
        return User::create(array_merge([
            'role' => 'tenant',
            'email' => 'tenant-otp-'.uniqid().'@example.com',
            'password' => Hash::make('Password12!'),
            'first_name' => 'Tenant',
            'middle_name' => null,
            'last_name' => 'Otp',
            'phone' => '09171234567',
            'is_verified' => false,
            'is_active' => true,
            'email_otp_code' => Hash::make('123456'),
            'email_otp_expires_at' => Carbon::now()->addMinutes(15)->subSeconds(10),
        ], $overrides));
    }
}
