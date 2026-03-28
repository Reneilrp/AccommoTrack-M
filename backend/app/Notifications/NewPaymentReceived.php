<?php

namespace App\Notifications;

use App\Channels\DatabaseChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewPaymentReceived extends Notification implements ShouldQueue
{
    use Queueable;

    protected bool $isPending;

    /**
     * Create a new notification instance.
     */
    public function __construct(bool $isPending = false)
    {
        $this->isPending = $isPending;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', DatabaseChannel::class];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $subject = $this->isPending ? 'Action Required: Cash Payment Verification' : 'New Payment Received';
        $line1 = $this->isPending ? 'A tenant has recorded a cash payment that requires your verification.' : 'You have received a new payment.';

        return (new MailMessage)
            ->subject($subject)
            ->line($line1)
            ->action('View Payments', url('/landlord/payments'))
            ->line('Thank you for using our application!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'payment_received',
            'title' => $this->isPending ? 'Cash Verification Required' : 'New Payment Received',
            'message' => $this->isPending ? 'A tenant has recorded a cash payment awaiting your approval.' : 'You have received a new payment.',
            'url' => '/landlord/payments',
            'is_pending' => $this->isPending,
        ];
    }

    /**
     * Custom method for our custom database notifications table.
     */
    public function toDatabase(object $notifiable): array
    {
        $data = $this->toArray($notifiable);

        return [
            'type' => $data['type'] ?? 'payment',
            'title' => $data['title'],
            'message' => $data['message'],
            'data' => $data,
        ];
    }
}
