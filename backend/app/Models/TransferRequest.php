<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class TransferRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'landlord_id',
        'booking_id',
        'current_room_id',
        'requested_room_id',
        'new_end_date',
        'reason',
        'status',
        'landlord_notes',
        'handled_at',
        'credit_amount',
        'credit_calculation',
        'quoted_transfer_fee',
        'refund_preference',
    ];

    protected $casts = [
        'handled_at' => 'datetime',
        'credit_calculation' => 'array',
        'credit_amount' => 'decimal:2',
        'quoted_transfer_fee' => 'decimal:2',
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

    public function tenant()
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }

    public function landlord()
    {
        return $this->belongsTo(User::class, 'landlord_id');
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }

    public function currentRoom()
    {
        return $this->belongsTo(Room::class, 'current_room_id');
    }

    public function requestedRoom()
    {
        return $this->belongsTo(Room::class, 'requested_room_id');
    }
}
