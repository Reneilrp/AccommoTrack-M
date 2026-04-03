<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BookingDepositSettlement extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'settled_by',
        'starting_balance',
        'damage_fee',
        'cleaning_fee',
        'other_fee',
        'total_deductions',
        'excess_charges',
        'refund_due',
        'refund_paid',
        'ending_balance',
        'mark_refunded',
        'refund_method',
        'refund_reference',
        'note',
    ];

    protected $casts = [
        'starting_balance' => 'decimal:2',
        'damage_fee' => 'decimal:2',
        'cleaning_fee' => 'decimal:2',
        'other_fee' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'excess_charges' => 'decimal:2',
        'refund_due' => 'decimal:2',
        'refund_paid' => 'decimal:2',
        'ending_balance' => 'decimal:2',
        'mark_refunded' => 'boolean',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function settledByUser()
    {
        return $this->belongsTo(User::class, 'settled_by');
    }
}
