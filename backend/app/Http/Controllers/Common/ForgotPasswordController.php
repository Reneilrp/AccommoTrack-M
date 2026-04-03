<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
use App\Mail\ResetPasswordCode;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class ForgotPasswordController extends Controller
{
    /**
     * Send OTP Code to Email
     */
    public function sendCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Invalid email address.'], 422);
        }

        $email = $request->email;
        $user = User::where('email', $email)->first();

        // If user doesn't exist, still return success to prevent enumeration
        if (! $user) {
            return response()->json(['message' => 'If your email is registered, a reset code has been sent.'], 200);
        }

        // Prevent blocked users from resetting password
        if ($user->is_blocked) {
            return response()->json(['message' => 'Your account has been blocked. Please contact support.'], 403);
        }

        $code = rand(100000, 999999);

        // Remove old codes for this email
        DB::table('password_reset_codes')->where('email', $email)->delete();

        // Save new code
        DB::table('password_reset_codes')->insert([
            'email' => $email,
            'code' => $code,
            'created_at' => now(),
        ]);

        // Send Email
        try {
            Mail::to($email)->send(new ResetPasswordCode($code));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to send email. Please try again later.'], 500);
        }

        return response()->json(['message' => 'If your email is registered, a reset code has been sent.'], 200);
    }

    /**
     * Verify OTP Code
     */
    public function verifyCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'code' => 'required|digits:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Invalid data.', 'errors' => $validator->errors()], 422);
        }

        $record = DB::table('password_reset_codes')
            ->where('email', $request->email)
            ->where('code', $request->code)
            ->first();

        if (! $record) {
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
            'email' => 'required|email',
            'code' => 'required|digits:6',
            'password' => 'required|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed.', 'errors' => $validator->errors()], 422);
        }

        // Verify code again to prevent bypassing step 2
        $record = DB::table('password_reset_codes')
            ->where('email', $request->email)
            ->where('code', $request->code)
            ->first();

        if (! $record || Carbon::parse($record->created_at)->addMinutes(10)->isPast()) {
            return response()->json(['message' => 'Invalid or expired code.'], 400);
        }

        // Update User Password
        $user = User::where('email', $request->email)->first();

        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if ($user->is_blocked) {
            return response()->json(['message' => 'Your account has been blocked. Please contact support.'], 403);
        }

        // Prevent reusing the same password
        if (Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'New password cannot be the same as your current password.',
                'errors' => ['password' => ['You cannot use your old password. Please choose a new one.']],
            ], 422);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        // Delete the code so it can't be used again
        DB::table('password_reset_codes')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Password reset successfully. You can now login.'], 200);
    }
}
