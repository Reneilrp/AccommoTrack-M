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
            // User wants to avoid CPU intensive compression.
            // If the path contains "/raw/", move it to the main directory.
            if (str_contains($rawPath, '/raw/')) {
                $filename = pathinfo($rawPath, PATHINFO_BASENAME);
                $newPath = 'message_images/' . $filename;

                if ($rawPath !== $newPath) {
                    Storage::disk($disk)->move($rawPath, $newPath);
                    $message->update(['image_url' => $newPath]);
                }
            }
        } catch (\Exception $e) {
            Log::error("Message image processing failed for ID {$this->messageId}: " . $e->getMessage());
        }
    }
}
