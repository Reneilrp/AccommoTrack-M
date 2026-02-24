<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use App\Mail\ResetPasswordCode;
use Carbon\Carbon;

class ForgotPasswordController extends Controller
{
    /**
     * Send OTP Code to Email
     */
    public function sendCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Email not found or invalid.', 'errors' => $validator->errors()], 422);
        }

        $email = $request->email;
        $code = rand(100000, 999999);

        // Remove old codes for this email
        DB::table('password_reset_codes')->where('email', $email)->delete();

        // Save new code
        DB::table('password_reset_codes')->insert([
            'email' => $email,
            'code' => $code,
            'created_at' => now()
        ]);

        // Send Email
        try {
            Mail::to($email)->send(new ResetPasswordCode($code));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to send email. Please try again later.'], 500);
        }

        return response()->json(['message' => 'Reset code sent to your email.'], 200);
    }

    /**
     * Verify OTP Code
     */
    public function verifyCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'code' => 'required|digits:6'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Invalid data.', 'errors' => $validator->errors()], 422);
        }

        $record = DB::table('password_reset_codes')
            ->where('email', $request->email)
            ->where('code', $request->code)
            ->first();

        if (!$record) {
            return response()->json(['message' => 'Invalid code.'], 400);
        }

        // Check expiration (10 mins)
        if (Carbon::parse($record->created_at)->addMinutes(10)->isPast()) {
            return response()->json(['message' => 'Code expired.'], 400);
        }

        return response()->json(['message' => 'Code verified successfully.'], 200);
    }

    /**
     * Reset Password
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'code' => 'required|digits:6',
            'password' => 'required|min:8|confirmed'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed.', 'errors' => $validator->errors()], 422);
        }

        // Verify code again to prevent bypassing step 2
        $record = DB::table('password_reset_codes')
            ->where('email', $request->email)
            ->where('code', $request->code)
            ->first();

        if (!$record || Carbon::parse($record->created_at)->addMinutes(10)->isPast()) {
            return response()->json(['message' => 'Invalid or expired code.'], 400);
        }

        // Update User Password
        $user = User::where('email', $request->email)->first();

        // Prevent reusing the same password
        if (Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'New password cannot be the same as your current password.',
                'errors' => ['password' => ['You cannot use your old password. Please choose a new one.']]
            ], 422);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        // Delete the code so it can't be used again
        DB::table('password_reset_codes')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Password reset successfully. You can now login.'], 200);
    }
}
