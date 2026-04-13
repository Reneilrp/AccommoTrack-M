<?php

namespace App\Notifications;

use App\Channels\DatabaseChannel;
use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ExtensionReminderNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Booking $booking,
        private readonly int $daysRemaining = 1,
    ) {
    }

    public function via(object $notifiable): array
    {
        return [DatabaseChannel::class];
    }

    private function buildMessage(): string
    {
        $propertyTitle = $this->booking->property?->title ?? 'your property';
        $roomNumber = $this->booking->room?->room_number;
        $roomLabel = $roomNumber ? " (Room {$roomNumber})" : '';

        if ($this->daysRemaining <= 1) {
            return "Your stay at {$propertyTitle}{$roomLabel} ends tomorrow. Tap Extend in My Bookings if you want to continue.";
        }

        return "Your stay at {$propertyTitle}{$roomLabel} ends in {$this->daysRemaining} days. Tap Extend in My Bookings if you want to continue.";
    }

    public function toArray(object $notifiable): array
    {
        $targetEndDate = optional($this->booking->end_date)->format('Y-m-d');

        return [
            'type' => 'extension_reminder',
            'title' => $this->daysRemaining <= 1 ? 'Stay Ends Tomorrow' : 'Upcoming Stay End',
            'message' => $this->buildMessage(),
            'url' => '/tenant/my-bookings',
            'booking_id' => $this->booking->id,
            'property_id' => $this->booking->property_id,
            'room_id' => $this->booking->room_id,
            'target_end_date' => $targetEndDate,
            'days_remaining' => $this->daysRemaining,
        ];
    }

    public function toDatabase(object $notifiable): array
    {
        $data = $this->toArray($notifiable);

        return [
            'type' => $data['type'] ?? 'notification',
            'title' => $data['title'],
            'message' => $data['message'],
            'data' => $data,
        ];
    }
}
