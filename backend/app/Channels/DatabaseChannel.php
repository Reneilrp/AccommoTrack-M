<?php

namespace App\Channels;

use App\Models\Notification as NotificationModel;
use App\Models\User;
use App\Services\ExpoPushNotificationService;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class DatabaseChannel
{
    public function __construct(protected ExpoPushNotificationService $expoPushNotificationService)
    {
    }

    /**
     * Send the given notification.
     *
     * @param  mixed  $notifiable
     * @return void
     */
    public function send($notifiable, Notification $notification)
    {
        $data = $notification->toDatabase($notifiable);

        $createdNotification = NotificationModel::create([
            'user_id' => $notifiable->id,
            'type' => $data['type'] ?? 'general',
            'title' => $data['title'] ?? 'New Notification',
            'message' => $data['message'] ?? '',
            'data' => $data['data'] ?? $data,
            'is_read' => false,
        ]);

        if ($notifiable instanceof User) {
            try {
                $notificationData = is_array($createdNotification->data) ? $createdNotification->data : [];

                $this->expoPushNotificationService->sendToUser($notifiable, [
                    'title' => $createdNotification->title,
                    'message' => $createdNotification->message,
                    'data' => array_merge($notificationData, [
                        'notification_id' => $createdNotification->id,
                        'notification_type' => $createdNotification->type,
                    ]),
                ]);
            } catch (\Throwable $e) {
                Log::warning('Failed to dispatch Expo push notification', [
                    'user_id' => $notifiable->id,
                    'notification_id' => $createdNotification->id,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        return $createdNotification;
    }
}
