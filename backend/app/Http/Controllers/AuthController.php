<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    // Live email uniqueness check for registration
    public function checkEmail(Request $request)
    {
        $request->validate([
            // Use email:rfc,dns to validate syntax and DNS/MX records
            'email' => 'required|email:rfc,dns',
        ]);
        $exists = User::where('email', $request->email)->exists();
        return response()->json([
            'available' => !$exists,
            'message' => $exists ? 'This email is already taken.' : 'This email is available.'
        ]);
    }
    public function register(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            // Require RFC syntax and DNS/MX check during registration
            'email' => 'required|string|email:rfc,dns|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|in:landlord,tenant',
            'phone' => 'nullable|string|max:20',
        ], [
            'email.unique' => 'This email is already taken. Please use a different email address.',
            'email.email' => 'Email address is not valid or cannot receive mail.',
        ]);

        $user = User::create([
            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
            'is_verified' => false,
            'is_active' => true,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'message' => 'Registration successful.'
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['This email is not registered.'],
            ]);
        }

        if (!Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['The password you entered is incorrect.'],
            ]);
        }

        if ($user->is_blocked) {
            return response()->json([
                'status' => 'blocked',
                'message' => 'Your account has been blocked by the administrator. Please contact support for assistance.'
            ], 403);
        }

        // Check landlord verification status
        if ($user->role === 'landlord') {
            $verification = $user->landlordVerification;
            
            if ($verification) {
                if ($verification->status === 'pending') {
                    return response()->json([
                        'status' => 'pending_verification',
                        'message' => 'Your account is still under review. Please wait for 1-3 working days for the admin to approve your request.'
                    ], 403);
                }
                // Allow login if rejected, but frontend will handle the modal
            } elseif (!$user->is_verified) {
                // Fallback for unverified landlords without a verification record
                return response()->json([
                    'status' => 'pending_verification',
                    'message' => 'Your account is still under review. Please wait for 1-3 working days for the admin to approve your request.'
                ], 403);
            }
        }

        // Load caretaker assignment if user is a caretaker
        if ($user->role === 'caretaker') {
            $user->load('caretakerAssignment');
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        $responseData = [
            'user' => $user,
            'token' => $token,
            'message' => 'Login successful'
        ];

        // Add verification info for landlords
        if ($user->role === 'landlord' && !$user->is_verified) {
            $verification = $user->landlordVerification;
            $responseData['verification_status'] = $verification ? $verification->status : 'pending';
            $responseData['rejection_reason'] = $verification ? $verification->rejection_reason : null;
        }

        return response()->json($responseData);
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

    public function updateProfile(Request $request)
    {
        try {
            $user = $request->user();

            $validated = $request->validate([
                'first_name' => 'sometimes|required|string|max:100',
                'middle_name' => 'nullable|string|max:100',
                'last_name' => 'sometimes|required|string|max:100',
                'phone' => 'nullable|string|max:20',
                'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
                'payment_methods_settings' => 'nullable|array',
                'payment_methods_settings.allowed' => 'nullable|array',
                'payment_methods_settings.details' => 'nullable|array',
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

            $user->update($validated);

            return response()->json([
                'user' => $user->fresh(),
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
                'new_password' => 'required|string|min:8|confirmed',
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