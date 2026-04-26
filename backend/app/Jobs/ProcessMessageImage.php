<?php

namespace App\Jobs;

use App\Models\Message;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Illuminate\Support\Facades\Log;

class ProcessMessageImage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 60;

    public function __construct(protected int $messageId)
    {
    }

    public function handle()
    {
        $message = Message::find($this->messageId);
        if (!$message || !$message->image_url) return;

        $disk = config('filesystems.default');
        $rawPath = $message->image_url;
        
        if (!Storage::disk($disk)->exists($rawPath)) return;

        try {
            $manager = new ImageManager(new Driver);
            $imageData = Storage::disk($disk)->get($rawPath);
            
            $image = $manager->read($imageData);
            $image->scaleDown(width: 1920);
            $encoded = $image->toWebp(80);

            $filename = 'processed_' . pathinfo($rawPath, PATHINFO_FILENAME) . '.webp';
            $newPath = 'message_images/' . $filename;

            Storage::disk($disk)->put($newPath, (string) $encoded);
            
            // Update DB and delete raw file
            $message->update(['image_url' => $newPath]);
            Storage::disk($disk)->delete($rawPath);
            
            unset($image, $encoded, $imageData);
        } catch (\Exception $e) {
            Log::error("Message image processing failed for ID {$this->messageId}: " . $e->getMessage());
        }
    }
}
