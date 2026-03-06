<?php

namespace App\Channels;

use Illuminate\Notifications\Notification;
use App\Models\Notification as NotificationModel;

class DatabaseChannel
{
    /**
     * Send the given notification.
     *
     * @param  mixed  $notifiable
     * @param  \Illuminate\Notifications\Notification  $notification
     * @return void
     */
    public function send($notifiable, Notification $notification)
    {
        $data = $notification->toDatabase($notifiable);

        return NotificationModel::create([
            'user_id' => $notifiable->id,
            'type'    => $data['type'] ?? 'general',
            'title'   => $data['title'] ?? 'New Notification',
            'message' => $data['message'] ?? '',
            'data'    => $data['data'] ?? $data,
            'is_read' => false,
        ]);
    }
}
