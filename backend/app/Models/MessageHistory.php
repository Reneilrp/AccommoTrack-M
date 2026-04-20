<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MessageHistory extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'message_id',
        'old_message',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function message()
    {
        return $this->belongsTo(Message::class);
    }
}
