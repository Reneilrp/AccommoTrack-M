<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsLandlord
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(403, 'Unauthorized.');
        }

        if (!in_array($user->role, ['landlord', 'caretaker'])) {
            abort(403, 'Landlord or caretaker access only.');
        }

        // Additional check for unverified landlords
        if ($user->role === 'landlord') {
            $verification = \App\Models\LandlordVerification::where('user_id', $user->id)->first();
            if (!$verification || $verification->status !== 'approved') {
                return response()->json([
                    'message' => 'Your landlord account is still pending verification. Access to landlord features is restricted until approved.',
                    'status' => $verification ? $verification->status : 'not_submitted'
                ], 403);
            }
        }

        return $next($request);
    }
}
