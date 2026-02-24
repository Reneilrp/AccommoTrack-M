<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LandlordApprovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct()
    {
        //
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
        $loginUrl = config('app.frontend_url', 'http://192.168.43.142:5173') . '/login';

        return (new MailMessage)
            ->subject('🎉 Your Landlord Registration Has Been Approved!')
            ->greeting('Congratulations, ' . $notifiable->first_name . '!')
            ->line('Great news! Your landlord registration with AccommoTrack has been approved.')
            ->line('You can now:')
            ->line('• Create and publish property listings')
            ->line('• Manage rooms and tenants')
            ->line('• Accept bookings and payments')
            ->line('• Access all landlord features')
            ->action('Log In to Your Dashboard', $loginUrl)
            ->line('Thank you for choosing AccommoTrack to manage your properties!')
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
            'type' => 'landlord_approved',
            'message' => 'Your landlord registration has been approved.',
        ];
    }
}
