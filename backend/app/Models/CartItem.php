<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CartItem extends Model
{
    protected $fillable = [
        'cart_id',
        'room_id',
        'bed_count',
        'bed_numbers',
        'start_date',
        'end_date',
        'contract_mode',
        'payment_plan',
        'price_snapshot',
        'occupants',
        'notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'price_snapshot' => 'decimal:2',
        'occupants' => 'array',
    ];

    /**
     * Cart item belongs to a cart
     */
    public function cart()
    {
        return $this->belongsTo(Cart::class);
    }

    /**
     * Cart item belongs to a room
     */
    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * Get occupant count
     */
    public function getOccupantCount()
    {
        return is_array($this->occupants) ? count($this->occupants) : 0;
    }

    /**
     * Check if this is a proxy booking
     */
    public function isProxyBooking()
    {
        return $this->getOccupantCount() > 0;
    }
}
