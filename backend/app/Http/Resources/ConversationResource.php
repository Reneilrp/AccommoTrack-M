<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConversationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        $ownerId = $this->getOwnerId($request);
        $otherUser = $this->user_one_id === $ownerId ? $this->userTwo : $this->userOne;

        return [
            'id' => $this->id,
            'other_user' => $otherUser ? [
                'id' => $otherUser->id,
                'first_name' => $otherUser->first_name,
                'last_name' => $otherUser->last_name,
                'role' => $otherUser->role,
                'sex' => $otherUser->sex,
                'identified_as' => $otherUser->identified_as,
                'date_of_birth' => optional($otherUser->date_of_birth)->toDateString(),
                'preferences' => $otherUser->preferences,
                'profile_image' => $otherUser->profile_image,
            ] : null,
            'property' => $this->property ? [
                'id' => $this->property->id,
                'title' => $this->property->title,
                'image_url' => $this->property->image_url,
            ] : null,
            'last_message' => new MessageResource($this->lastMessage),
            'unread_count' => (int) ($this->unread_count ?? 0),
            'caretaker_id' => $this->caretaker_id,
            'last_message_at' => $this->last_message_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    protected function getOwnerId(Request $request): int
    {
        $user = $request->user();
        if ($user && $user->isCaretaker()) {
            // If the caretaker is an actual participant in this conversation
            // (e.g., direct chat with landlord), prioritize their own ID.
            if ($this->user_one_id === $user->id || $this->user_two_id === $user->id) {
                return $user->id;
            }

            return $user->effectiveLandlordId();
        }

        return $user->id;
    }
}
