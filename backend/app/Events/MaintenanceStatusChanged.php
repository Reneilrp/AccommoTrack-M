<?php

namespace App\Events;

use App\Models\MaintenanceRequest;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MaintenanceStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $request;
    public $update;

    /**
     * Create a new event instance.
     *
     * @param MaintenanceRequest $request
     * @param mixed $update (Recent MaintenanceUpdate model)
     */
    public function __construct(MaintenanceRequest $request, $update = null)
    {
        $this->request = $request;
        $this->update = $update;
    }

    public function broadcastWith(): array
    {
        // Load necessary relations for frontend
        $this->request->load(['property', 'room', 'assignedTo']);
        
        return [
            'request' => $this->request->toArray(),
            'update' => $this->update ? $this->update->toArray() : null,
            'message' => $this->update ? $this->update->content : "Maintenance request updated",
        ];
    }

    public function broadcastOn(): array
    {
        // Broadcast to the tenant, the landlord, and the assigned worker
        $channels = [
            new PrivateChannel('user.'.$this->request->tenant_id),
            new PrivateChannel('user.'.$this->request->landlord_id),
        ];

        if ($this->request->assigned_to) {
            $channels[] = new PrivateChannel('user.'.$this->request->assigned_to);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'maintenance.updated';
    }
}
