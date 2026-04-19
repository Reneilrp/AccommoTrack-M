<?php

namespace App\Notifications;

use App\Channels\DatabaseChannel;
use App\Models\TransferRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewTransferRequestNotification extends Notification
{
    use Queueable;

    protected TransferRequest $transferRequest;

    public function __construct(TransferRequest $transferRequest)
    {
        $this->transferRequest = $transferRequest;
    }

    /**
     * Deliver via database so the frontend dropdown can poll it.
     */
    public function via(object $notifiable): array
    {
        return [DatabaseChannel::class];
    }

    /**
     * Data stored in the notifications table (data column).
     */
    public function toArray(object $notifiable): array
    {
        $tenant = $this->transferRequest->tenant;
        $tenantName = $tenant ? trim($tenant->first_name . ' ' . $tenant->last_name) : 'A tenant';
        
        $fromRoom = $this->transferRequest->currentRoom?->room_number ?? 'Unknown';
        $toRoom = $this->transferRequest->requestedRoom?->room_number ?? 'Unknown';

        return [
            'type' => 'transfer',
            'title' => 'New Transfer Request',
            'message' => "{$tenantName} has requested to transfer from room {$fromRoom} to room {$toRoom}.",
            'transfer_id' => $this->transferRequest->id,
            'booking_id' => $this->transferRequest->booking_id,
            'from_room' => $fromRoom,
            'to_room' => $toRoom,
        ];
    }

    /**
     * Custom method for our custom database notifications table.
     */
    public function toDatabase(object $notifiable): array
    {
        $data = $this->toArray($notifiable);

        return [
            'type' => $data['type'],
            'title' => $data['title'],
            'message' => $data['message'],
            'data' => $data,
        ];
    }
}
