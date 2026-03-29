<?php

namespace App\Http\Controllers\Common;

use App\Exceptions\AccountBlockedException;
use App\Exceptions\PendingVerificationException;
use App\Http\Controllers\Controller;
use App\Mail\EmailOtpMail;
use App\Models\User;
use App\Services\AuthService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    protected function webCookieModeRequested(Request $request): bool
    {
        if (! app()->environment('production')) {
            return false;
        }

        $cookieModeEnabled = filter_var(
            env('AUTH_WEB_COOKIE_MODE', env('APP_ENV') === 'production'),
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

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json(array_merge([
            'user' => $user,
            'token' => $token,
            'message' => $message,
            'auth_mode' => 'token',
        ], $extra));
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
                // Require RFC syntax during registration
                'email' => 'required|string|email:rfc|max:255|unique:users',
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
                'gender' => ['required', Rule::in(['male', 'female', 'prefer_not_to_say'])],
            ], [
                'email.unique' => 'This email is already taken. Please use a different email address.',
                'email.email' => 'Email address is not valid or cannot receive mail.',
            ]);

            // Role-based age validation
            if (isset($validated['date_of_birth'])) {
                $minAge = $validated['role'] === 'landlord' ? 20 : 18;
                $birthDate = \Carbon\Carbon::parse($validated['date_of_birth']);
                if ($birthDate->diffInYears(\Carbon\Carbon::now()) < $minAge) {
                    return response()->json([
                        'message' => 'Registration failed: You must be at least '.$minAge.' years old to register as a '.$validated['role'].'.',
                        'errors' => ['date_of_birth' => ['Age restriction: Minimum '.$minAge.' years old required.']],
                    ], 422);
                }
            }

            $result = $this->authService->register($validated);
            $user = $result['user'];
            $otp = $result['otp'];

            // Send OTP email
            Mail::to($user->email)->send(new EmailOtpMail($otp));

            return response()->json([
                'message' => 'Registration successful. An OTP has been sent to your email address for verification.',
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

        if (Carbon::now()->isAfter($user->email_otp_expires_at)) {
            return response()->json(['message' => 'Verification code has expired.'], 422);
        }

        if (! Hash::check($validated['email_otp_code'], $user->email_otp_code)) {
            return response()->json(['message' => 'Invalid verification code.'], 422);
        }

        $user->forceFill([
            'email_verified_at' => now(),
            'is_verified' => true,
            'email_otp_code' => null,
            'email_otp_expires_at' => null,
        ])->save();

        return $this->buildAuthResponse($request, $user, 'Email verified successfully. You are now logged in.');
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

            $responseData = [];

            // Add verification info for landlords on successful login
            if ($user->role === 'landlord') {
                $verification = $user->landlordVerification;
                $responseData['verification_status'] = $verification ? $verification->status : 'not_submitted';
                $responseData['rejection_reason'] = $verification ? $verification->rejection_reason : null;
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
            ];

            if ($e->retryAfterSeconds !== null && $e->retryAfterSeconds > 0) {
                $response['retry_after_seconds'] = $e->retryAfterSeconds;
            }

            return response()->json($response, 403);
        }
    }

    public function logout(Request $request)
    {
        $currentToken = $request->user()?->currentAccessToken();
        if ($currentToken) {
            $currentToken->delete();
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
            'user' => $user,
        ]);
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
                if (\Carbon\Carbon::parse($user->date_of_birth)->age < 20) {
                    return response()->json([
                        'message' => 'You must be at least 20 years old to become a landlord.',
                    ], 403);
                }
            } else {
                return response()->json([
                    'message' => 'Date of birth is required to become a landlord.',
                ], 403);
            }

            $verification = \App\Models\LandlordVerification::where('user_id', $user->id)->first();

            if (! $user->is_verified && (! $verification || $verification->status !== 'approved')) {
                return response()->json([
                    'message' => 'Your landlord verification is not yet approved. Please complete verification first.',
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
                'gender' => ['nullable', Rule::in(['male', 'female', 'prefer_not_to_say'])],
                'identified_as' => 'nullable|string|max:50',
                'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
                'payment_methods_settings' => 'nullable|array',
                'payment_methods_settings.allowed' => 'nullable|array',
                'payment_methods_settings.details' => 'nullable|array',
                'notification_preferences' => 'nullable|array',
                'preferences' => 'nullable|array',
            ];

            // Add role-based age validation
            if ($request->filled('date_of_birth')) {
                $minAge = $user->role === 'landlord' ? 20 : 18;
                $rules['date_of_birth'] = [
                    'nullable',
                    'date',
                    'before_or_equal:'.now()->subYears($minAge)->format('Y-m-d'),
                ];
            }

            $validated = $request->validate($rules, [
                'date_of_birth.before_or_equal' => 'User must be at least '.($user->role === 'landlord' ? '20' : '18').' years old.',
            ]);

            // Handle profile image upload
            if ($request->hasFile('profile_image')) {
                $image = $request->file('profile_image');
                $filename = 'profile_'.$user->id.'_'.time().'.'.$image->getClientOriginalExtension();
                $path = $image->storeAs('profile-images', $filename, 'public');
                $validated['profile_image'] = '/storage/'.$path;

                // Delete old profile image if exists
                if ($user->profile_image) {
                    $oldPath = str_replace('/storage/', '', $user->profile_image);
                    Storage::disk('public')->delete($oldPath);
                }
            }

            // Separate user data
            $userFields = [
                'first_name', 'middle_name', 'last_name', 'phone', 'profile_image',
                'payment_methods_settings', 'notification_preferences', 'preferences',
                'date_of_birth', 'gender', 'identified_as',
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

            if (! empty($tenantData) && $user->role === 'tenant') {
                $user->tenantProfile()->updateOrCreate(
                    ['user_id' => $user->id],
                    $tenantData
                );
            }

            return response()->json([
                'user' => $user->fresh()->load('tenantProfile'),
                'message' => 'Profile updated successfully',
            ]);
        } catch (\Exception $e) {
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

    public function removeProfileImage(Request $request)
    {
        try {
            $user = $request->user();

            if ($user->profile_image) {
                // Delete the image file
                $oldPath = str_replace('/storage/', '', $user->profile_image);
                Storage::disk('public')->delete($oldPath);

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
}
