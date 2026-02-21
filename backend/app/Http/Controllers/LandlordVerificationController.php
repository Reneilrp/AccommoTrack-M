<?php

namespace App\Http\Controllers;

use App\Models\LandlordVerification;
use App\Models\LandlordVerificationHistory;
use App\Models\User;
use App\Notifications\LandlordResubmittedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

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
    public function getMyVerification()
    {
        $user = Auth::user();
        $landlordId = $user->effectiveLandlordId();

        if (!$landlordId) {
            return response()->json([
                'message' => 'Not authorized to view verification status',
                'status' => 'error'
            ], 403);
        }
        
        $verification = LandlordVerification::with(['history' => function($query) {
            $query->orderBy('created_at', 'desc');
        }, 'reviewer:id,first_name,last_name'])
            ->where('user_id', $landlordId)
            ->first();

        if (!$verification) {
            return response()->json([
                'message' => 'No verification record found',
                'status' => 'not_submitted'
            ], 404);
        }

        $landlord = User::find($landlordId);

        return response()->json([
            'id' => $verification->id,
            'status' => $verification->status,
            'rejection_reason' => $verification->rejection_reason,
            'valid_id_type' => $verification->valid_id_type,
            'valid_id_path' => $verification->valid_id_path ? asset('storage/' . $verification->valid_id_path) : null,
            'permit_path' => $verification->permit_path ? asset('storage/' . $verification->permit_path) : null,
            'reviewed_at' => $verification->reviewed_at,
            'reviewer' => $verification->reviewer ? [
                'name' => trim($verification->reviewer->first_name . ' ' . $verification->reviewer->last_name)
            ] : null,
            'created_at' => $verification->created_at,
            'updated_at' => $verification->updated_at,
            'history' => $verification->history->map(function($h) {
                return [
                    'id' => $h->id,
                    'status' => $h->status,
                    'rejection_reason' => $h->rejection_reason,
                    'valid_id_type' => $h->valid_id_type,
                    'submitted_at' => $h->submitted_at,
                    'reviewed_at' => $h->reviewed_at,
                ];
            }),
            'user' => [
                'is_verified' => $landlord->is_verified ?? false,
            ]
        ]);
    }

    /**
     * Get verification history for current landlord
     */
    public function getVerificationHistory()
    {
        $user = Auth::user();
        
        $verification = LandlordVerification::where('user_id', $user->id)->first();
        
        if (!$verification) {
            return response()->json([]);
        }

        $history = LandlordVerificationHistory::where('landlord_verification_id', $verification->id)
            ->with('reviewer:id,first_name,last_name')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($h) {
                return [
                    'id' => $h->id,
                    'status' => $h->status,
                    'rejection_reason' => $h->rejection_reason,
                    'valid_id_type' => $h->valid_id_type,
                    'valid_id_path' => $h->valid_id_path ? asset('storage/' . $h->valid_id_path) : null,
                    'permit_path' => $h->permit_path ? asset('storage/' . $h->permit_path) : null,
                    'submitted_at' => $h->submitted_at,
                    'reviewed_at' => $h->reviewed_at,
                    'reviewer' => $h->reviewer ? trim($h->reviewer->first_name . ' ' . $h->reviewer->last_name) : null,
                ];
            });

        return response()->json($history);
    }

    /**
     * Resubmit verification documents after rejection
     */
    public function resubmit(Request $request)
    {
        $user = Auth::user();
        
        $verification = LandlordVerification::where('user_id', $user->id)->first();
        
        if (!$verification) {
            return response()->json(['message' => 'No verification record found'], 404);
        }

        if ($verification->status !== 'rejected') {
            return response()->json([
                'message' => 'You can only resubmit after your application has been rejected'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'valid_id_type' => 'required|string|max:255',
            'valid_id_other' => 'nullable|string|max:255',
            'valid_id' => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'permit' => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Save old documents to history (already done during rejection, but keep paths for reference)
            // Store new files
            $validIdPath = $request->file('valid_id')->store('landlord_ids', 'public');
            $permitPath = $request->file('permit')->store('landlord_permits', 'public');

            // Update verification record with new documents
            $verification->valid_id_type = $request->valid_id_type;
            $verification->valid_id_other = $request->valid_id_other;
            $verification->valid_id_path = $validIdPath;
            $verification->permit_path = $permitPath;
            $verification->status = 'pending';
            $verification->rejection_reason = null;
            $verification->reviewed_at = null;
            $verification->reviewed_by = null;
            $verification->save();

            DB::commit();

            // Notify admins about resubmission
            try {
                $admins = User::where('role', 'admin')->get();
                foreach ($admins as $admin) {
                    /** @var User $admin */
                    $admin->notify(new LandlordResubmittedNotification($user));
                }
            } catch (\Exception $e) {
                \Log::error('Failed to send resubmission notification to admins: ' . $e->getMessage());
            }

            return response()->json([
                'message' => 'Documents resubmitted successfully. Please wait for review.',
                'verification' => [
                    'id' => $verification->id,
                    'status' => $verification->status,
                    'valid_id_type' => $verification->valid_id_type,
                    'updated_at' => $verification->updated_at,
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            // Delete uploaded files if transaction failed
            if (isset($validIdPath)) Storage::disk('public')->delete($validIdPath);
            if (isset($permitPath)) Storage::disk('public')->delete($permitPath);
            
            return response()->json(['message' => 'Resubmission failed: ' . $e->getMessage()], 500);
        }
    }
}
