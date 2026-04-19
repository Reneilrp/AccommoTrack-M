<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\TenantCredit;
use App\Models\TenantProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class TenantSettingsController extends Controller
{
    public function getProfile()
    {
        try {
            $userId = Auth::id();

            // Get user directly
            $user = User::select([
                'id', 'first_name', 'middle_name', 'last_name', 'email', 'phone',
                'profile_image', 'is_verified', 'is_active', 'notification_preferences',
                'date_of_birth', 'sex', 'identified_as',
            ])->findOrFail($userId);

            // Get tenant profile directly
            $tenantProfile = TenantProfile::where('user_id', $userId)
                ->select([
                    'move_in_date', 'move_out_date', 'status', 'notes',
                    'emergency_contact_name', 'emergency_contact_phone',
                    'emergency_contact_relationship', 'current_address',
                    'preference',
                ])
                ->first();

            // Calculate age manually (since accessor might not work in IDE)
            $age = null;
            if ($user->date_of_birth) {
                $birthDate = \Carbon\Carbon::parse($user->date_of_birth);
                $age = $birthDate->diffInYears(\Carbon\Carbon::now());
            }

            // Format profile image URL
            $profileImage = null;
            if ($user->profile_image) {
                $rawPath = ltrim($user->profile_image, '/');
                $cleanPath = str_replace('storage/', '', $rawPath);

                try {
                    $profileImage = Storage::url($cleanPath);
                } catch (\Exception $e) {
                    $profileImage = \Illuminate\Support\Facades\Storage::url($cleanPath);
                }
            }

            return response()->json($this->formatProfileResponse($user, $tenantProfile), 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function updateProfile(Request $request)
    {
        try {
            $userId = Auth::id();
            $user = User::findOrFail($userId);

            $validated = $request->validate([
                'first_name' => ['sometimes', 'required', 'string', 'max:20', 'regex:/^[\pL\s\'\-]+$/u'],
                'middle_name' => ['nullable', 'string', 'max:20', 'regex:/^[\pL\s\'\-]+$/u'],
                'last_name' => ['sometimes', 'required', 'string', 'max:20', 'regex:/^[\pL\s\'\-]+$/u'],
                'email' => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($userId)],
                'phone' => 'nullable|string|max:20',
                'identified_as' => 'nullable|string|max:50',
                'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
                'notification_preferences' => 'nullable',

                // TenantProfile fields
                'date_of_birth' => ['nullable', 'date', 'before_or_equal:'.now()->subYears(18)->format('Y-m-d')],
                'sex' => ['nullable', Rule::in(['male', 'female'])],
                'emergency_contact_name' => 'nullable|string|max:255',
                'emergency_contact_phone' => 'nullable|string|max:20',
                'emergency_contact_relationship' => 'nullable|string|max:100',
                'current_address' => 'nullable|string',
                'preference' => 'nullable', // Allow array or json
                'notes' => 'nullable|string',
                'move_in_date' => 'nullable|date',
                'move_out_date' => 'nullable|date',
                'status' => 'nullable|string',
            ], [
                'date_of_birth.before_or_equal' => 'Tenants must be at least 18 years old.',
            ]);

            if (array_key_exists('sex', $validated)) {
                $validated['sex'] = $this->normalizeGenderForStorage($validated['sex']);
            }

            DB::beginTransaction();

            // Update User table directly (only fields present in request)
            $userData = [];
            if ($request->has('first_name')) {
                $userData['first_name'] = $validated['first_name'];
            }
            if ($request->has('middle_name')) {
                $userData['middle_name'] = $validated['middle_name'];
            }
            if ($request->has('last_name')) {
                $userData['last_name'] = $validated['last_name'];
            }
            if ($request->has('email')) {
                $userData['email'] = $validated['email'];
            }
            if ($request->has('phone')) {
                $userData['phone'] = $validated['phone'];
            }
            if ($request->has('date_of_birth')) {
                $userData['date_of_birth'] = $validated['date_of_birth'];
            }
            if ($request->has('sex')) {
                $userData['sex'] = $validated['sex'];
            }
            if ($request->has('identified_as')) {
                $userData['identified_as'] = $validated['identified_as'] ?? null;
            }
            if ($request->has('notification_preferences')) {
                $prefs = $validated['notification_preferences'];
                // When sent as a JSON string via FormData, decode it first
                if (is_string($prefs)) {
                    $decoded = json_decode($prefs, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $prefs = $decoded;
                    }
                }
                if (is_array($prefs)) {
                    // Normalize all values to proper booleans before storing
                    $userData['notification_preferences'] = array_map(fn ($v) => (bool) $v, $prefs);
                }
            }

            // Handle profile image upload
            if ($request->hasFile('profile_image')) {
                // Delete old image if exists
                if ($user->profile_image) {
                    $oldPath = str_replace('/storage/', '', $user->profile_image);
                    $oldPath = str_replace('storage/', '', $oldPath);
                    Storage::delete($oldPath);
                }
                $path = $request->file('profile_image')->store('profile-images');
                $userData['profile_image'] = $path;
            }

            if (! empty($userData)) {
                User::where('id', $userId)->update($userData);
            }

            // Update or create TenantProfile safely (merging preferences)
            $tenantProfile = TenantProfile::firstOrNew(['user_id' => $userId]);

            $profileFields = [
                'emergency_contact_name', 'emergency_contact_phone',
                'emergency_contact_relationship', 'current_address', 'notes',
                'move_in_date', 'move_out_date', 'status',
            ];

            foreach ($profileFields as $field) {
                if (array_key_exists($field, $validated)) {
                    $tenantProfile->$field = $validated[$field];
                }
            }

            // Smart merge for preferences
            if (array_key_exists('preference', $validated)) {
                $currentPrefs = $tenantProfile->preference ?? [];
                if (! is_array($currentPrefs)) {
                    $currentPrefs = [];
                }

                $newPrefs = $validated['preference'];

                // Decode if it's a JSON string (common with FormData)
                if (is_string($newPrefs)) {
                    $decoded = json_decode($newPrefs, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $newPrefs = $decoded;
                    }
                }

                if (is_array($newPrefs)) {
                    $tenantProfile->preference = array_merge($currentPrefs, $newPrefs);
                }
            }

            $tenantProfile->save();

            DB::commit();

            // Return fresh data
            $updatedUser = User::with('tenantProfile')->find($userId);

            return response()->json([
                'message' => 'Profile updated successfully',
                'user' => $this->formatProfileResponse($updatedUser, $updatedUser->tenantProfile),
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to update profile',
                'error' => $e->getMessage(),
            ], 500);
        }
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

    private function formatProfileResponse(User $user, ?TenantProfile $tenantProfile): array
    {
        // Calculate age manually
        $age = null;
        if ($user->date_of_birth) {
            $birthDate = \Carbon\Carbon::parse($user->date_of_birth);
            $age = $birthDate->diffInYears(\Carbon\Carbon::now());
        }

        // Format profile image URL (using the model accessor but ensuring Storage::url is used if needed)
        // Actually, the model already has an accessor getProfileImageAttribute.
        // But we want a clean URL for the JSON.

        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'profile_image' => $user->profile_image, // Uses model accessor
            'is_verified' => $user->is_verified,
            'is_active' => $user->is_active,
            'notification_preferences' => $user->notification_preferences,
            'age' => $age,
            'wallet_balance' => TenantCredit::getBalance($user->id) / 100,
            'sex' => $user->sex,
            'identified_as' => $user->identified_as,
            'date_of_birth' => $user->date_of_birth ? $user->date_of_birth->format('Y-m-d') : null,
            'tenant_profile' => $tenantProfile ? [
                'move_in_date' => $tenantProfile->move_in_date ? $tenantProfile->move_in_date->format('Y-m-d') : null,
                'move_out_date' => $tenantProfile->move_out_date ? $tenantProfile->move_out_date->format('Y-m-d') : null,
                'status' => $tenantProfile->status,
                'notes' => $tenantProfile->notes,
                'emergency_contact_name' => $tenantProfile->emergency_contact_name,
                'emergency_contact_phone' => $tenantProfile->emergency_contact_phone,
                'emergency_contact_relationship' => $tenantProfile->emergency_contact_relationship,
                'current_address' => $tenantProfile->current_address,
                'preference' => $tenantProfile->preference,
            ] : null,
        ];
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
                    'regex:/[a-z]/',
                    'regex:/[A-Z]/',
                    'regex:/[0-9]/',
                ],
            ], [
                'new_password.regex' => 'The password must contain at least one uppercase letter, one lowercase letter, and one number.',
            ]);

            $userId = Auth::id();
            $user = User::findOrFail($userId);

            // Check current password
            if (! Hash::check($validated['current_password'], $user->password)) {
                return response()->json([
                    'message' => 'Current password is incorrect',
                ], 422);
            }

            // Update password directly
            DB::table('users')
                ->where('id', $userId)
                ->update(['password' => Hash::make($validated['new_password'])]);

            return response()->json([
                'message' => 'Password changed successfully',
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to change password',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
