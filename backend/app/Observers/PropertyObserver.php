<?php

namespace App\Observers;

use App\Models\Property;
use App\Jobs\PurgeCloudflareCacheJob;

class PropertyObserver
{
    /**
     * Handle the Property "saved" event (covers created and updated).
     */
    public function saved(Property $property): void
    {
        PurgeCloudflareCacheJob::dispatch();
    }

    /**
     * Handle the Property "deleted" event.
     */
    public function deleted(Property $property): void
    {
        PurgeCloudflareCacheJob::dispatch();
    }

    /**
     * Handle the Property "restored" event.
     */
    public function restored(Property $property): void
    {
        PurgeCloudflareCacheJob::dispatch();
    }

    /**
     * Handle the Property "force deleted" event.
     */
    public function forceDeleted(Property $property): void
    {
        PurgeCloudflareCacheJob::dispatch();
    }
}
