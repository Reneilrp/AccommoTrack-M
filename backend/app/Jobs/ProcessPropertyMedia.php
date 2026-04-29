<?php

namespace App\Jobs;

use App\Models\PropertyImage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use ProtoneMedia\LaravelFFMpeg\Support\FFMpeg;
use Illuminate\Support\Facades\Log;

class ProcessPropertyMedia implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public $tries = 3;

    /**
     * The number of seconds the job can run before timing out.
     */
    public $timeout = 300; // 5 minutes for heavy videos

    public function __construct(protected int $propertyImageId)
    {
    }

    public function handle()
    {
        $media = PropertyImage::find($this->propertyImageId);
        if (!$media) return;

        try {
            if ($media->media_type === 'image') {
                $this->processImage($media);
            } else if ($media->media_type === 'video') {
                $this->processVideo($media);
            }
        } catch (\Exception $e) {
            Log::error("Media processing failed for ID {$this->propertyImageId}: " . $e->getMessage());
            throw $e;
        }
    }

    private function processImage(PropertyImage $media)
    {
        $disk = config('filesystems.default');
        $rawPath = $media->image_url;
        
        if (!Storage::disk($disk)->exists($rawPath)) return;

        // User wants to avoid CPU intensive compression.
        // If the path contains "/raw/", move it to the main directory.
        if (str_contains($rawPath, '/raw/')) {
            $filename = pathinfo($rawPath, PATHINFO_BASENAME);
            $newPath = 'property_images/' . $filename;

            if ($rawPath !== $newPath) {
                Storage::disk($disk)->move($rawPath, $newPath);
                $media->update(['image_url' => $newPath]);
            }
        }
        
        // No more Intervention Image calls here to save CPU
    }

    private function processVideo(PropertyImage $media)
    {
        $disk = config('filesystems.default');
        $rawPath = $media->image_url;
        
        if (!Storage::disk($disk)->exists($rawPath)) return;

        try {
            // Check duration using FFMpeg (configured for S3 if disk is s3)
            $duration = FFMpeg::fromDisk($disk)->open($rawPath)->getDurationInSeconds();
            
            if ($duration > 60) {
                Log::warning("Video ID {$media->id} exceeds duration limit. Deleting.");
                Storage::disk($disk)->delete($rawPath);
                $media->delete();
                return;
            }

            // Move from raw to final path
            $filename = pathinfo($rawPath, PATHINFO_BASENAME);
            $newPath = 'property_videos/' . $filename;
            
            Storage::disk($disk)->move($rawPath, $newPath);
            
            // Update DB
            $media->update(['image_url' => $newPath]);

        } catch (\Exception $e) {
            Log::error("FFMpeg failed for video {$media->id}: " . $e->getMessage());
        }
    }
}
