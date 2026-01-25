<?php

namespace App\Http\Controllers;

use App\Models\LandlordVerification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class LandlordVerificationController extends Controller
{
    public function store(Request $request)
    {
        // First validate everything
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8',
            'valid_id_type' => 'required|string|max:255',
            'valid_id_other' => 'nullable|string|max:255',
            'valid_id' => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240', // Increased limit to 10MB
            'permit' => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'agree' => 'accepted',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            // 1. Create User
            $user = User::create([
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'phone' => $request->phone,
                'password' => Hash::make($request->password),
                'role' => 'landlord',
                'is_active' => true,
                'is_verified' => false, // Set to false until admin approves
            ]);

            // 2. Store files
            $validIdPath = $request->file('valid_id')->store('landlord_ids', 'public');
            $permitPath = $request->file('permit')->store('landlord_permits', 'public');

            // 3. Create Verification Record
            $verification = LandlordVerification::create([
                'user_id' => $user->id,
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'valid_id_type' => $request->valid_id_type,
                'valid_id_other' => $request->valid_id_other,
                'valid_id_path' => $validIdPath,
                'permit_path' => $permitPath,
                'status' => 'pending',
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Registration successful. Please wait for verification.',
                'user' => $user,
                'verification' => $verification
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            // Delete uploaded files if transaction failed
            if (isset($validIdPath)) Storage::disk('public')->delete($validIdPath);
            if (isset($permitPath)) Storage::disk('public')->delete($permitPath);
            
            return response()->json(['message' => 'Registration failed: ' . $e->getMessage()], 500);
        }
    }

    public function index()
    {
        // For admin: list all landlord verifications with user info
        $verifications = LandlordVerification::with('user')->orderBy('created_at', 'desc')->get();
        return response()->json($verifications);
    }

    public function getValidIdTypes()
    {
        $types = [
            "Philippine Passport",
            "Driver's License",
            "PhilSys ID (National ID)",
            "Unified Multi-Purpose ID (UMID)",
            "Professional Regulation Commission (PRC) ID",
            "Postal ID (Digitized)",
            "Voter's ID",
            "Taxpayer Identification Number (TIN) ID",
            "PhilHealth ID",
            "Senior Citizen ID",
            "Overseas Workers Welfare Administration (OWWA) / OFW ID"
        ];
        return response()->json($types);
    }

    // Admin helper to retrieve/approve
    public function getLandlordVerifications()
    {
         // Same as index for now, usually for admin dashboard
         $verifications = LandlordVerification::with('user')->where('status', 'pending')->get();
         return response()->json($verifications);
    }
}
