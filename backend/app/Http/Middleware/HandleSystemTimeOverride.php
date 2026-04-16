<?php

namespace App\Http\Middleware;

use App\Support\SystemToggle;
use Carbon\Carbon;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HandleSystemTimeOverride
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $forcedNow = SystemToggle::getString('system_forced_now');

        if ($forcedNow && $forcedNow !== '') {
            try {
                // Set the "test now" for Carbon globally for this request
                Carbon::setTestNow(Carbon::parse($forcedNow));
            } catch (\Exception $e) {
                // If parsing fails, just ignore and use real time
                \Log::error('System forced time override failed: '.$e->getMessage());
            }
        }

        return $next($request);
    }
}
