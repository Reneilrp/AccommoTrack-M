<?php

namespace App\Notifications;

use App\Channels\DatabaseChannel;
use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class MoveOutRequestedNotification extends Notification
{
    use Queueable;

    protected Booking $booking;

    public function __construct(Booking $booking)
    {
        $this->booking = $booking;
    }

    /**
     * Deliver via database so the frontend dropdown can poll it.
     */
    public function via(object $notifiable): array
    {
        return [DatabaseChannel::class];
    }

    /**
     * Data stored in the custom notifications table.
     */
    public function toArray(object $notifiable): array
    {
        $tenantName = $this->booking->tenant ? trim($this->booking->tenant->first_name.' '.$this->booking->tenant->last_name) : ($this->booking->guest_name ?: 'A tenant');
        $roomNumber = optional($this->booking->room)->room_number ?? 'Unknown Room';

        return [
            'type' => 'move_out_notice',
            'title' => 'Move-Out Notice Submitted',
            'message' => "{$tenantName} (Room {$roomNumber}) has submitted a move-out notice for {$this->booking->end_date}.",
            'booking_id' => $this->booking->id,
            'reference' => $this->booking->booking_reference,
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
