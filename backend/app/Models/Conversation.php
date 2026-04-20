<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $user_one_id
 * @property int $user_two_id
 * @property int|null $property_id
 * @property \Illuminate\Support\Carbon|null $last_message_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Message|null $lastMessage
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Message> $messages
 * @property-read int|null $messages_count
 * @property-read \App\Models\Property|null $property
 * @property-read \App\Models\User $userOne
 * @property-read \App\Models\User $userTwo
 *
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Conversation newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Conversation newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Conversation query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Conversation whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Conversation whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Conversation whereLastMessageAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Conversation wherePropertyId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Conversation whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Conversation whereUserOneId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Conversation whereUserTwoId($value)
 *
 * @mixin \Eloquent
 */
class Conversation extends Model
{
    protected $fillable = [
        'user_one_id',
        'user_two_id',
        'property_id',
        'caretaker_id',
        'last_message_at',
        'user_one_deleted_at',
        'user_two_deleted_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'user_one_deleted_at' => 'datetime',
        'user_two_deleted_at' => 'datetime',
    ];

    public function userOne()
    {
        return $this->belongsTo(User::class, 'user_one_id');
    }

    public function userTwo()
    {
        return $this->belongsTo(User::class, 'user_two_id');
    }

    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    public function caretaker()
    {
        return $this->belongsTo(User::class, 'caretaker_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function lastMessage()
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }

    // Get the other user in conversation
    public function getOtherUser($userId)
    {
        return $this->user_one_id === $userId ? $this->userTwo : $this->userOne;
    }

    public function markDeletedForUser(int $userId): void
    {
        if ((int) $this->user_one_id === (int) $userId) {
            $this->user_one_deleted_at = now();
        }

        if ((int) $this->user_two_id === (int) $userId) {
            $this->user_two_deleted_at = now();
        }
    }

    public function clearDeletedForUser(int $userId): void
    {
        if ((int) $this->user_one_id === (int) $userId) {
            $this->user_one_deleted_at = null;
        }

        if ((int) $this->user_two_id === (int) $userId) {
            $this->user_two_deleted_at = null;
        }
    }

    public function isHiddenForUser(int $userId): bool
    {
        $deletedAt = null;

        if ((int) $this->user_one_id === (int) $userId) {
            $deletedAt = $this->user_one_deleted_at;
        } elseif ((int) $this->user_two_id === (int) $userId) {
            $deletedAt = $this->user_two_deleted_at;
        }

        if (! $deletedAt) {
            return false;
        }

        $lastActivityAt = $this->last_message_at ?? $this->updated_at ?? $this->created_at;

        if (! $lastActivityAt) {
            return true;
        }

        return $deletedAt->greaterThanOrEqualTo($lastActivityAt);
    }
}
