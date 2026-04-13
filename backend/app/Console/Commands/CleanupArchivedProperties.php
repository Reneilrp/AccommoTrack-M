<?php

namespace App\Console\Commands;

use App\Models\Property;
use App\Services\PropertyService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CleanupArchivedProperties extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'properties:cleanup-archived';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Permanently delete properties that have been archived for more than 30 days';

    /**
     * Execute the console command.
     */
    public function handle(PropertyService $propertyService)
    {
        $this->info('Starting cleanup of old archived properties...');

        $threshold = Carbon::now()->subDays(30);

        // Fetch properties strictly deleted before the threshold
        $expiredProperties = Property::onlyTrashed()
            ->where('deleted_at', '<', $threshold)
            ->get();

        if ($expiredProperties->isEmpty()) {
            $this->info('No archived properties found older than 30 days.');
            return;
        }

        $count = $expiredProperties->count();
        $this->info("Found {$count} properties to permanently delete.");

        foreach ($expiredProperties as $property) {
            try {
                $propertyService->forceDeleteProperty($property);
                $this->line("Successfully purged property ID: {$property->id}");
            } catch (\Exception $e) {
                $this->error("Failed to purge property ID {$property->id}: " . $e->getMessage());
            }
        }

        $this->info('Cleanup complete.');
    }
}
