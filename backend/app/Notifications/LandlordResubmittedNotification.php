<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\User;

class LandlordResubmittedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected User $landlord;

    /**
     * Create a new notification instance.
     */
    public function __construct(User $landlord)
    {
        $this->landlord = $landlord;
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
        $adminUrl = config('app.frontend_url', 'http://localhost:5173') . '/admin/landlord-approval';
        $landlordName = trim($this->landlord->first_name . ' ' . $this->landlord->last_name);

        return (new MailMessage)
            ->subject('🔔 Landlord Verification Resubmission Requires Review')
            ->greeting('Hello Admin!')
            ->line('A landlord has resubmitted their verification documents for review.')
            ->line('**Landlord Details:**')
            ->line('• Name: ' . $landlordName)
            ->line('• Email: ' . $this->landlord->email)
            ->line('Please review the updated documents at your earliest convenience.')
            ->action('Review Verification Request', $adminUrl)
            ->line('Thank you for helping maintain the quality of AccommoTrack!')
            ->salutation('AccommoTrack System');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'landlord_resubmitted',
            'message' => 'A landlord has resubmitted verification documents.',
            'landlord_id' => $this->landlord->id,
            'landlord_name' => trim($this->landlord->first_name . ' ' . $this->landlord->last_name),
        ];
    }
}
