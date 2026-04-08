<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
use App\Mail\EmailOtpMail;
use App\Models\TenantClaimCode;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ClaimAccountController extends Controller
{
    private const CHALLENGE_TTL_MINUTES = 20;
    private const OTP_TTL_MINUTES = 15;
    private const OTP_RESEND_COOLDOWN_SECONDS = 60;

    public function verifyCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'claim_code' => ['required', 'string', 'regex:/^\d{8}$/'],
            'last_name' => 'required|string|max:255',
            'date_of_birth' => 'required|date',
        ]);

        $claimCode = trim((string) $validated['claim_code']);
        $codeHash = $this->hashClaimCode($claimCode);

        /** @var TenantClaimCode|null $claim */
        $claim = TenantClaimCode::active()
            ->where('code_hash', $codeHash)
            ->latest('id')
            ->first();

        if (! $claim) {
            return $this->errorResponse('Invalid or expired claim code.');
        }

        if ($claim->attempts >= $claim->max_attempts) {
            $claim->forceFill(['revoked_at' => now()])->save();

            return $this->errorResponse(
                'Claim code has been locked due to multiple failed attempts. Please ask your landlord to generate a new code.',
                [],
                429
            );
        }

        $tenant = $claim->tenant;

        if (! $tenant || $tenant->role !== 'tenant') {
            $claim->forceFill(['revoked_at' => now()])->save();

            return $this->errorResponse('This claim code is no longer valid.');
        }

        if (! $tenant->date_of_birth) {
            return $this->errorResponse('Tenant birth date is not configured yet. Please ask your landlord to update your profile first.');
        }

        $providedLastName = Str::lower(trim((string) $validated['last_name']));
        $storedLastName = Str::lower(trim((string) $tenant->last_name));
        $providedDob = Carbon::parse($validated['date_of_birth'])->toDateString();
        $storedDob = Carbon::parse($tenant->date_of_birth)->toDateString();

        if ($providedLastName !== $storedLastName || $providedDob !== $storedDob) {
            $attempts = (int) $claim->attempts + 1;
            $payload = ['attempts' => $attempts];
            if ($attempts >= (int) $claim->max_attempts) {
                $payload['revoked_at'] = now();
            }
            $claim->forceFill($payload)->save();

            return $this->errorResponse(
                $attempts >= (int) $claim->max_attempts
                    ? 'Claim code locked due to multiple failed attempts. Please request a new code from your landlord.'
                    : 'Claim details did not match our records.'
            );
        }

        $challengeToken = (string) Str::uuid();

        $claim->forceFill([
            'challenge_token' => $challengeToken,
            'challenge_verified_at' => now(),
            'challenge_expires_at' => now()->addMinutes(self::CHALLENGE_TTL_MINUTES),
            'attempts' => 0,
        ])->save();

        return $this->successResponse([
            'challenge_token' => $challengeToken,
            'challenge_expires_at' => optional($claim->challenge_expires_at)->toISOString(),
            'tenant' => [
                'first_name' => $tenant->first_name,
                'last_name' => $tenant->last_name,
            ],
        ], 'Claim code verified. Continue setting your account credentials.');
    }

    public function sendOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challenge_token' => 'required|uuid',
            'email' => 'required|email:rfc|max:255|unique:users,email',
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/(.*[0-9]){2,}/',
                'regex:{[!@#$%^&*(),.?":{}|<>\[\]\\\/~`_+=;\'\-]}',
            ],
        ]);

        /** @var TenantClaimCode|null $claim */
        $claim = TenantClaimCode::active()
            ->where('challenge_token', $validated['challenge_token'])
            ->latest('id')
            ->first();

        if (! $claim) {
            return $this->errorResponse('Claim session is invalid or expired. Please verify your claim code again.');
        }

        if (! $claim->challenge_expires_at || now()->gt($claim->challenge_expires_at)) {
            return $this->errorResponse('Claim session expired. Please verify your claim code again.');
        }

        $tenant = $claim->tenant;
        if (! $tenant || $tenant->role !== 'tenant') {
            return $this->errorResponse('This claim is no longer valid.');
        }

        $email = Str::lower(trim((string) $validated['email']));
        $otp = (string) random_int(100000, 999999);

        $claim->forceFill([
            'pending_email' => $email,
            'pending_password' => Hash::make($validated['password']),
            'otp_hash' => Hash::make($otp),
            'otp_expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
            'otp_sent_at' => now(),
            'attempts' => 0,
        ])->save();

        try {
            Mail::to($email)->send(new EmailOtpMail($otp));
        } catch (\Throwable $e) {
            return $this->errorResponse('Failed to send OTP. Please try again.', [], 500);
        }

        return $this->successResponse([
            'retry_after_seconds' => self::OTP_RESEND_COOLDOWN_SECONDS,
        ], 'OTP sent successfully. Please check your email.');
    }

    public function resendOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challenge_token' => 'required|uuid',
        ]);

        /** @var TenantClaimCode|null $claim */
        $claim = TenantClaimCode::active()
            ->where('challenge_token', $validated['challenge_token'])
            ->latest('id')
            ->first();

        if (! $claim) {
            return $this->errorResponse('Claim session is invalid or expired. Please verify your claim code again.');
        }

        if (! $claim->challenge_expires_at || now()->gt($claim->challenge_expires_at)) {
            return $this->errorResponse('Claim session expired. Please verify your claim code again.');
        }

        if (! $claim->pending_email || ! $claim->pending_password) {
            return $this->errorResponse('Please set your email and password first.');
        }

        if ($claim->otp_sent_at) {
            $secondsSinceLastSend = now()->diffInSeconds($claim->otp_sent_at);
            if ($secondsSinceLastSend < self::OTP_RESEND_COOLDOWN_SECONDS) {
                return $this->errorResponse(
                    'Please wait before requesting another OTP.',
                    ['retry_after_seconds' => self::OTP_RESEND_COOLDOWN_SECONDS - $secondsSinceLastSend],
                    429
                );
            }
        }

        $otp = (string) random_int(100000, 999999);

        $claim->forceFill([
            'otp_hash' => Hash::make($otp),
            'otp_expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
            'otp_sent_at' => now(),
        ])->save();

        try {
            Mail::to($claim->pending_email)->send(new EmailOtpMail($otp));
        } catch (\Throwable $e) {
            return $this->errorResponse('Failed to resend OTP. Please try again.', [], 500);
        }

        return $this->successResponse([
            'retry_after_seconds' => self::OTP_RESEND_COOLDOWN_SECONDS,
        ], 'A new OTP has been sent to your email.');
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challenge_token' => 'required|uuid',
            'otp' => 'required|digits:6',
        ]);

        /** @var TenantClaimCode|null $claim */
        $claim = TenantClaimCode::active()
            ->where('challenge_token', $validated['challenge_token'])
            ->latest('id')
            ->first();

        if (! $claim) {
            return $this->errorResponse('Claim session is invalid or expired. Please verify your claim code again.');
        }

        if (! $claim->challenge_expires_at || now()->gt($claim->challenge_expires_at)) {
            return $this->errorResponse('Claim session expired. Please verify your claim code again.');
        }

        if (! $claim->otp_hash || ! $claim->otp_expires_at) {
            return $this->errorResponse('OTP has not been sent yet. Please request an OTP first.');
        }

        if (now()->gt($claim->otp_expires_at)) {
            return $this->errorResponse('OTP has expired. Please request a new one.');
        }

        if (! Hash::check((string) $validated['otp'], $claim->otp_hash)) {
            $attempts = (int) $claim->attempts + 1;
            $payload = ['attempts' => $attempts];
            if ($attempts >= (int) $claim->max_attempts) {
                $payload['revoked_at'] = now();
            }

            $claim->forceFill($payload)->save();

            return $this->errorResponse(
                $attempts >= (int) $claim->max_attempts
                    ? 'Claim locked due to multiple invalid OTP attempts. Please request a new claim code.'
                    : 'Invalid OTP code.'
            );
        }

        if (! $claim->pending_email || ! $claim->pending_password) {
            return $this->errorResponse('Missing pending account credentials. Please restart the claim flow.');
        }

        try {
            DB::transaction(function () use ($claim) {
                /** @var TenantClaimCode $freshClaim */
                $freshClaim = TenantClaimCode::lockForUpdate()->findOrFail($claim->id);

                if ($freshClaim->used_at || $freshClaim->revoked_at) {
                    throw new \RuntimeException('Claim session already completed.');
                }

                /** @var User $tenant */
                $tenant = User::lockForUpdate()->findOrFail($freshClaim->tenant_id);

                $emailInUse = User::where('email', $freshClaim->pending_email)
                    ->where('id', '!=', $tenant->id)
                    ->exists();

                if ($emailInUse) {
                    throw new \RuntimeException('This email is already in use. Please use a different email address.');
                }

                $tenant->forceFill([
                    'email' => $freshClaim->pending_email,
                    'password' => $freshClaim->pending_password,
                    'is_verified' => true,
                    'email_verified_at' => now(),
                    'email_otp_code' => null,
                    'email_otp_expires_at' => null,
                ])->save();

                $freshClaim->forceFill([
                    'used_at' => now(),
                    'challenge_token' => null,
                    'challenge_expires_at' => null,
                    'otp_hash' => null,
                    'otp_expires_at' => null,
                    'otp_sent_at' => null,
                    'pending_password' => null,
                    'attempts' => 0,
                ])->save();
            });
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage());
        } catch (\Throwable $e) {
            return $this->errorResponse('Failed to complete account claim. Please try again.', [], 500);
        }

        return $this->successResponse([], 'Account claimed successfully. You can now sign in with your new credentials.');
    }

    private function successResponse(array $data = [], string $message = '', int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => $message,
        ], $status);
    }

    private function errorResponse(string $message, array $errors = [], int $status = 422): JsonResponse
    {
        return response()->json([
            'success' => false,
            'errors' => $errors,
            'message' => $message,
        ], $status);
    }

    private function hashClaimCode(string $claimCode): string
    {
        return hash_hmac('sha256', $claimCode, (string) config('app.key'));
    }
}
