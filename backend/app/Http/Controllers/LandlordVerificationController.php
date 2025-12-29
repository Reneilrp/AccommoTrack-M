<?php

namespace App\Http\Controllers;

use App\Models\LandlordVerification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class LandlordVerificationController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'valid_id_type' => 'required|string|max:255',
            'valid_id_other' => 'nullable|string|max:255',
            'valid_id' => 'required|file|mimes:jpg,jpeg,png,pdf|max:4096',
            'permit' => 'required|file|mimes:jpg,jpeg,png,pdf|max:4096',
        ]);

        // Store files
        $validIdPath = $request->file('valid_id')->store('landlord_ids', 'public');
        $permitPath = $request->file('permit')->store('landlord_permits', 'public');

        $verification = LandlordVerification::create([
            'user_id' => $validated['user_id'],
            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $validated['last_name'],
            'valid_id_type' => $validated['valid_id_type'],
            'valid_id_other' => $validated['valid_id_other'] ?? null,
            'valid_id_path' => $validIdPath,
            'permit_path' => $permitPath,
            'status' => 'pending',
        ]);

        return response()->json(['message' => 'Verification submitted', 'verification' => $verification], 201);
    }

    public function index()
    {
        // For admin: list all landlord verifications with user info
        $verifications = LandlordVerification::with('user')->get();
        return response()->json($verifications);
    }
}
