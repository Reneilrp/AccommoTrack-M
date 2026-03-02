<?php

namespace App\Notifications;

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
        return ['database'];
    }

    /**
     * Data stored in the notifications table (data column).
     */
    public function toArray(object $notifiable): array
    {
        $tenantName = $this->booking->guest_name;
        if (! $tenantName && $this->booking->tenant) {
            $tenantName = trim($this->booking->tenant->first_name . ' ' . $this->booking->tenant->last_name);
        }
        $tenantName = $tenantName ?: 'A tenant';

        return [
            'type'       => 'booking',
            'title'      => 'New Booking Request',
            'message'    => "{$tenantName} has submitted a booking request for room #{$this->booking->room_id}.",
            'booking_id' => $this->booking->id,
            'reference'  => $this->booking->booking_reference,
        ];
    }
}
