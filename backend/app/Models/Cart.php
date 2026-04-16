<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    protected $fillable = [
        'user_id',
        'property_id',
        'status',
        'session_id',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    /**
     * Cart belongs to a user
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Cart belongs to a property
     */
    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * Cart has many items
     */
    public function items()
    {
        return $this->hasMany(CartItem::class);
    }

    /**
     * Check if cart is expired
     */
    public function isExpired()
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    /**
     * Get total price of all items in cart
     */
    public function getTotalPrice()
    {
        return $this->items->sum('price_snapshot');
    }

    /**
     * Get total bed count across all items
     */
    public function getTotalBedCount()
    {
        return $this->items->sum('bed_count');
    }

    /**
     * Mark cart as completed
     */
    public function markAsCompleted()
    {
        $this->update(['status' => 'completed']);
    }

    /**
     * Mark cart as abandoned
     */
    public function markAsAbandoned()
    {
        $this->update(['status' => 'abandoned']);
    }

    /**
     * Scope: Get active carts
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });
    }

    /**
     * Scope: Get expired carts
     */
    public function scopeExpired($query)
    {
        return $query->where('status', 'active')
            ->where('expires_at', '<=', now());
    }
}
