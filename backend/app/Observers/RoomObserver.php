<?php

namespace App\Observers;

use App\Jobs\PurgeCloudflareCacheJob;
use App\Models\Room;

class RoomObserver
{
    /**
     * Handle the Room "saved" event.
     */
    public function saved(Room $room): void
    {
        PurgeCloudflareCacheJob::markAsPending();
    }

    /**
     * Handle the Room "deleted" event.
     */
    public function deleted(Room $room): void
    {
        PurgeCloudflareCacheJob::markAsPending();
    }

    /**
     * Handle the Room "restored" event.
     */
    public function restored(Room $room): void
    {
        PurgeCloudflareCacheJob::markAsPending();
    }

    /**
     * Handle the Room "force deleted" event.
     */
    public function forceDeleted(Room $room): void
    {
        PurgeCloudflareCacheJob::markAsPending();
    }
}
