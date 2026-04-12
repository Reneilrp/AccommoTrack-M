<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubscriptionGrant extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_SCHEDULED = 'scheduled';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_REVOKED = 'revoked';

    protected $fillable = [
        'landlord_id',
        'plan_id',
        'subscription_id',
        'granted_by_admin_id',
        'status',
        'starts_at',
        'ends_at',
        'duration_months',
        'auto_renew',
        'notes',
        'revoked_at',
        'revoked_by_admin_id',
        'revoke_reason',
        'metadata',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'revoked_at' => 'datetime',
        'auto_renew' => 'boolean',
        'metadata' => 'array',
    ];

    public function landlord()
    {
        return $this->belongsTo(User::class, 'landlord_id');
    }

    public function plan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    public function subscription()
    {
        return $this->belongsTo(LandlordSubscription::class, 'subscription_id');
    }

    public function grantedByAdmin()
    {
        return $this->belongsTo(User::class, 'granted_by_admin_id');
    }

    public function revokedByAdmin()
    {
        return $this->belongsTo(User::class, 'revoked_by_admin_id');
    }

    public function events()
    {
        return $this->hasMany(SubscriptionEvent::class, 'subscription_grant_id');
    }
}
