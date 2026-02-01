<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $property_id
 * @property string $image_url
 * @property int $is_primary
 * @property int $display_order
 * @property string|null $created_at
 * @property string|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyImage newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyImage newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyImage query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyImage whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyImage whereDisplayOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyImage whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyImage whereImageUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyImage whereIsPrimary($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyImage wherePropertyId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyImage whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PropertyImage extends Model
{
    protected $table = 'property_images';
    protected $fillable = ['property_id', 'image_url', 'is_primary', 'display_order'];
    public $timestamps = false;
}