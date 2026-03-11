<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;
use App\Services\AuthService;
use App\Exceptions\AccountBlockedException;
use App\Exceptions\PendingVerificationException;

class AuthController extends Controller
{
    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
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
            'available' => !$exists,
            'message' => $exists ? 'Email is already in use.' : 'Email is available.'
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
                            ],                'role' => 'required|in:landlord,tenant',
                'phone' => 'nullable|string|max:20',
            ], [
                'email.unique' => 'This email is already taken. Please use a different email address.',
                'email.email' => 'Email address is not valid or cannot receive mail.',
            ]);

            $user = $this->authService->register($validated);

            try {
                $token = $user->createToken('auth_token')->plainTextToken;
            } catch (\Exception $e) {
                // If token creation fails (e.g. missing table), delete user and rethrow
                $user->delete();
                throw new \Exception('Failed to create access token. Please ensure migrations are run: ' . $e->getMessage());
            }

            return response()->json([
                'user' => $user,
                'token' => $token,
                'message' => 'Registration successful.'
            ], 201);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Registration failed: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        try {
            $user = $this->authService->login($credentials);

            $token = $user->createToken('auth_token')->plainTextToken;

            $responseData = [
                'user' => $user,
                'token' => $token,
                'message' => 'Login successful'
            ];

            // Add verification info for landlords on successful login
            if ($user->role === 'landlord') {
                $verification = $user->landlordVerification;
                $responseData['verification_status'] = $verification ? $verification->status : ($user->is_verified ? 'approved' : 'pending');
                $responseData['rejection_reason'] = $verification ? $verification->rejection_reason : null;
            }

            return response()->json($responseData);

        } catch (ValidationException $e) {
            throw $e; // Re-throw validation exception to let Laravel handle the response
        } catch (AccountBlockedException $e) {
            return response()->json([
                'status' => 'blocked',
                'message' => $e->getMessage()
            ], 403);
        } catch (PendingVerificationException $e) {
            return response()->json([
                'status' => 'pending_verification',
                'message' => $e->getMessage()
            ], 403);
        }
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
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
        
        // If they are switching to landlord, ensure they are verified (or at least have submitted verification)
        // For simplicity, we just change the role.
        $user->role = $request->role;
        $user->save();

        return response()->json([
            'user' => $user->fresh(),
            'message' => 'Role switched to ' . $request->role,
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
                'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
                'payment_methods_settings' => 'nullable|array',
                'payment_methods_settings.allowed' => 'nullable|array',
                'payment_methods_settings.details' => 'nullable|array',
                'notification_preferences' => 'nullable|array',
            ];

            // Add role-based age validation
            if ($request->filled('date_of_birth')) {
                $minAge = $user->role === 'landlord' ? 20 : 18;
                $rules['date_of_birth'] = [
                    'nullable',
                    'date',
                    'before_or_equal:' . now()->subYears($minAge)->format('Y-m-d')
                ];
            }

            $validated = $request->validate($rules, [
                'date_of_birth.before_or_equal' => 'User must be at least ' . ($user->role === 'landlord' ? '20' : '18') . ' years old.'
            ]);

            // Handle profile image upload
            if ($request->hasFile('profile_image')) {
                $image = $request->file('profile_image');
                $filename = 'profile_' . $user->id . '_' . time() . '.' . $image->getClientOriginalExtension();
                $path = $image->storeAs('profile-images', $filename, 'public');
                $validated['profile_image'] = '/storage/' . $path;

                // Delete old profile image if exists
                if ($user->profile_image) {
                    $oldPath = str_replace('/storage/', '', $user->profile_image);
                    Storage::disk('public')->delete($oldPath);
                }
            }

            // Separate user data from tenant profile data
            $userFields = [
                'first_name', 'middle_name', 'last_name', 'phone', 'profile_image', 
                'payment_methods_settings', 'notification_preferences'
            ];
            $tenantProfileFields = ['date_of_birth', 'gender'];

            $userData = array_intersect_key($validated, array_flip($userFields));
            $tenantData = array_intersect_key($validated, array_flip($tenantProfileFields));

            // Update the core user table
            if (!empty($userData)) {
                $user->update($userData);
            }

            // If the user is a tenant and there's tenant-specific data, update their profile
            if ($user->role === 'tenant' && !empty($tenantData)) {
                $user->tenantProfile()->updateOrCreate(
                    ['user_id' => $user->id],
                    $tenantData
                );
            }

            return response()->json([
                'user' => $user->fresh()->load('tenantProfile'),
                'message' => 'Profile updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update profile',
                'error' => $e->getMessage()
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

            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json([
                    'message' => 'Current password is incorrect'
                ], 422);
            }

            $user->update([
                'password' => Hash::make($validated['new_password'])
            ]);

            return response()->json([
                'message' => 'Password changed successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to change password',
                'error' => $e->getMessage()
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
                'message' => 'Profile image removed successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to remove profile image',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}