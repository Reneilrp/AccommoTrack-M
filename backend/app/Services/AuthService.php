<?php

namespace App\Services;

use App\Exceptions\AccountBlockedException;
use App\Exceptions\PendingVerificationException;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /**
     * Register a new user and generate an OTP.
     *
     * @return array{user: User, otp: string}
     */
    public function register(array $data): array
    {
        $otp = (string) random_int(100000, 999999);
        $otpExpiresAt = Carbon::now()->addMinutes(15);

        $user = User::create([
            'first_name' => $data['first_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'phone' => $data['phone'] ?? null,
            'date_of_birth' => $data['date_of_birth'] ?? null,
            'gender' => $data['gender'] ?? null,
            'is_verified' => false, // User is not verified until OTP is confirmed
            'is_active' => true,
            'email_otp_code' => Hash::make($otp),
            'email_otp_expires_at' => $otpExpiresAt,
        ]);

        return ['user' => $user, 'otp' => $otp];
    }

    /**
     * Log a user in.
     *
     * @throws ValidationException
     * @throws AccountBlockedException
     * @throws PendingVerificationException
     */
    public function login(array $credentials): User
    {
        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password.'],
            ]);
        }

        if ($user->is_blocked) {
            throw new AccountBlockedException('Your account has been blocked by the administrator. Please contact support for assistance.');
        }

        // Check landlord verification status
        if ($user->role === 'landlord') {
            $verification = $user->landlordVerification;

            if (($verification && $verification->status === 'pending') || (! $verification && ! $user->is_verified)) {
                throw new PendingVerificationException('Your account is still under review. Please wait for 1-3 working days for the admin to approve your request.');
            }
        }

        // Load caretaker assignment if user is a caretaker
        if ($user->role === 'caretaker') {
            $user->load('caretakerAssignment');
        }

        return $user;
    }
}
