<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReservationDispute extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'tenant_id',
        'landlord_id',
        'reason',
        'status',
        'admin_notes',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function tenant()
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }

    public function landlord()
    {
        return $this->belongsTo(User::class, 'landlord_id');
    }
}
