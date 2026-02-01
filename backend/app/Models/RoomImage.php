<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $room_id
 * @property string $image_url
 * @property int $is_primary
 * @property int $order
 * @property string|null $created_at
 * @property string|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomImage newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomImage newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomImage query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomImage whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomImage whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomImage whereImageUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomImage whereIsPrimary($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomImage whereOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomImage whereRoomId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RoomImage whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class RoomImage extends Model
{
    protected $table = 'room_images';
    protected $fillable = ['room_id', 'image_url'];
    public $timestamps = false;
}