<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    use HasFactory;

    public const FREE_SLUG = 'free';

    protected $fillable = [
        'name',
        'slug',
        'monthly_price_cents',
        'annual_price_cents',
        'currency',
        'max_properties',
        'max_rooms_total',
        'features',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'features' => 'array',
        'is_active' => 'boolean',
    ];

    public function subscriptions()
    {
        return $this->hasMany(LandlordSubscription::class, 'plan_id');
    }

    public function grants()
    {
        return $this->hasMany(SubscriptionGrant::class, 'plan_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
