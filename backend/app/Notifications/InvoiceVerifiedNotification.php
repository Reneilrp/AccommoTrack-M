<?php

namespace App\Notifications;

use App\Channels\DatabaseChannel;
use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class InvoiceVerifiedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected Invoice $invoice;
    protected string $action; // 'approved' | 'rejected'

    public function __construct(Invoice $invoice, string $action)
    {
        $this->invoice = $invoice;
        $this->action = $action;
    }

    public function via(object $notifiable): array
    {
        return [DatabaseChannel::class];
    }

    public function toArray(object $notifiable): array
    {
        $isApproved = $this->action === 'approved';
        return [
            'type' => 'cash_payment_verified',
            'title' => $isApproved ? 'Cash Payment Approved' : 'Cash Payment Rejected',
            'message' => $isApproved
                ? 'Your cash payment for invoice ' . $this->invoice->reference . ' has been approved by the landlord.'
                : 'Your cash payment for invoice ' . $this->invoice->reference . ' was rejected. Please contact your landlord for more information.',
            'invoice_id' => $this->invoice->id,
            'url' => '/payments',
        ];
    }

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
