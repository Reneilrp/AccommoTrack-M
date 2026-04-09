<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class EdgeCacheMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Do not cache error responses or non-successful requests
        if (!$response->isSuccessful()) {
            return $response;
        }

        // Secondary Failsafe: NEVER cache if a user is currently authenticated in the request
        // (Even though this middleware should only be applied to public routes)
        if (Auth::guard('sanctum')->check() || Auth::check()) {
            return $response;
        }

        // Add Cache-Control headers for Cloudflare / Browsers to cache this for 5 minutes (300 seconds)
        $response->headers->set('Cache-Control', 'public, max-age=300');

        return $response;
    }
}
