<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $property_id
 * @property string $file_path
 * @property string|null $original_name
 * @property string|null $mime
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Property $property
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyCredential newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyCredential newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyCredential query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyCredential whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyCredential whereFilePath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyCredential whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyCredential whereMime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyCredential whereOriginalName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyCredential wherePropertyId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PropertyCredential whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
