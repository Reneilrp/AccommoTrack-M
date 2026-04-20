<?php

namespace App\Jobs;

use App\Services\CloudflareService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

use Illuminate\Support\Facades\Cache;

class PurgeCloudflareCacheJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private const CACHE_KEY = 'cloudflare_purge_pending';

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Mark that a purge is needed without dispatching a job immediately.
     */
    public static function markAsPending(): void
    {
        // Set the flag in cache. We give it a long TTL just in case,
        // but it will be cleared as soon as the job runs.
        Cache::put(self::CACHE_KEY, true, now()->addHours(12));
    }

    /**
     * Dispatch the job only if a purge has been marked as pending.
     */
    public static function dispatchIfPending(): void
    {
        if (Cache::has(self::CACHE_KEY)) {
            self::dispatch();
        }
    }

    /**
     * Execute the job.
     */
    public function handle(CloudflareService $cloudflareService): void
    {
        // Simply call the purge method so it doesn't block the frontend response
        $success = $cloudflareService->purgeEverything();

        if ($success) {
            // Clear the pending flag if the purge was successful
            Cache::forget(self::CACHE_KEY);
        }
    }
}
