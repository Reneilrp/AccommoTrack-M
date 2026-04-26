<?php

namespace App\Observers;

use App\Jobs\PurgeCloudflareCacheJob;

class PublicCacheObserver
{
    /**
     * Handle the "saved" event.
     */
    public function saved($model): void
    {
        PurgeCloudflareCacheJob::markAsPending();
    }

    /**
     * Handle the "deleted" event.
     */
    public function deleted($model): void
    {
        PurgeCloudflareCacheJob::markAsPending();
    }

    /**
     * Handle the "restored" event.
     */
    public function restored($model): void
    {
        PurgeCloudflareCacheJob::markAsPending();
    }

    /**
     * Handle the "force deleted" event.
     */
    public function forceDeleted($model): void
    {
        PurgeCloudflareCacheJob::markAsPending();
    }
}
