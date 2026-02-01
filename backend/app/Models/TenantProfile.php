<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $user_id
 * @property \Illuminate\Support\Carbon|null $move_in_date
 * @property \Illuminate\Support\Carbon|null $move_out_date
 * @property string $status
 * @property int|null $booking_id
 * @property string|null $notes
 * @property string|null $emergency_contact_name
 * @property string|null $emergency_contact_phone
 * @property string|null $emergency_contact_relationship
 * @property string|null $current_address
 * @property array<array-key, mixed>|null $preference
 * @property \Illuminate\Support\Carbon|null $date_of_birth
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile active()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile inactive()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile whereBookingId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile whereCurrentAddress($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile whereDateOfBirth($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile whereEmergencyContactName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile whereEmergencyContactPhone($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile whereEmergencyContactRelationship($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile whereMoveInDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile whereMoveOutDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile wherePreference($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TenantProfile whereUserId($value)
 * @mixin \Eloquent
 */
class TenantProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'move_in_date',
        'move_out_date',
        'status',
        'notes',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relationship',
        'current_address',
        'preference',
        'date_of_birth',
    ];

    protected $casts = [
        'move_in_date' => 'date',
        'move_out_date' => 'date',
        'date_of_birth' => 'date',
        'preference' => 'array',
    ];

    /**
     * Belongs to User
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope: Active tenants only
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope: Inactive tenants
     */
    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }
}