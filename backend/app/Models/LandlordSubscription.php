<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LandlordSubscription extends Model
{
    use HasFactory;

    public const SOURCE_SYSTEM_DEFAULT = 'system_default';

    public const SOURCE_SELF_CHECKOUT = 'self_checkout';

    public const SOURCE_ADMIN_GRANT = 'admin_grant';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_GRACE = 'grace';

    public const STATUS_RESTRICTED = 'restricted';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_REVOKED = 'revoked';

    public const STATUS_SCHEDULED = 'scheduled';

    protected $fillable = [
        'landlord_id',
        'plan_id',
        'source',
        'status',
        'starts_at',
        'ends_at',
        'grace_ends_at',
        'auto_renew',
        'created_by_admin_id',
        'metadata',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'grace_ends_at' => 'datetime',
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

    public function createdByAdmin()
    {
        return $this->belongsTo(User::class, 'created_by_admin_id');
    }

    public function grants()
    {
        return $this->hasMany(SubscriptionGrant::class, 'subscription_id');
    }

    public function events()
    {
        return $this->hasMany(SubscriptionEvent::class, 'landlord_subscription_id');
    }

    public function scopeEffectiveNow($query)
    {
        return $query
            ->whereIn('status', [self::STATUS_ACTIVE, self::STATUS_GRACE, self::STATUS_RESTRICTED])
            ->where('starts_at', '<=', now())
            ->where(function ($windowQuery) {
                $windowQuery->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            });
    }

    public function isEffectiveAt(Carbon $at): bool
    {
        $isStatusEffective = in_array($this->status, [self::STATUS_ACTIVE, self::STATUS_GRACE, self::STATUS_RESTRICTED], true);

        if (! $isStatusEffective) {
            return false;
        }

        if ($this->starts_at && $this->starts_at->gt($at)) {
            return false;
        }

        if ($this->ends_at && $this->ends_at->lt($at)) {
            return false;
        }

        return true;
    }
}
