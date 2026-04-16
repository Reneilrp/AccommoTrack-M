<?php

namespace App\Observers;

use App\Jobs\PurgeCloudflareCacheJob;
use App\Models\Review;

class ReviewObserver
{
    /**
     * Handle the Review "saved" event.
     */
    public function saved(Review $review): void
    {
        PurgeCloudflareCacheJob::dispatch();
    }

    /**
     * Handle the Review "deleted" event.
     */
    public function deleted(Review $review): void
    {
        PurgeCloudflareCacheJob::dispatch();
    }

    /**
     * Handle the Review "restored" event.
     */
    public function restored(Review $review): void
    {
        PurgeCloudflareCacheJob::dispatch();
    }

    /**
     * Handle the Review "force deleted" event.
     */
    public function forceDeleted(Review $review): void
    {
        PurgeCloudflareCacheJob::dispatch();
    }
}
