<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PropertyCredential extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'file_path',
        'original_name',
        'mime',
    ];

    public function property()
    {
        return $this->belongsTo(Property::class);
    }
}
