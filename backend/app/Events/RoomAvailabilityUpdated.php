<?php

namespace App\Events;

use App\Models\Room;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RoomAvailabilityUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $room_id;
    public $property_id;
    public $available_slots;
    public $status;

    /**
     * Create a new event instance.
     */
    public function __construct(Room $room)
    {
        $this->room_id = $room->id;
        $this->property_id = $room->property_id;
        $this->available_slots = (int) $room->available_slots;
        $this->status = $room->status;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('property.' . $this->property_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'room.availability_updated';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'room_id' => $this->room_id,
            'property_id' => $this->property_id,
            'available_slots' => $this->available_slots,
            'status' => $this->status,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
