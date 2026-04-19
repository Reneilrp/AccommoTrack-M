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
        if (! $this->resource) {
            return [];
        }

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
            'message' => $this->is_unsent ? null : $this->message,
            'reply_to_id' => $this->reply_to_id,
            'is_unsent' => (bool) $this->is_unsent,
            'is_edited' => (bool) $this->is_edited,
            'image_url' => (! $this->is_unsent && $this->image_url) ? (str_starts_with($this->image_url, 'http') ? $this->image_url : \Illuminate\Support\Facades\Storage::url($this->image_url)) : null,
            'file_url' => (! $this->is_unsent && $this->file_url) ? (str_starts_with($this->file_url, 'http') ? $this->file_url : \Illuminate\Support\Facades\Storage::url($this->file_url)) : null,
            'file_name' => $this->file_name,
            'is_read' => (bool) $this->is_read,
            'read_at' => $this->read_at,
            'is_mine' => $isMine,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'reply_to' => $this->whenLoaded('replyTo', function () {
                return [
                    'id' => $this->replyTo->id,
                    'message' => $this->replyTo->is_unsent ? 'This message was unsent' : \Illuminate\Support\Str::limit($this->replyTo->message, 50),
                    'sender_name' => $this->replyTo->sender->first_name,
                    'image_url' => $this->replyTo->image_url ? (str_starts_with($this->replyTo->image_url, 'http') ? $this->replyTo->image_url : \Illuminate\Support\Facades\Storage::url($this->replyTo->image_url)) : null,
                ];
            }),
            'sender' => $this->whenLoaded('sender', fn () => [
                'id' => $this->sender->id,
                'first_name' => $this->sender->first_name,
                'last_name' => $this->sender->last_name,
                'role' => $this->sender->role,
            ]),
            'actual_sender' => $this->whenLoaded('actualSender', fn () => [
                'id' => $this->actualSender->id,
                'first_name' => $this->actualSender->first_name,
                'last_name' => $this->actualSender->last_name,
            ]),
        ];
    }
}
