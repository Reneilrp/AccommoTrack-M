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
                'profile_image', 'is_verified', 'is_active'
            ])->findOrFail($userId);

            // Get tenant profile directly
            $tenantProfile = TenantProfile::where('user_id', $userId)
                ->select([
                    'move_in_date', 'move_out_date', 'status', 'notes',
                    'emergency_contact_name', 'emergency_contact_phone', 
                    'emergency_contact_relationship', 'current_address', 
                    'preference', 'date_of_birth'
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
                'age'            => $age,
                'tenant_profile' => $tenantProfile ? [
                    'move_in_date'                => $tenantProfile->move_in_date,
                    'move_out_date'               => $tenantProfile->move_out_date,
                    'status'                      => $tenantProfile->status,
                    'notes'                       => $tenantProfile->notes,
                    'emergency_contact_name'      => $tenantProfile->emergency_contact_name,
                    'emergency_contact_phone'     => $tenantProfile->emergency_contact_phone,
                    'emergency_contact_relationship' => $tenantProfile->emergency_contact_relationship,
                    'current_address'             => $tenantProfile->current_address,
                    'preference'                  => $tenantProfile->preference,
                    'date_of_birth'               => $tenantProfile->date_of_birth,
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

                // TenantProfile fields
                'date_of_birth'                 => 'nullable|date',
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

            // Update User table directly
            $userData = [
                'first_name'  => $validated['first_name'] ?? $user->first_name,
                'middle_name' => $validated['middle_name'] ?? $user->middle_name,
                'last_name'   => $validated['last_name'] ?? $user->last_name,
                'email'       => $validated['email'] ?? $user->email,
                'phone'       => $validated['phone'] ?? $user->phone,
            ];

            // Handle profile image upload
            if ($request->hasFile('profile_image')) {
                // Delete old image if exists
                if ($user->profile_image) {
                    Storage::disk('public')->delete($user->profile_image);
                }
                $path = $request->file('profile_image')->store('profile_images', 'public');
                $userData['profile_image'] = $path;
            }

            User::where('id', $userId)->update($userData);

            // Update or create TenantProfile directly
            $tenantProfileData = [
                'date_of_birth'                 => $validated['date_of_birth'] ?? null,
                'emergency_contact_name'        => $validated['emergency_contact_name'] ?? null,
                'emergency_contact_phone'       => $validated['emergency_contact_phone'] ?? null,
                'emergency_contact_relationship'=> $validated['emergency_contact_relationship'] ?? null,
                'current_address'               => $validated['current_address'] ?? null,
                'preference'                    => $validated['preference'] ?? null,
                'notes'                         => $validated['notes'] ?? null,
                'move_in_date'                  => $validated['move_in_date'] ?? null,
                'move_out_date'                 => $validated['move_out_date'] ?? null,
                'status'                        => $validated['status'] ?? null,
            ];

            TenantProfile::updateOrCreate(
                ['user_id' => $userId],
                $tenantProfileData
            );

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