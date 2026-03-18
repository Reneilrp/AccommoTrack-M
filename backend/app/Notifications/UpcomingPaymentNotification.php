<?php

namespace App\Notifications;

use App\Channels\DatabaseChannel;
use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UpcomingPaymentNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $invoice;

    /**
     * Create a new notification instance.
     */
    public function __construct(Invoice $invoice)
    {
        $this->invoice = $invoice;
    }

    /**
     * Get the notification's delivery channels.
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
        return (new MailMessage)
            ->subject('Upcoming Payment Due')
            ->line('Your payment for '.$this->invoice->reference.' is due soon.')
            ->line('Due Date: '.$this->invoice->due_date->format('F d, Y'))
            ->line('Amount: '.$this->invoice->currency.' '.number_format($this->invoice->amount_cents / 100, 2))
            ->action('View Invoice', url('/tenant/payments/'.$this->invoice->id))
            ->line('Thank you for using AccommoTrack!');
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'upcoming_payment',
            'title' => 'Upcoming Payment Due',
            'message' => 'Your payment of '.$this->invoice->currency.' '.number_format($this->invoice->amount_cents / 100, 2).' is due on '.$this->invoice->due_date->format('M d, Y'),
            'url' => '/tenant/payments/'.$this->invoice->id,
            'invoice_id' => $this->invoice->id,
        ];
    }

    /**
     * Custom method for our custom database notifications table.
     */
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
