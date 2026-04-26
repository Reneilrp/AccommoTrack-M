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
            $actualSenderId = $this->actual_sender_id ?? $this->sender_id;
            $isMine = (int) $actualSenderId === (int) $user->id;
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
            'download_url' => (! $this->is_unsent && $this->file_url) ? url("/api/messages/messages/{$this->id}/download") : null,
            'image_path' => $this->image_url, // Alias for mobile compatibility
            'file_path' => $this->file_url,   // Alias for mobile compatibility
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
                'profile_image' => $this->sender->profile_image,
            ]),
            'actual_sender' => $this->whenLoaded('actualSender', fn () => [
                'id' => $this->actualSender->id,
                'first_name' => $this->actualSender->first_name,
                'last_name' => $this->actualSender->last_name,
                'profile_image' => $this->actualSender->profile_image,
            ]),
            'histories' => $this->whenLoaded('histories', fn () => $this->histories->map(fn ($h) => [
                'message' => $h->old_message,
                'created_at' => $h->created_at,
            ])),
        ];
    }
}
