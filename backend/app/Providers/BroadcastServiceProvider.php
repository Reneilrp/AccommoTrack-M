<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Broadcast;

class BroadcastServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register broadcasting auth routes under the API prefix and use Sanctum for auth
        Broadcast::routes([
            'middleware' => ['auth:sanctum'],
            'prefix' => 'api',
        ]);
    }
}
