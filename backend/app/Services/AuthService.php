<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Exceptions\AccountBlockedException;
use App\Exceptions\PendingVerificationException;

class AuthService
{
    /**
     * Register a new user.
     *
     * @param array $data
     * @return User
     */
    public function register(array $data): User
    {
        return User::create([
            'first_name' => $data['first_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'phone' => $data['phone'] ?? null,
            'is_verified' => false,
            'is_active' => true,
        ]);
    }

    /**
     * Log a user in.
     *
     * @param array $credentials
     * @return User
     * @throws ValidationException
     * @throws AccountBlockedException
     * @throws PendingVerificationException
     */
    public function login(array $credentials): User
    {
        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
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
            
            if (($verification && $verification->status === 'pending') || (!$verification && !$user->is_verified)) {
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
