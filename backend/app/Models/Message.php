<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int|null $conversation_id
 * @property int $sender_id
 * @property int|null $actual_sender_id
 * @property string|null $sender_role
 * @property int $receiver_id
 * @property int|null $room_id
 * @property string $message
 * @property bool|null $is_read
 * @property \Illuminate\Support\Carbon|null $read_at
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 * @property-read \App\Models\User|null $actualSender
 * @property-read \App\Models\Conversation|null $conversation
 * @property-read \App\Models\User $receiver
 * @property-read \App\Models\Room|null $room
 * @property-read \App\Models\User $sender
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Message newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Message newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Message query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Message whereActualSenderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Message whereConversationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Message whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Message whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Message whereIsRead($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Message whereMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Message whereReadAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Message whereReceiverId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Message whereRoomId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Message whereSenderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Message whereSenderRole($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Message whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class Message extends Model
{
    protected $fillable = [
        'conversation_id',
        'sender_id',
        'actual_sender_id',
        'sender_role',
        'receiver_id',
        'room_id',
        'message',
        'image_url',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /**
     * The actual person who sent the message (could be caretaker)
     */
    public function actualSender()
    {
        return $this->belongsTo(User::class, 'actual_sender_id');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }
}