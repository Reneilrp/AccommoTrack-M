<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use App\Models\User;
use App\Models\TenantProfile;

class TenantSettingsController extends Controller
{
    public function getProfile()
    {
        try {
            $userId = Auth::id();
            
            // Get user directly
            $user = User::select([
                'id', 'first_name', 'middle_name', 'last_name', 'email', 'phone', 
                'profile_image', 'is_verified', 'is_active', 'notification_preferences'
            ])->findOrFail($userId);

            // Get tenant profile directly
            $tenantProfile = TenantProfile::where('user_id', $userId)
                ->select([
                    'move_in_date', 'move_out_date', 'status', 'notes',
                    'emergency_contact_name', 'emergency_contact_phone', 
                    'emergency_contact_relationship', 'current_address', 
                    'preference', 'date_of_birth', 'gender'
                ])
                ->first();

            // Calculate age manually (since accessor might not work in IDE)
            $age = null;
            if ($tenantProfile && $tenantProfile->date_of_birth) {
                $birthDate = \Carbon\Carbon::parse($tenantProfile->date_of_birth);
                $age = $birthDate->diffInYears(\Carbon\Carbon::now());
            }

            // Format profile image URL
            $profileImage = null;
            if ($user->profile_image) {
                $profileImage = asset('storage/' . $user->profile_image);
            }

            return response()->json([
                'id'             => $user->id,
                'first_name'     => $user->first_name,
                'middle_name'    => $user->middle_name,
                'last_name'      => $user->last_name,
                'email'          => $user->email,
                'phone'          => $user->phone,
                'profile_image'  => $profileImage,
                'is_verified'    => $user->is_verified,
                'is_active'      => $user->is_active,
                'notification_preferences' => $user->notification_preferences,
                'age'            => $age,
                'tenant_profile' => $tenantProfile ? [
                    'move_in_date'                => $tenantProfile->move_in_date ? $tenantProfile->move_in_date->format('Y-m-d') : null,
                    'move_out_date'               => $tenantProfile->move_out_date ? $tenantProfile->move_out_date->format('Y-m-d') : null,
                    'status'                      => $tenantProfile->status,
                    'notes'                       => $tenantProfile->notes,
                    'emergency_contact_name'      => $tenantProfile->emergency_contact_name,
                    'emergency_contact_phone'     => $tenantProfile->emergency_contact_phone,
                    'emergency_contact_relationship' => $tenantProfile->emergency_contact_relationship,
                    'current_address'             => $tenantProfile->current_address,
                    'preference'                  => $tenantProfile->preference,
                    'date_of_birth'               => $tenantProfile->date_of_birth ? $tenantProfile->date_of_birth->format('Y-m-d') : null,
                    'gender'                      => $tenantProfile->gender,
                ] : null
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch profile',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updateProfile(Request $request)
    {
        try {
            $userId = Auth::id();
            $user = User::findOrFail($userId);

            $validated = $request->validate([
                'first_name'                    => 'sometimes|required|string|max:255',
                'middle_name'                   => 'nullable|string|max:255',
                'last_name'                     => 'sometimes|required|string|max:255',
                'email'                         => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($userId)],
                'phone'                         => 'nullable|string|max:20',
                'profile_image'                 => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
                'notification_preferences'      => 'nullable',

                // TenantProfile fields
                'date_of_birth'                 => 'nullable|date',
                'gender'                        => 'nullable|string|max:50',
                'emergency_contact_name'        => 'nullable|string|max:255',
                'emergency_contact_phone'       => 'nullable|string|max:20',
                'emergency_contact_relationship'=> 'nullable|string|max:100',
                'current_address'               => 'nullable|string',
                'preference'                    => 'nullable', // Allow array or json
                'notes'                         => 'nullable|string',
                'move_in_date'                  => 'nullable|date',
                'move_out_date'                 => 'nullable|date',
                'status'                        => 'nullable|string',
            ]);

            DB::beginTransaction();

            // Update User table directly (only fields present in request)
            $userData = [];
            if ($request->has('first_name')) $userData['first_name'] = $validated['first_name'];
            if ($request->has('middle_name')) $userData['middle_name'] = $validated['middle_name'];
            if ($request->has('last_name')) $userData['last_name'] = $validated['last_name'];
            if ($request->has('email')) $userData['email'] = $validated['email'];
            if ($request->has('phone')) $userData['phone'] = $validated['phone'];
            if ($request->has('notification_preferences')) $userData['notification_preferences'] = $validated['notification_preferences'];

            // Handle profile image upload
            if ($request->hasFile('profile_image')) {
                // Delete old image if exists
                if ($user->profile_image) {
                    Storage::disk('public')->delete($user->profile_image);
                }
                $path = $request->file('profile_image')->store('profile_images', 'public');
                $userData['profile_image'] = $path;
            }

            if (!empty($userData)) {
                User::where('id', $userId)->update($userData);
            }

            // Update or create TenantProfile safely (merging preferences)
            $tenantProfile = TenantProfile::firstOrNew(['user_id' => $userId]);
            
            $profileFields = [
                'date_of_birth', 'gender', 'emergency_contact_name', 'emergency_contact_phone',
                'emergency_contact_relationship', 'current_address', 'notes',
                'move_in_date', 'move_out_date', 'status'
            ];

            foreach ($profileFields as $field) {
                if (array_key_exists($field, $validated)) {
                    $tenantProfile->$field = $validated[$field];
                }
            }

            // Smart merge for preferences
            if (array_key_exists('preference', $validated)) {
                $currentPrefs = $tenantProfile->preference ?? [];
                // Ensure currentPrefs is array
                if (!is_array($currentPrefs)) $currentPrefs = [];
                
                $newPrefs = $validated['preference'];
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
                'user'    => $updatedUser
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
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
                'new_password'     => 'required|string|min:8|confirmed',
            ]);

            $userId = Auth::id();
            $user = User::findOrFail($userId);

            // Check current password
            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json([
                    'message' => 'Current password is incorrect'
                ], 422);
            }

            // Update password directly
            DB::table('users')
                ->where('id', $userId)
                ->update(['password' => Hash::make($validated['new_password'])]);

            return response()->json([
                'message' => 'Password changed successfully'
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to change password',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}