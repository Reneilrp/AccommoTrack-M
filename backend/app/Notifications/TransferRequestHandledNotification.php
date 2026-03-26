<?php

namespace App\Notifications;

use App\Channels\DatabaseChannel;
use App\Models\TransferRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class TransferRequestHandledNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected TransferRequest $transferRequest;
    protected string $action; // 'approved' | 'rejected'

    public function __construct(TransferRequest $transferRequest, string $action)
    {
        $this->transferRequest = $transferRequest;
        $this->action = $action;
    }

    public function via(object $notifiable): array
    {
        return [DatabaseChannel::class];
    }

    public function toArray(object $notifiable): array
    {
        $isApproved = $this->action === 'approved';
        $title = $isApproved ? 'Transfer Request Approved' : 'Transfer Request Rejected';

        $currentRoom = $this->transferRequest->currentRoom?->room_number ?? 'N/A';
        $requestedRoom = $this->transferRequest->requestedRoom?->room_number ?? 'N/A';
        $message = 'Your request to transfer from Room ' . $currentRoom . ' to Room ' . $requestedRoom;
        if ($isApproved) {
            $message .= ' has been approved. Please coordinate with your landlord.';
        } else {
            $message .= ' was rejected.';
            if (!empty($this->transferRequest->landlord_notes)) {
                $message .= ' Reason: "' . $this->transferRequest->landlord_notes . '"';
            }
        }

        return [
            'type' => 'transfer_request_handled',
            'title' => $title,
            'message' => $message,
            'transfer_request_id' => $this->transferRequest->id,
            'url' => '/transfers', // A generic URL for the tenant to check their transfers
        ];
    }

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
