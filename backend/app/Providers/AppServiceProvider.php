<?php

namespace App\Providers;

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
        // CORS headers are managed by Laravel's CORS middleware (config/cors.php).
        // Remove manual header() calls to avoid duplicate/multiple Access-Control-Allow-Origin
        // values which cause browsers to reject requests. See config/cors.php for allowed
        // origins and other CORS settings.
    }
}
