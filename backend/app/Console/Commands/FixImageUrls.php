<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FixImageUrls extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:image-urls {--old=http://localhost:8000} {--new=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Replace old base URLs in image paths with the new APP_URL';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $oldUrl = $this->option('old');
        $newUrl = $this->option('new') ?: config('app.url');

        // Ensure URLs don't have trailing slashes for consistency
        $oldUrl = rtrim($oldUrl, '/');
        $newUrl = rtrim($newUrl, '/');

        if ($oldUrl === $newUrl) {
            $this->error("Old URL and New URL are the same: $newUrl. Nothing to do.");
            return;
        }

        $this->info("Replacing '$oldUrl' with '$newUrl' in database...");

        // Fix Room Images
        $roomImages = DB::table('room_images')->where('image_url', 'like', "$oldUrl%")->get();
        $this->info("Found {$roomImages->count()} room images to update.");
        
        $bar = $this->output->createProgressBar($roomImages->count());
        $bar->start();

        foreach ($roomImages as $image) {
            $newImageUrl = Str::replaceFirst($oldUrl, $newUrl, $image->image_url);
            DB::table('room_images')
                ->where('id', $image->id)
                ->update(['image_url' => $newImageUrl]);
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();

        // Fix Property Images
        $propertyImages = DB::table('property_images')->where('image_url', 'like', "$oldUrl%")->get();
        $this->info("Found {$propertyImages->count()} property images to update.");

        $bar = $this->output->createProgressBar($propertyImages->count());
        $bar->start();

        foreach ($propertyImages as $image) {
            $newImageUrl = Str::replaceFirst($oldUrl, $newUrl, $image->image_url);
            DB::table('property_images')
                ->where('id', $image->id)
                ->update(['image_url' => $newImageUrl]);
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();

        $this->info("Done! Image URLs updated.");
    }
}
