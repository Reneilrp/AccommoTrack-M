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

    protected $reminderType;

    /**
     * Create a new notification instance.
     */
    public function __construct(Invoice $invoice, string $reminderType = 'due_3_days')
    {
        $this->invoice = $invoice;
        $this->reminderType = $reminderType;
    }

    protected function getReminderContent(): array
    {
        $amount = $this->invoice->currency.' '.number_format($this->invoice->amount_cents / 100, 2);
        $dueDateText = $this->invoice->due_date?->format('M d, Y') ?? 'N/A';

        switch ($this->reminderType) {
            case 'due_1_day':
                return [
                    'subject' => 'Payment Due Tomorrow',
                    'title' => 'Payment Due Tomorrow',
                    'message' => "Your payment of {$amount} is due tomorrow ({$dueDateText}).",
                ];

            case 'overdue_followup':
                return [
                    'subject' => 'Payment Overdue Reminder',
                    'title' => 'Payment Overdue',
                    'message' => "Your payment of {$amount} is overdue since {$dueDateText}. Please settle it as soon as possible.",
                ];

            case 'due_3_days':
            default:
                return [
                    'subject' => 'Upcoming Payment Due',
                    'title' => 'Upcoming Payment Due',
                    'message' => "Your payment of {$amount} is due in 3 days ({$dueDateText}).",
                ];
        }
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
        $content = $this->getReminderContent();

        return (new MailMessage)
            ->subject($content['subject'])
            ->line($content['message'])
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
        $content = $this->getReminderContent();

        return [
            'type' => 'billing_reminder',
            'title' => $content['title'],
            'message' => $content['message'],
            'url' => '/tenant/payments/'.$this->invoice->id,
            'invoice_id' => $this->invoice->id,
            'reminder_type' => $this->reminderType,
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
