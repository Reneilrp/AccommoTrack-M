<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LandlordRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected string $reason;

    /**
     * Create a new notification instance.
     */
    public function __construct(string $reason)
    {
        $this->reason = $reason;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $loginUrl = config('app.frontend_url', 'http://localhost:5173') . '/login';

        return (new MailMessage)
            ->subject('Update on Your Landlord Registration')
            ->greeting('Hello, ' . $notifiable->first_name . '!')
            ->line('We have reviewed your landlord registration application for AccommoTrack.')
            ->line('Unfortunately, we were unable to approve your application at this time.')
            ->line('**Reason for rejection:**')
            ->line($this->reason)
            ->line('**What you can do:**')
            ->line('You can log in to your account and resubmit your documents with the necessary corrections. Please ensure:')
            ->line('• Your valid ID is clear and legible')
            ->line('• Your business/accommodation permit is up to date')
            ->line('• All documents match your registered information')
            ->action('Resubmit Your Documents', $loginUrl)
            ->line('If you have questions, please contact our support team.')
            ->salutation('Best regards, The AccommoTrack Team');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'landlord_rejected',
            'message' => 'Your landlord registration has been rejected.',
            'reason' => $this->reason,
        ];
    }
}
