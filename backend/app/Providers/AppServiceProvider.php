<?php

namespace App\Providers;

use App\Models\Property;
use App\Models\Review;
use App\Models\Room;
use App\Observers\PropertyObserver;
use App\Observers\ReviewObserver;
use App\Observers\RoomObserver;
use App\Observers\TenantDashboardObserver;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Define rate limiter for authentication-sensitive routes
        RateLimiter::for('auth-attempts', function (Request $request) {
            return Limit::perMinute(5)->by($request->email ?: $request->ip());
        });

        // Global API rate limiter
        RateLimiter::for('global', function (Request $request) {
            return $request->user()
                ? Limit::perMinute(180)->by($request->user()->id)
                : Limit::perMinute(60)->by($request->ip());
        });

        // CORS headers are managed by Laravel's CORS middleware (config/cors.php).
        // Remove manual header() calls to avoid duplicate/multiple Access-Control-Allow-Origin
        // values which cause browsers to reject requests. See config/cors.php for allowed
        // origins and other CORS settings.

        // Register Model Observers for Cloudflare On-Demand Cache Purging
        Property::observe(PropertyObserver::class);
        Room::observe(RoomObserver::class);
        Review::observe(ReviewObserver::class);
        
        // Supporting models that impact public data
        \App\Models\PropertyImage::observe(\App\Observers\PublicCacheObserver::class);
        \App\Models\RoomImage::observe(\App\Observers\PublicCacheObserver::class);
        \App\Models\Addon::observe(\App\Observers\PublicCacheObserver::class);
        \App\Models\Amenity::observe(\App\Observers\PublicCacheObserver::class);
        \App\Models\Booking::observe(\App\Observers\PublicCacheObserver::class);

        // Dashboard Cache Invalidation
        $dashboardObserverModels = [
            \App\Models\Booking::class,
            \App\Models\Invoice::class,
            \App\Models\PaymentTransaction::class,
            \App\Models\MaintenanceRequest::class,
            \App\Models\Notification::class,
        ];

        foreach ($dashboardObserverModels as $model) {
            $model::observe(TenantDashboardObserver::class);
            $model::observe(\App\Observers\LandlordDashboardObserver::class);
        }
    }
}
