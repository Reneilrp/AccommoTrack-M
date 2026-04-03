<?php

namespace App\Events;

use App\Models\Invoice;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class InvoiceUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $invoice;

    public function __construct(Invoice $invoice)
    {
        $this->invoice = $invoice;
    }

    public function broadcastWith(): array
    {
        // Load relationships if needed for the frontend
        $this->invoice->load(['booking.property', 'booking.room', 'transactions']);

        return [
            'invoice' => $this->invoice->toArray(),
        ];
    }

    public function broadcastOn(): array
    {
        // Broadcast to the tenant's private channel
        return [
            new PrivateChannel('user.'.$this->invoice->tenant_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'invoice.updated';
    }
}
