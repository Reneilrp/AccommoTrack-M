<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        if (!$this->resource) return null;

        $user = $request->user();
        $isMine = false;
        if ($user) {
            $ownerId = $user->effectiveLandlordId() ?? $user->id;
            $isMine = (int) $this->sender_id === (int) $ownerId;
        }

        return [
            'id' => $this->id,
            'conversation_id' => $this->conversation_id,
            'sender_id' => $this->sender_id,
            'receiver_id' => $this->receiver_id,
            'actual_sender_id' => $this->actual_sender_id,
            'sender_role' => $this->sender_role,
            'message' => $this->message,
            'image_url' => $this->image_url ? (str_starts_with($this->image_url, 'http') ? $this->image_url : asset('storage/' . $this->image_url)) : null,
            'is_read' => (bool) $this->is_read,
            'read_at' => $this->read_at,
            'is_mine' => $isMine,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'sender' => $this->whenLoaded('sender', fn() => [
                'id' => $this->sender->id,
                'first_name' => $this->sender->first_name,
                'last_name' => $this->sender->last_name,
                'role' => $this->sender->role,
            ]),
            'actual_sender' => $this->whenLoaded('actualSender', fn() => [
                'id' => $this->actualSender->id,
                'first_name' => $this->actualSender->first_name,
                'last_name' => $this->actualSender->last_name,
            ]),
        ];
    }
}
