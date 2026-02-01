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
 * @mixin \Eloquent
 */
class Conversation extends Model
{
    protected $fillable = [
        'user_one_id',
        'user_two_id',
        'property_id',
        'last_message_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
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
}