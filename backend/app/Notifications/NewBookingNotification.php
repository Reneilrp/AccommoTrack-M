<?php

namespace App\Notifications;

use App\Channels\DatabaseChannel;
use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewBookingNotification extends Notification
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
     * Data stored in the notifications table (data column).
     */
    public function toArray(object $notifiable): array
    {
        $tenantName = $this->booking->guest_name;
        if (! $tenantName && $this->booking->tenant) {
            $tenantName = trim($this->booking->tenant->first_name.' '.$this->booking->tenant->last_name);
        }
        $tenantName = $tenantName ?: 'A tenant';

        // Use the human-facing room number, not internal room_id.
        $roomNumber = $this->booking->room?->room_number;
        if (! $roomNumber && $this->booking->room_id) {
            $roomNumber = \App\Models\Room::where('id', $this->booking->room_id)->value('room_number');
        }
        $roomLabel = $roomNumber ? "room {$roomNumber}" : 'a room';

        return [
            'type' => 'booking',
            'title' => 'New Booking Request',
            'message' => "{$tenantName} has submitted a booking request for {$roomLabel}.",
            'booking_id' => $this->booking->id,
            'reference' => $this->booking->booking_reference,
            'room_number' => $roomNumber,
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
