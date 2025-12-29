<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LandlordVerification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'first_name',
        'middle_name',
        'last_name',
        'valid_id_type',
        'valid_id_other',
        'valid_id_path',
        'permit_path',
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
