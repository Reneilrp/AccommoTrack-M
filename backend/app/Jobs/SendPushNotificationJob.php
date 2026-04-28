<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\ExpoPushNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendPushNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public User $user,
        public array $payload
    ) {}

    /**
     * Execute the job.
     */
    public function handle(ExpoPushNotificationService $expoService): void
    {
        $expoService->sendToUserNow($this->user, $this->payload);
    }
}
