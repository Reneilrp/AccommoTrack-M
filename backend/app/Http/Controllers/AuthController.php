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
            'email' => 'required|email',
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
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|in:landlord,tenant',
            'phone' => 'nullable|string|max:20',
        ], [
            'email.unique' => 'This email is already taken. Please use a different email address.',
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

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Load caretaker assignment if user is a caretaker
        if ($user->role === 'caretaker') {
            $user->load('caretakerAssignment');
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'message' => 'Login successful'
        ]);
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