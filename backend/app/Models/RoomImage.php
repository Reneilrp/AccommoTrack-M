<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoomImage extends Model
{
    protected $table = 'room_images';
    protected $fillable = ['room_id', 'image_url'];
    public $timestamps = false;
}