<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $user_id
 * @property string $first_name
 * @property string|null $middle_name
 * @property string $last_name
 * @property string $valid_id_type
 * @property string|null $valid_id_other
 * @property string $valid_id_path
 * @property string $permit_path
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LandlordVerification newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LandlordVerification newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LandlordVerification query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LandlordVerification whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LandlordVerification whereFirstName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LandlordVerification whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LandlordVerification whereLastName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LandlordVerification whereMiddleName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LandlordVerification wherePermitPath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LandlordVerification whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LandlordVerification whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LandlordVerification whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LandlordVerification whereValidIdOther($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LandlordVerification whereValidIdPath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LandlordVerification whereValidIdType($value)
 * @mixin \Eloquent
 */
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
