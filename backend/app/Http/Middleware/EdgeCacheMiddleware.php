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

        // Add Cache-Control headers for Cloudflare to cache this for 6 hours (s-maxage=21600)
        // Set max-age=30 for local browser cache so clients re-fetch quickly when browsing
        $response->headers->set('Cache-Control', 'public, s-maxage=21600, max-age=30');

        return $response;
    }
}
