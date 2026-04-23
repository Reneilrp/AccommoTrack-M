<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

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

    protected function amount(): Attribute
{
    return Attribute::make(
        // When reading from DB: divide by 100 (10000 -> 100.00)
        get: fn ($value) => $value !== null ? $value / 100 : null,
        
        // When saving to DB: multiply by 100 (100.00 -> 10000)
        set: fn ($value) => $value !== null ? (int) round($value * 100) : null,
    );
}

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
