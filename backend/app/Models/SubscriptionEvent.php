<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubscriptionEvent extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'landlord_subscription_id',
        'subscription_grant_id',
        'landlord_id',
        'actor_user_id',
        'event',
        'description',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function subscription()
    {
        return $this->belongsTo(LandlordSubscription::class, 'landlord_subscription_id');
    }

    public function grant()
    {
        return $this->belongsTo(SubscriptionGrant::class, 'subscription_grant_id');
    }

    public function landlord()
    {
        return $this->belongsTo(User::class, 'landlord_id');
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
