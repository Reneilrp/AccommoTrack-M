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

        if (!$user || !in_array($user->role, ['landlord', 'caretaker'])) {
            abort(403, 'Landlord or caretaker access only.');
        }

        return $next($request);
    }
}
