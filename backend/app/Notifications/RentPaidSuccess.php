<?php

namespace App\Notifications;

use App\Channels\DatabaseChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RentPaidSuccess extends Notification implements ShouldQueue
{
    use Queueable;

    private string $paymentMethod;

    /**
     * Create a new notification instance.
     */
    public function __construct(?string $paymentMethod = null)
    {
        $this->paymentMethod = $this->normalizeMethod($paymentMethod);
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
        $methodLabel = $this->methodLabel();

        return (new MailMessage)
            ->subject('Rent Payment Successful')
            ->line("Your rent payment was successful via {$methodLabel}.")
            ->line('Thank you for your payment!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $methodLabel = $this->methodLabel();

        return [
            'type' => 'rent_paid',
            'title' => 'Rent Payment Successful',
            'message' => "Your rent payment was successful via {$methodLabel}.",
            'url' => '/tenant/payments',
            'payment_method' => $this->paymentMethod,
            'payment_method_label' => $methodLabel,
        ];
    }

    private function normalizeMethod(?string $method): string
    {
        $normalized = strtolower(trim((string) $method));

        if ($normalized === '') {
            return 'paymongo';
        }

        return match ($normalized) {
            'paymongo', 'paymongo_gcash', 'paymongo_card', 'paymongo_payment', 'gcash', 'cash', 'bank_transfer', 'paymaya' => $normalized,
            default => 'paymongo',
        };
    }

    private function methodLabel(): string
    {
        return match ($this->paymentMethod) {
            'paymongo_gcash' => 'PayMongo (GCash)',
            'paymongo_card' => 'PayMongo (Card)',
            'paymongo_payment', 'paymongo' => 'PayMongo',
            'gcash' => 'GCash',
            'cash' => 'Cash',
            'bank_transfer' => 'Bank Transfer',
            'paymaya' => 'PayMaya',
            default => ucfirst(str_replace('_', ' ', $this->paymentMethod)),
        };
    }

    /**
     * Custom method for our custom database notifications table.
     */
    public function toDatabase(object $notifiable): array
    {
        $data = $this->toArray($notifiable);

        return [
            'type' => $data['type'] ?? 'notification',
            'title' => $data['title'] ?? 'Rent Payment Successful',
            'message' => $data['message'],
            'data' => $data,
        ];
    }
}
