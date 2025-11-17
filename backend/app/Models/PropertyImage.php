<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PropertyImage extends Model
{
    protected $table = 'property_images';
    protected $fillable = ['property_id', 'image_url', 'is_primary', 'display_order'];
    public $timestamps = false;
}