<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureUserIsAdmin
{
    /**
     * Handle an incoming request.
     * Only allow users with role === 'admin'.
     *
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (! $user || ($user->role ?? null) !== 'admin') {
            return response()->json(['message' => 'Forbidden. Admins only.'], 403);
        }

        return $next($request);
    }
}
