<?php

namespace App\Observers;

use App\Jobs\PurgeCloudflareCacheJob;
use App\Models\Property;

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
     * Handle the Property "updated" event.
     */
    public function updated(Property $property): void
    {
        // Check if property was transitioned to "hidden" (unpublished)
        if ($property->isDirty('is_published') && ! $property->is_published) {
            // Dispatch immediately in case queue workers aren't running
            PurgeCloudflareCacheJob::dispatchSync();

            // Also explicitly clear Laravel cache for the property if any
            try {
                \Illuminate\Support\Facades\Artisan::call('cache:clear');
            } catch (\Exception $e) {
                // Ignore errors
            }
        }
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
