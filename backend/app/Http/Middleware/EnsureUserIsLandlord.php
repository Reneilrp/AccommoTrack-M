<?php

namespace App\Http\Middleware;

use App\Models\LandlordVerification;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsLandlord
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(403, 'Unauthorized.');
        }

        if (! in_array($user->role, ['landlord', 'caretaker'])) {
            abort(403, 'Landlord or caretaker access only.');
        }

        // Additional check for unverified landlords
        if ($user->role === 'landlord') {
            $verification = LandlordVerification::where('user_id', $user->id)->first();
            if (! $verification || ! in_array($verification->status, LandlordVerification::LANDLORD_ACCESS_STATUSES, true)) {
                return response()->json([
                    'message' => 'Your landlord account is not yet in an active verification stage. Access to landlord features is restricted.',
                    'status' => $verification ? $verification->status : 'not_submitted',
                ], 403);
            }
        }

        return $next($request);
    }
}
