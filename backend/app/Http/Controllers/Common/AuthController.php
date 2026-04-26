<?php

namespace App\Http\Controllers\Common;

use App\Exceptions\AccountBlockedException;
use App\Exceptions\PendingVerificationException;
use App\Http\Controllers\Controller;
use App\Mail\EmailOtpMail;
use App\Models\LandlordVerification;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\AuthService;
use App\Services\LegalConsentService;
use App\Services\UserCounterService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    private const ACCESS_TOKEN_NAME = 'access_token';

    private const REFRESH_TOKEN_NAME = 'refresh_token';

    private const REFRESH_TOKEN_ABILITY = 'token:refresh';

    private const LANDLORD_EMAIL_RECOVERY_OTP_TTL_MINUTES = 10;

    private const TENANT_TWO_FACTOR_OTP_TTL_MINUTES = 10;

    private const DEVICE_FINGERPRINT_HEADER = 'X-Device-Fingerprint';

    protected AuthService $authService;

    protected LegalConsentService $legalConsentService;

    protected AuditLogService $auditLogService;

    protected UserCounterService $counterService;

    public function __construct(
        AuthService $authService,
        LegalConsentService $legalConsentService,
        AuditLogService $auditLogService,
        UserCounterService $counterService
    ) {
        $this->authService = $authService;
        $this->legalConsentService = $legalConsentService;
        $this->auditLogService = $auditLogService;
        $this->counterService = $counterService;
    }

    /**
     * Get unread/pending counts across all modules.
     */
    public function getCounters(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
            }

            return response()->json([
                'success' => true,
                'data' => $this->counterService->getCounters($user)
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch counters', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Failed to load counters'], 500);
        }
    }

    protected function webCookieModeAllowedForEnvironment(): bool
    {
        if (app()->environment('production')) {
            return true;
        }

        return filter_var(env('AUTH_WEB_COOKIE_MODE_ALLOW_NON_PROD', false), FILTER_VALIDATE_BOOL);
    }

    protected function webCookieModeRequested(Request $request): bool
    {
        if (! $this->webCookieModeAllowedForEnvironment()) {
            return false;
        }

        $cookieModeEnabled = filter_var(
            env('AUTH_WEB_COOKIE_MODE', app()->environment('production')),
            FILTER_VALIDATE_BOOL
        );

        if (! $cookieModeEnabled) {
            return false;
        }

        return strtolower((string) $request->header('X-Client-Platform', '')) === 'web';
    }

    protected function shouldUseWebCookieAuth(Request $request): bool
    {
        return $this->webCookieModeRequested($request)
            && (bool) $request->attributes->get('sanctum')
            && $request->hasSession();
    }

    protected function shouldEnforceStrictWebCookieMode(): bool
    {
        return filter_var(env('AUTH_WEB_COOKIE_STRICT_MODE', false), FILTER_VALIDATE_BOOL);
    }

    protected function isTrustedDeviceRequest(Request $request): bool
    {
        $headerValue = $request->header('X-Device-Trusted');

        if ($headerValue === null) {
            return false;
        }

        return filter_var($headerValue, FILTER_VALIDATE_BOOL);
    }

    protected function getDeviceFingerprintFromRequest(Request $request): ?string
    {
        $fingerprint = trim((string) $request->header(self::DEVICE_FINGERPRINT_HEADER, ''));

        if ($fingerprint === '') {
            return null;
        }

        return substr($fingerprint, 0, 120);
    }

    protected function shouldRequireTenantTwoFactorChallenge(Request $request, User $user): bool
    {
        if ($user->role !== 'tenant') {
            return false;
        }

        $securityPreferences = $this->getNormalizedSecurityPreferences($user);
        $isTwoFactorEnabled = (bool) $securityPreferences['twoFactorAuth'];
        $isTwoFactorVerified = ! empty($securityPreferences['twoFactorVerifiedAt']);

        if (! $isTwoFactorEnabled || ! $isTwoFactorVerified) {
            return false;
        }

        $storedIp = $securityPreferences['twoFactorLastIp'] ?: null;
        $storedDeviceFingerprint = $securityPreferences['twoFactorLastDeviceFingerprint'] ?: null;

        $currentIp = (string) $request->ip();
        $currentDeviceFingerprint = $this->getDeviceFingerprintFromRequest($request);

        // If there is no trusted context yet, force an OTP challenge once.
        if (! $storedIp && ! $storedDeviceFingerprint) {
            return true;
        }

        if ($storedIp && $currentIp && $storedIp !== $currentIp) {
            return true;
        }

        if ($storedDeviceFingerprint && ! $currentDeviceFingerprint) {
            return true;
        }

        if ($storedDeviceFingerprint && $currentDeviceFingerprint && ! hash_equals($storedDeviceFingerprint, $currentDeviceFingerprint)) {
            return true;
        }

        return false;
    }

    protected function sendTenantTwoFactorLoginChallengeOtp(Request $request, User $user): bool
    {
        $otp = (string) random_int(100000, 999999);

        $preferences = is_array($user->preferences) ? $user->preferences : [];
        $securityPreferences = $this->getNormalizedSecurityPreferences($user);

        $securityPreferences['twoFactorPendingLogin'] = true;
        $securityPreferences['twoFactorEnrollmentPending'] = false;

        $preferences['security'] = $securityPreferences;

        $user->forceFill([
            'email_otp_code' => Hash::make($otp),
            'email_otp_expires_at' => Carbon::now()->addMinutes(self::TENANT_TWO_FACTOR_OTP_TTL_MINUTES),
            'preferences' => $preferences,
        ])->save();

        try {
            Mail::to($user->email)->send(new EmailOtpMail($otp));
        } catch (\Throwable $mailException) {
            Log::warning('Tenant two-factor OTP send failed during login challenge', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $mailException->getMessage(),
            ]);

            return false;
        }

        return true;
    }

    protected function markTenantTwoFactorTrustedContext(Request $request, User $user): User
    {
        $securityPreferences = $this->getNormalizedSecurityPreferences($user);

        $securityPreferences['twoFactorPendingLogin'] = false;
        $securityPreferences['twoFactorEnrollmentPending'] = false;
        $securityPreferences['twoFactorLastIp'] = (string) $request->ip();
        $securityPreferences['twoFactorLastDeviceFingerprint'] = $this->getDeviceFingerprintFromRequest($request);
        $securityPreferences['twoFactorLastVerifiedAt'] = now()->toIso8601String();

        return $this->persistSecurityPreferences($user, $securityPreferences);
    }

    protected function resolveAccessTokenTtlMinutes(Request $request, User $user): int
    {
        $ttlMinutes = max((int) config('sanctum.access_token_ttl_minutes', 15), 1);

        if ($this->isTrustedDeviceRequest($request)) {
            $ttlMinutes = max((int) config('sanctum.access_token_ttl_minutes_trusted_device', $ttlMinutes), 1);
        }

        if ($user->role === 'admin') {
            $ttlMinutes = max((int) config('sanctum.access_token_ttl_minutes_admin', $ttlMinutes), 1);
        }

        return $ttlMinutes;
    }

    protected function resolveRefreshTokenTtlDays(Request $request, User $user): int
    {
        $ttlDays = max((int) config('sanctum.refresh_token_ttl_days', 30), 1);

        if ($this->isTrustedDeviceRequest($request)) {
            $ttlDays = max((int) config('sanctum.refresh_token_ttl_days_trusted_device', $ttlDays), 1);
        }

        if ($user->role === 'admin') {
            $ttlDays = max((int) config('sanctum.refresh_token_ttl_days_admin', $ttlDays), 1);
        }

        return $ttlDays;
    }

    protected function issueTokenPair(Request $request, User $user): array
    {
        $accessExpiresAt = now()->addMinutes($this->resolveAccessTokenTtlMinutes($request, $user));
        $refreshExpiresAt = now()->addDays($this->resolveRefreshTokenTtlDays($request, $user));

        $accessToken = $user->createToken(self::ACCESS_TOKEN_NAME, ['*'], $accessExpiresAt)->plainTextToken;
        $refreshToken = $user->createToken(self::REFRESH_TOKEN_NAME, [self::REFRESH_TOKEN_ABILITY], $refreshExpiresAt)->plainTextToken;

        return [
            // Backward compatibility for existing clients that read `token`.
            'token' => $accessToken,
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'token_type' => 'Bearer',
            'expires_in' => now()->diffInSeconds($accessExpiresAt),
            'expires_at' => $accessExpiresAt->toISOString(),
            'refresh_expires_in' => now()->diffInSeconds($refreshExpiresAt),
            'refresh_expires_at' => $refreshExpiresAt->toISOString(),
        ];
    }

    protected function isRefreshTokenRecord(?PersonalAccessToken $token): bool
    {
        if (! $token) {
            return false;
        }

        if ($token->name === self::REFRESH_TOKEN_NAME) {
            return true;
        }

        return is_array($token->abilities)
            && in_array(self::REFRESH_TOKEN_ABILITY, $token->abilities, true);
    }

    protected function buildAuthResponse(Request $request, User $user, string $message, array $extra = []): JsonResponse
    {
        $cookieRequested = $this->webCookieModeRequested($request);
        $hasSanctumStateful = (bool) $request->attributes->get('sanctum');
        $hasSession = $request->hasSession();

        if ($cookieRequested && (! $hasSanctumStateful || ! $hasSession)) {
            if ($this->shouldEnforceStrictWebCookieMode()) {
                $debugDetails = [
                    'cookie_requested' => $cookieRequested,
                    'has_sanctum_stateful' => $hasSanctumStateful,
                    'has_session' => $hasSession,
                    'app_env' => app()->environment(),
                    'request_origin' => $request->header('Origin'),
                    'request_referer' => $request->header('Referer'),
                    'x_client_platform' => $request->header('X-Client-Platform'),
                    'stateful_domains' => config('sanctum.stateful'),
                ];

                return response()->json([
                    'message' => 'Secure web login failed: stateful session not detected. See debug info.',
                    'auth_mode' => 'cookie_unavailable',
                    '_debug' => $debugDetails,
                ], 409);
            }

            $extra = array_merge($extra, [
                'auth_mode_detail' => ! $hasSanctumStateful
                    ? 'cookie_requested_but_not_stateful'
                    : 'cookie_requested_but_no_session',
            ]);
        }

        if ($this->shouldUseWebCookieAuth($request)) {
            auth()->guard('web')->login($user);
            $request->session()->regenerate();

            return response()->json(array_merge([
                'user' => $user,
                'message' => $message,
                'auth_mode' => 'cookie',
            ], $extra));
        }

        $tokenPayload = $this->issueTokenPair($request, $user);

        return response()->json(array_merge([
            'user' => $user,
            'message' => $message,
            'auth_mode' => 'token',
        ], $tokenPayload, $extra));
    }

    private function normalizeGenderForStorage(?string $sex): ?string
    {
        if ($sex === null) {
            return null;
        }

        $normalized = strtolower(trim($sex));

        return match ($normalized) {
            'male' => 'male',
            'female' => 'female',

            default => null,
        };
    }

    // Live email uniqueness check for registration
    public function checkEmail(Request $request)
    {
        $request->validate([
            // Use email:rfc to validate syntax
            'email' => 'required|email:rfc',
        ]);
        $exists = User::where('email', $request->email)->exists();

        return response()->json([
            'available' => ! $exists,
            'message' => $exists ? 'Email is already in use.' : 'Email is available.',
        ]);
    }

    public function register(Request $request)
    {
        try {
            $validated = $request->validate([
                'first_name' => 'required|string|max:100',
                'middle_name' => 'nullable|string|max:100',
                'last_name' => 'required|string|max:100',
                // Require RFC syntax during registration, explicitly ignore soft-deleted records
                'email' => [
                    'required',
                    'string',
                    'email:rfc',
                    'max:255',
                    Rule::unique('users')->whereNull('deleted_at'),
                ],
                'password' => [
                    'required',
                    'string',
                    'min:8',
                    'confirmed',
                    'regex:/[a-z]/',      // at least one lowercase letter
                    'regex:/[A-Z]/',      // at least one uppercase letter
                    'regex:/(.*[0-9]){2,}/', // at least two numbers
                    'regex:{[!@#$%^&*(),.?":{}|<>\[\]\\\/~`_+=;\'\-]}', // at least one special character
                ],
                'role' => 'required|in:landlord,tenant',
                'phone' => 'nullable|string|max:20',
                'date_of_birth' => 'required|date',
                'sex' => ['required', Rule::in(['male', 'female'])],
                'agree_to_terms' => 'accepted',
                'terms_version' => 'nullable|string|max:40',
                'privacy_version' => 'nullable|string|max:40',
                'consent_platform' => 'nullable|in:web,mobile',
            ], [
                'email.unique' => 'This email is already taken. Please use a different email address.',
                'email.email' => 'Email address is not valid or cannot receive mail.',
                'agree_to_terms.accepted' => 'You must agree to the Terms and Privacy Policy to register.',
            ]);

            $validated['sex'] = $this->normalizeGenderForStorage($validated['sex'] ?? null);

            // Role-based age validation
            if (isset($validated['date_of_birth'])) {
                $minAge = $validated['role'] === 'landlord' ? 21 : 18;
                $birthDate = \Carbon\Carbon::parse($validated['date_of_birth']);
                if ($birthDate->diffInYears(\Carbon\Carbon::now()) < $minAge) {
                    return response()->json([
                        'message' => 'Registration failed: You must be at least '.$minAge.' years old to register as a '.$validated['role'].'.',
                        'errors' => ['date_of_birth' => ['Age restriction: Minimum '.$minAge.' years old required.']],
                    ], 422);
                }
            }

            $otpDeliveryFailed = false;
            $user = null;
            $otp = null;

            DB::beginTransaction();
            try {
                $result = $this->authService->register($validated);
                $user = $result['user'];
                $otp = $result['otp'];

                $consent = $this->legalConsentService->capture($user, [
                    'consent_type' => 'signup',
                    'terms_version' => $validated['terms_version'] ?? null,
                    'privacy_version' => $validated['privacy_version'] ?? null,
                    'platform' => $validated['consent_platform'] ?? null,
                    'metadata' => [
                        'agree_to_terms' => true,
                    ],
                ]);

                $this->auditLogService->legalEvent('consent.accepted', [
                    'actor' => $user,
                    'subject_type' => 'user',
                    'subject_id' => $user->id,
                    'tenant_id' => $user->role === 'tenant' ? $user->id : null,
                    'landlord_id' => $user->role === 'landlord' ? $user->id : null,
                    'summary' => 'User accepted Terms and Privacy during signup.',
                    'metadata' => [
                        'consent_id' => $consent->id,
                        'consent_type' => $consent->consent_type,
                        'terms_version' => $consent->terms_version,
                        'privacy_version' => $consent->privacy_version,
                        'platform' => $consent->platform,
                    ],
                ]);

                DB::commit();
            } catch (\Throwable $e) {
                DB::rollBack();
                throw $e;
            }

            try {
                Mail::to($user->email)->send(new EmailOtpMail($otp));
            } catch (\Throwable $mailException) {
                $otpDeliveryFailed = true;
                Log::warning('OTP delivery failed right after successful registration', [
                    'user_id' => $user?->id,
                    'email' => $user?->email,
                    'error' => $mailException->getMessage(),
                ]);
            }

            return response()->json([
                'message' => $otpDeliveryFailed
                    ? 'Registration successful. We could not send the OTP email automatically. Please tap resend OTP.'
                    : 'Registration successful. An OTP has been sent to your email address for verification.',
                'otp_delivery' => $otpDeliveryFailed ? 'failed' : 'sent',
            ], 201);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Registration failed: '.$e->getMessage(),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function verifyEmailOtp(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
            'email_otp_code' => 'required|string|min:6|max:6',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! $user->email_otp_code) {
            return response()->json(['message' => 'Verification code not found.'], 404);
        }

        if ($lockoutResponse = $this->checkOtpLockout($user)) {
            return $lockoutResponse;
        }

        if (Carbon::now()->isAfter($user->email_otp_expires_at)) {
            return response()->json(['message' => 'Verification code has expired.'], 422);
        }

        if (! Hash::check($validated['email_otp_code'], $user->email_otp_code)) {
            return $this->handleFailedOtpAttempt($user);
        }

        $this->clearOtpAttempts($user);

        $securityPreferences = $this->getNormalizedSecurityPreferences($user);
        $isTenantTwoFactorLoginVerification = $user->role === 'tenant'
            && (bool) $securityPreferences['twoFactorAuth']
            && ! empty($securityPreferences['twoFactorVerifiedAt'])
            && (bool) $securityPreferences['twoFactorPendingLogin'];

        $updates = [
            'email_otp_code' => null,
            'email_otp_expires_at' => null,
        ];

        if (! $user->is_verified) {
            $updates['email_verified_at'] = now();
            $updates['is_verified'] = true;
        }

        $user->forceFill($updates)->save();

        $user = $user->fresh();

        if ($isTenantTwoFactorLoginVerification) {
            $user = $this->markTenantTwoFactorTrustedContext($request, $user);
        }

        return $this->buildAuthResponse(
            $request,
            $user,
            $isTenantTwoFactorLoginVerification
                ? 'Two-factor verification successful. You are now logged in.'
                : 'Email verified successfully. You are now logged in.'
        );
    }

    public function resendEmailOtp(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $user = User::where('email', $validated['email'])->first();

        // Regenerate OTP
        $otp = (string) random_int(100000, 999999);
        $user->forceFill([
            'email_otp_code' => Hash::make($otp),
            'email_otp_expires_at' => Carbon::now()->addMinutes(15),
        ])->save();

        // Resend OTP email
        Mail::to($user->email)->send(new EmailOtpMail($otp));

        return response()->json(['message' => 'A new verification code has been sent to your email address.']);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        try {
            $user = $this->authService->login($credentials);

            if (! $this->legalConsentService->hasAnyConsent($user)) {
                $consent = $this->legalConsentService->capture($user, [
                    'consent_type' => 'first_login_implied',
                    'metadata' => [
                        'source' => 'legacy_backfill',
                    ],
                ]);

                $this->auditLogService->legalEvent('consent.accepted', [
                    'actor' => $user,
                    'subject_type' => 'user',
                    'subject_id' => $user->id,
                    'tenant_id' => $user->role === 'tenant' ? $user->id : null,
                    'landlord_id' => $user->role === 'landlord' ? $user->id : null,
                    'summary' => 'Legal consent backfilled on first login.',
                    'metadata' => [
                        'consent_id' => $consent->id,
                        'consent_type' => $consent->consent_type,
                        'terms_version' => $consent->terms_version,
                        'privacy_version' => $consent->privacy_version,
                        'platform' => $consent->platform,
                    ],
                ]);
            }

            $responseData = [];

            $requireReconsentOnMajor = (bool) config('legal.require_reconsent_on_major_update', true);
            $responseData['requires_legal_reconsent'] = $requireReconsentOnMajor
                ? ! $this->legalConsentService->hasAcceptedCurrentVersions($user)
                : false;
            $responseData['current_terms_version'] = (string) config('legal.terms_version', 'v1.0');
            $responseData['current_privacy_version'] = (string) config('legal.privacy_version', 'v1.0');

            // Add verification info for landlords on successful login
            if ($user->role === 'landlord') {
                $verification = $user->landlordVerification;
                $responseData['verification_status'] = $verification ? $verification->status : 'not_submitted';
                $responseData['rejection_reason'] = $verification ? $verification->rejection_reason : null;
            }

            if ($this->shouldRequireTenantTwoFactorChallenge($request, $user)) {
                $otpSent = $this->sendTenantTwoFactorLoginChallengeOtp($request, $user);

                if (! $otpSent) {
                    return response()->json([
                        'message' => 'Login requires two-factor authentication, but we could not send the verification code. Please try again.',
                    ], 500);
                }

                return response()->json([
                    'status' => 'pending_verification',
                    'message' => 'Two-factor authentication required. A verification code has been sent to your email.',
                    'otp_resent' => true,
                    'requires_email_otp' => true,
                ], 403);
            }

            $tenantSecurityPreferences = $this->getNormalizedSecurityPreferences($user);
            $isTenantTwoFactorEnabledAndVerified = $user->role === 'tenant'
                && (bool) $tenantSecurityPreferences['twoFactorAuth']
                && ! empty($tenantSecurityPreferences['twoFactorVerifiedAt']);

            if ($isTenantTwoFactorEnabledAndVerified) {
                $user = $this->markTenantTwoFactorTrustedContext($request, $user);
            }

            return $this->buildAuthResponse($request, $user, 'Login successful', $responseData);

        } catch (ValidationException $e) {
            throw $e; // Re-throw validation exception to let Laravel handle the response
        } catch (AccountBlockedException $e) {
            return response()->json([
                'status' => 'blocked',
                'message' => $e->getMessage(),
            ], 403);
        } catch (PendingVerificationException $e) {
            $response = [
                'status' => 'pending_verification',
                'message' => $e->getMessage(),
                'otp_resent' => $e->otpResent,
                'requires_email_otp' => $e->requiresEmailOtp,
            ];

            if ($e->retryAfterSeconds !== null && $e->retryAfterSeconds > 0) {
                $response['retry_after_seconds'] = $e->retryAfterSeconds;
            }

            return response()->json($response, 403);
        }
    }

    public function refreshToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'refresh_token' => 'required|string',
        ]);

        $refreshToken = PersonalAccessToken::findToken($validated['refresh_token']);

        if (! $this->isRefreshTokenRecord($refreshToken)) {
            return response()->json([
                'message' => 'Invalid refresh token.',
            ], 401);
        }

        if ($refreshToken->expires_at && $refreshToken->expires_at->isPast()) {
            $refreshToken->delete();

            return response()->json([
                'message' => 'Refresh token has expired.',
            ], 401);
        }

        $user = $refreshToken->tokenable;

        if (! $user instanceof User) {
            $refreshToken->delete();

            return response()->json([
                'message' => 'Invalid refresh token owner.',
            ], 401);
        }

        if ($user->is_blocked) {
            $refreshToken->delete();

            return response()->json([
                'status' => 'blocked',
                'message' => 'Your account has been permanently blocked by the administrator. Please contact support for assistance.',
            ], 403);
        }

        if ($user->suspended_until && Carbon::now()->isBefore($user->suspended_until)) {
            $refreshToken->delete();
            $formattedDate = Carbon::parse($user->suspended_until)->format('F j, Y, g:i a');

            return response()->json([
                'status' => 'blocked',
                'message' => "Your account is temporarily suspended until {$formattedDate}. Please contact support for assistance.",
            ], 403);
        }

        if ($user->role === 'caretaker') {
            $user->load('caretakerAssignment');
        }

        $refreshToken->delete();

        return response()->json(array_merge([
            'user' => $user,
            'message' => 'Token refreshed successfully.',
            'auth_mode' => 'token',
        ], $this->issueTokenPair($request, $user)));
    }

    public function logout(Request $request)
    {
        $currentToken = $request->user()?->currentAccessToken();
        if ($currentToken) {
            $currentToken->delete();
        }

        $providedRefreshToken = (string) $request->input('refresh_token', '');
        if ($providedRefreshToken !== '') {
            $refreshToken = PersonalAccessToken::findToken($providedRefreshToken);

            if (
                $this->isRefreshTokenRecord($refreshToken)
                && $refreshToken->tokenable_type === User::class
                && (int) $refreshToken->tokenable_id === (int) $request->user()?->id
            ) {
                $refreshToken->delete();
            }
        }

        if ($this->shouldUseWebCookieAuth($request)) {
            $guard = auth()->guard('web');
            if ($guard->check()) {
                $guard->logout();
            }

            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        // Load caretaker assignment if user is a caretaker
        if ($user->role === 'caretaker') {
            $user->load('caretakerAssignment');
        }

        return response()->json([
            'user' => $this->formatUserResponse($user),
        ]);
    }

    private function formatUserResponse(User $user): array
    {
        $assignedPropertyIds = [];
        if ($user->role === 'caretaker') {
            if (! $user->relationLoaded('caretakerAssignment')) {
                $user->load('caretakerAssignment.properties:id');
            } else {
                $user->loadMissing('caretakerAssignment.properties:id');
            }

            $assignedPropertyIds = $user->caretakerAssignment
                ? $user->caretakerAssignment->properties->pluck('id')->map(fn ($id) => (int) $id)->values()->all()
                : [];
        }

        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'profile_image' => $user->profile_image,
            'is_verified' => (bool) $user->is_verified,
            'is_active' => (bool) $user->is_active,
            'notification_preferences' => $user->notification_preferences,
            'date_of_birth' => $user->date_of_birth ? $user->date_of_birth->format('Y-m-d') : null,
            'sex' => $user->sex,
            'identified_as' => $user->identified_as,
            'preferences' => $user->preferences,
            'caretaker_permissions' => $user->caretaker_permissions,
            'assigned_property_ids' => $assignedPropertyIds,
        ];
    }

    public function switchRole(Request $request)
    {
        $request->validate([
            'role' => 'required|in:landlord,tenant',
        ]);

        $user = $request->user();
        $newRole = $request->role;

        // Security Check: If switching TO landlord, must be verified/approved
        if ($user->role === 'tenant' && $newRole === 'landlord') {
            if ($user->date_of_birth) {
                if (\Carbon\Carbon::parse($user->date_of_birth)->age < 21) {
                    return response()->json([
                        'message' => 'You must be at least 21 years old to become a landlord.',
                    ], 403);
                }
            } else {
                return response()->json([
                    'message' => 'Date of birth is required to register as a landlord.',
                ], 403);
            }

            $verification = LandlordVerification::where('user_id', $user->id)->first();
            $allowedStatuses = [
                LandlordVerification::STATUS_PARTIAL_VERIFIED,
                LandlordVerification::STATUS_PENDING_DOCUMENTS_REVIEW,
                LandlordVerification::STATUS_APPROVED,
                LandlordVerification::STATUS_VERIFIED,
            ];

            if (! $verification || ! in_array($verification->status, $allowedStatuses, true)) {
                return response()->json([
                    'message' => 'Your landlord registration is not yet in an active state. Please wait for admin partial verification first.',
                    'status' => $verification ? $verification->status : 'not_submitted',
                ], 403);
            }
        }

        // If they are switching to landlord, ensure they are verified (or at least have submitted verification)
        // For simplicity, we just change the role.
        $user->role = $newRole;
        $user->save();

        return response()->json([
            'user' => $user->fresh(),
            'message' => 'Role switched to '.$newRole,
        ]);
    }

    public function updateProfile(Request $request)
    {
        try {
            $user = $request->user();

            $rules = [
                'first_name' => ['sometimes', 'required', 'string', 'max:20', 'regex:/^[\pL\s\'\-]+$/u'],
                'middle_name' => ['nullable', 'string', 'max:20', 'regex:/^[\pL\s\'\-]+$/u'],
                'last_name' => ['sometimes', 'required', 'string', 'max:20', 'regex:/^[\pL\s\'\-]+$/u'],
                'phone' => 'nullable|string|max:20',
                'date_of_birth' => 'nullable|date',
                'sex' => ['nullable', Rule::in(['male', 'female'])],
                'identified_as' => 'nullable|string|max:50',
                'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
                'payment_methods_settings' => 'nullable|array',
                'payment_methods_settings.allowed' => 'nullable|array',
                'payment_methods_settings.details' => 'nullable|array',
                'notification_preferences' => 'nullable|array',
                'preferences' => 'nullable|array',
            ];

            // Add role-based age validation
            if ($request->filled('date_of_birth')) {
                $minAge = $user->role === 'landlord' ? 21 : 18;
                $rules['date_of_birth'] = [
                    'nullable',
                    'date',
                    'before_or_equal:'.now()->subYears($minAge)->format('Y-m-d'),
                ];
            }

            $validated = $request->validate($rules, [
                'date_of_birth.before_or_equal' => 'User must be at least '.($user->role === 'landlord' ? '21' : '18').' years old.',
            ]);

            if (array_key_exists('sex', $validated)) {
                $validated['sex'] = $this->normalizeGenderForStorage($validated['sex']);
            }

            // Handle profile image upload
            if ($request->hasFile('profile_image')) {
                $image = $request->file('profile_image');
                $filename = 'profile_'.$user->id.'_'.time().'.'.$image->getClientOriginalExtension();
                $path = $image->storeAs('profile-images', $filename);
                $validated['profile_image'] = $path;

                // Delete old profile image if exists
                if ($user->profile_image) {
                    $oldPath = str_replace('/storage/', '', $user->profile_image);
                    $oldPath = str_replace('storage/', '', $oldPath);
                    Storage::delete($oldPath);
                }
            }

            // Separate user data
            $userFields = [
                'first_name', 'middle_name', 'last_name', 'phone', 'profile_image',
                'payment_methods_settings', 'notification_preferences', 'preferences',
                'date_of_birth', 'sex', 'identified_as',
            ];

            $userData = array_intersect_key($validated, array_flip($userFields));

            // Update the core user table
            if (! empty($userData)) {
                $user->update($userData);
            }

            // Handle tenant_profile fields
            $tenantProfileFields = [
                'emergency_contact_name',
                'emergency_contact_phone',
                'emergency_contact_relationship',
                'current_address',
                'preference',
            ];

            // Manually check request for these fields since they aren't in the strict users validation rules
            $tenantData = $request->only($tenantProfileFields);

            // [SINGLE SOURCE OF TRUTH] Filter out gender/sex from preference JSON
            if (isset($tenantData['preference'])) {
                $prefs = $tenantData['preference'];
                if (is_string($prefs)) {
                    $prefs = json_decode($prefs, true) ?? [];
                }
                if (is_array($prefs)) {
                    unset($prefs['sex'], $prefs['gender']);
                    $tenantData['preference'] = $prefs;
                }
            }

            if (! empty($tenantData) && $user->role === 'tenant') {
                $user->tenantProfile()->updateOrCreate(
                    ['user_id' => $user->id],
                    $tenantData
                );
            }

            return response()->json([
                'user' => $this->formatUserResponse($user->fresh()->load('tenantProfile')),
                'message' => 'Profile updated successfully',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('updateProfile error', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);

            return response()->json([
                'message' => 'Failed to update profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function changePassword(Request $request)
    {
        try {
            $validated = $request->validate([
                'current_password' => 'required|string',
                'new_password' => [
                    'required',
                    'string',
                    'min:8',
                    'confirmed',
                    'regex:/[a-z]/',      // at least one lowercase letter
                    'regex:/[A-Z]/',      // at least one uppercase letter
                    'regex:/(.*[0-9]){2,}/', // at least two numbers
                    'regex:{[!@#$%^&*(),.?":{}|<>\[\]\\\/~`_+=;\'\-]}', // at least one special character
                ],
            ], [
                'new_password.regex' => 'The password must contain at least one uppercase letter, one lowercase letter, at least two numbers, and one special character.',
            ]);

            $user = $request->user();

            if (! Hash::check($validated['current_password'], $user->password)) {
                return response()->json([
                    'message' => 'Current password is incorrect',
                ], 422);
            }

            $user->update([
                'password' => Hash::make($validated['new_password']),
            ]);

            return response()->json([
                'message' => 'Password changed successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to change password',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function sendLandlordEmailRecoveryOtp(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || $user->role !== 'landlord') {
            return response()->json([
                'message' => 'This feature is available for landlord accounts only.',
            ], 403);
        }

        $otp = (string) random_int(100000, 999999);

        $user->forceFill([
            'email_otp_code' => Hash::make($otp),
            'email_otp_expires_at' => Carbon::now()->addMinutes(self::LANDLORD_EMAIL_RECOVERY_OTP_TTL_MINUTES),
        ])->save();

        try {
            Mail::to($user->email)->send(new EmailOtpMail($otp));
        } catch (\Throwable $mailException) {
            Log::warning('Landlord email recovery OTP send failed', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $mailException->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to send verification code. Please try again later.',
            ], 500);
        }

        $user = $this->persistLandlordEmailRecoverySecurityState($user, true, null);

        return response()->json([
            'message' => 'Verification code sent to your email address.',
            'user' => $user,
            'email_recovery' => $this->extractLandlordEmailRecoveryStatus($user),
        ]);
    }

    public function getTenantTwoFactorStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || $user->role !== 'tenant') {
            return response()->json([
                'message' => 'This feature is available for tenant accounts only.',
            ], 403);
        }

        return response()->json([
            'message' => 'Two-factor authentication status retrieved successfully.',
            'two_factor' => $this->extractTenantTwoFactorStatus($user),
        ]);
    }

    public function sendTenantTwoFactorOtp(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || $user->role !== 'tenant') {
            return response()->json([
                'message' => 'This feature is available for tenant accounts only.',
            ], 403);
        }

        $securityPreferences = $this->getNormalizedSecurityPreferences($user);

        if ((bool) $securityPreferences['twoFactorAuth'] && ! empty($securityPreferences['twoFactorVerifiedAt'])) {
            return response()->json([
                'message' => 'Two-factor authentication is already enabled.',
            ], 422);
        }

        $otp = (string) random_int(100000, 999999);

        $securityPreferences['twoFactorEnrollmentPending'] = true;
        $securityPreferences['twoFactorPendingLogin'] = false;

        $preferences = is_array($user->preferences) ? $user->preferences : [];
        $preferences['security'] = $securityPreferences;

        $user->forceFill([
            'email_otp_code' => Hash::make($otp),
            'email_otp_expires_at' => Carbon::now()->addMinutes(self::TENANT_TWO_FACTOR_OTP_TTL_MINUTES),
            'preferences' => $preferences,
        ])->save();

        try {
            Mail::to($user->email)->send(new EmailOtpMail($otp));
        } catch (\Throwable $mailException) {
            Log::warning('Tenant two-factor enrollment OTP send failed', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $mailException->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to send verification code. Please try again later.',
            ], 500);
        }

        $user = $user->fresh();

        return response()->json([
            'message' => 'Verification code sent to your email address.',
            'user' => $user,
            'two_factor' => $this->extractTenantTwoFactorStatus($user),
        ]);
    }

    public function verifyTenantTwoFactorOtp(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || $user->role !== 'tenant') {
            return response()->json([
                'message' => 'This feature is available for tenant accounts only.',
            ], 403);
        }

        $validated = $request->validate([
            'email_otp_code' => 'required|digits:6',
        ]);

        if (! $user->email_otp_code || ! $user->email_otp_expires_at) {
            return response()->json([
                'message' => 'Verification code not found. Please request a new code from Settings.',
            ], 404);
        }

        if ($lockoutResponse = $this->checkOtpLockout($user)) {
            return $lockoutResponse;
        }

        if (Carbon::now()->isAfter($user->email_otp_expires_at)) {
            return response()->json([
                'message' => 'Verification code has expired. Please request a new code.',
            ], 422);
        }

        if (! Hash::check($validated['email_otp_code'], $user->email_otp_code)) {
            return $this->handleFailedOtpAttempt($user);
        }

        $this->clearOtpAttempts($user);

        $securityPreferences = $this->getNormalizedSecurityPreferences($user);

        $securityPreferences['twoFactorAuth'] = true;
        $securityPreferences['twoFactorVerifiedAt'] = now()->toIso8601String();
        $securityPreferences['twoFactorEnrollmentPending'] = false;
        $securityPreferences['twoFactorPendingLogin'] = false;
        $securityPreferences['twoFactorLastIp'] = (string) $request->ip();
        $securityPreferences['twoFactorLastDeviceFingerprint'] = $this->getDeviceFingerprintFromRequest($request);
        $securityPreferences['twoFactorLastVerifiedAt'] = now()->toIso8601String();

        $preferences = is_array($user->preferences) ? $user->preferences : [];
        $preferences['security'] = $securityPreferences;

        $user->forceFill([
            'email_otp_code' => null,
            'email_otp_expires_at' => null,
            'preferences' => $preferences,
        ])->save();

        $user = $user->fresh();

        return response()->json([
            'message' => 'Two-factor authentication enabled successfully.',
            'user' => $user,
            'two_factor' => $this->extractTenantTwoFactorStatus($user),
        ]);
    }

    public function disableTenantTwoFactor(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || $user->role !== 'tenant') {
            return response()->json([
                'message' => 'This feature is available for tenant accounts only.',
            ], 403);
        }

        $securityPreferences = $this->getNormalizedSecurityPreferences($user);

        $securityPreferences['twoFactorAuth'] = false;
        $securityPreferences['twoFactorVerifiedAt'] = null;
        $securityPreferences['twoFactorEnrollmentPending'] = false;
        $securityPreferences['twoFactorPendingLogin'] = false;
        $securityPreferences['twoFactorLastIp'] = null;
        $securityPreferences['twoFactorLastDeviceFingerprint'] = null;
        $securityPreferences['twoFactorLastVerifiedAt'] = null;

        $user->forceFill([
            'email_otp_code' => null,
            'email_otp_expires_at' => null,
        ])->save();

        $user = $this->persistSecurityPreferences($user, $securityPreferences);

        return response()->json([
            'message' => 'Two-factor authentication has been disabled.',
            'user' => $user,
            'two_factor' => $this->extractTenantTwoFactorStatus($user),
        ]);
    }

    public function verifyLandlordEmailRecoveryOtp(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || $user->role !== 'landlord') {
            return response()->json([
                'message' => 'This feature is available for landlord accounts only.',
            ], 403);
        }

        $validated = $request->validate([
            'email_otp_code' => 'required|digits:6',
        ]);

        if (! $user->email_otp_code || ! $user->email_otp_expires_at) {
            return response()->json([
                'message' => 'Verification code not found. Please request a new code from Settings.',
            ], 404);
        }

        if ($lockoutResponse = $this->checkOtpLockout($user)) {
            return $lockoutResponse;
        }

        if (Carbon::now()->isAfter($user->email_otp_expires_at)) {
            return response()->json([
                'message' => 'Verification code has expired. Please request a new code.',
            ], 422);
        }

        if (! Hash::check($validated['email_otp_code'], $user->email_otp_code)) {
            return $this->handleFailedOtpAttempt($user);
        }

        $this->clearOtpAttempts($user);

        $user->forceFill([
            'email_otp_code' => null,
            'email_otp_expires_at' => null,
        ])->save();

        $user = $this->persistLandlordEmailRecoverySecurityState($user, true, now()->toIso8601String());

        return response()->json([
            'message' => 'Email recovery verified successfully.',
            'user' => $user,
            'email_recovery' => $this->extractLandlordEmailRecoveryStatus($user),
        ]);
    }

    public function disableLandlordEmailRecovery(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || $user->role !== 'landlord') {
            return response()->json([
                'message' => 'This feature is available for landlord accounts only.',
            ], 403);
        }

        $user->forceFill([
            'email_otp_code' => null,
            'email_otp_expires_at' => null,
        ])->save();

        $user = $this->persistLandlordEmailRecoverySecurityState($user, false, null);

        return response()->json([
            'message' => 'Email recovery has been disabled.',
            'user' => $user,
            'email_recovery' => $this->extractLandlordEmailRecoveryStatus($user),
        ]);
    }

    private function extractLandlordEmailRecoveryStatus(User $user): array
    {
        $securityPreferences = $this->getNormalizedSecurityPreferences($user);

        return [
            'enabled' => (bool) $securityPreferences['emailRecoveryEnabled'],
            'verified_at' => $securityPreferences['emailRecoveryVerifiedAt'] ?: null,
        ];
    }

    private function extractTenantTwoFactorStatus(User $user): array
    {
        $securityPreferences = $this->getNormalizedSecurityPreferences($user);

        return [
            'enabled' => (bool) $securityPreferences['twoFactorAuth'],
            'verified_at' => $securityPreferences['twoFactorVerifiedAt'] ?: null,
            'enrollment_pending' => (bool) $securityPreferences['twoFactorEnrollmentPending'],
        ];
    }

    private function persistSecurityPreferences(User $user, array $securityPreferences): User
    {
        $preferences = is_array($user->preferences) ? $user->preferences : [];
        $preferences['security'] = $securityPreferences;

        $user->forceFill([
            'preferences' => $preferences,
        ])->save();

        return $user->fresh();
    }

    private function persistLandlordEmailRecoverySecurityState(User $user, bool $enabled, ?string $verifiedAt): User
    {
        $securityPreferences = $this->getNormalizedSecurityPreferences($user);

        $securityPreferences['emailRecoveryEnabled'] = $enabled;
        $securityPreferences['emailRecoveryVerifiedAt'] = $verifiedAt;

        return $this->persistSecurityPreferences($user, $securityPreferences);
    }

    private function getNormalizedSecurityPreferences(User $user): array
    {
        $preferences = is_array($user->preferences) ? $user->preferences : [];
        $security = $preferences['security'] ?? [];

        if (! is_array($security)) {
            $security = [];
        }

        return [
            'twoFactorAuth' => (bool) ($security['twoFactorAuth'] ?? false),
            'twoFactorVerifiedAt' => ! empty($security['twoFactorVerifiedAt']) ? (string) $security['twoFactorVerifiedAt'] : null,
            'twoFactorEnrollmentPending' => (bool) ($security['twoFactorEnrollmentPending'] ?? false),
            'twoFactorPendingLogin' => (bool) ($security['twoFactorPendingLogin'] ?? false),
            'twoFactorLastIp' => ! empty($security['twoFactorLastIp']) ? (string) $security['twoFactorLastIp'] : null,
            'twoFactorLastDeviceFingerprint' => ! empty($security['twoFactorLastDeviceFingerprint']) ? (string) $security['twoFactorLastDeviceFingerprint'] : null,
            'twoFactorLastVerifiedAt' => ! empty($security['twoFactorLastVerifiedAt']) ? (string) $security['twoFactorLastVerifiedAt'] : null,
            'loginAlerts' => array_key_exists('loginAlerts', $security) ? (bool) $security['loginAlerts'] : true,
            'emailRecoveryEnabled' => (bool) ($security['emailRecoveryEnabled'] ?? false),
            'emailRecoveryVerifiedAt' => ! empty($security['emailRecoveryVerifiedAt']) ? (string) $security['emailRecoveryVerifiedAt'] : null,
        ];
    }

    public function removeProfileImage(Request $request)
    {
        try {
            $user = $request->user();

            if ($user->profile_image) {
                // Delete the image file
                $oldPath = str_replace('/storage/', '', $user->profile_image);
                $oldPath = str_replace('storage/', '', $oldPath);
                Storage::delete($oldPath);

                // Update user record
                $user->update(['profile_image' => null]);
            }

            return response()->json([
                'user' => $user->fresh(),
                'message' => 'Profile image removed successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to remove profile image',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function handleFailedOtpAttempt(User $user): JsonResponse
    {
        $userId = $user->id;
        $key = "otp_attempts_{$userId}";
        $attempts = (int) \Illuminate\Support\Facades\Cache::get($key, 0) + 1;
        
        \Illuminate\Support\Facades\Cache::put($key, $attempts, now()->addMinutes(30));

        if ($attempts >= 5) {
            return response()->json([
                'message' => 'Too many failed attempts. OTP verification has been locked for 30 minutes.',
            ], 429);
        }

        $remaining = 5 - $attempts;
        return response()->json([
            'message' => "Invalid verification code. You have {$remaining} attempts remaining before lockout.",
        ], 422);
    }

    private function checkOtpLockout(User $user): ?JsonResponse
    {
        $userId = $user->id;
        $key = "otp_attempts_{$userId}";
        $attempts = (int) \Illuminate\Support\Facades\Cache::get($key, 0);

        if ($attempts >= 5) {
            return response()->json([
                'message' => "Too many failed attempts. This feature has been locked temporarily for security. Please try again later.",
            ], 429);
        }

        return null;
    }

    private function clearOtpAttempts(User $user): void
    {
        \Illuminate\Support\Facades\Cache::forget("otp_attempts_{$user->id}");
    }
}
