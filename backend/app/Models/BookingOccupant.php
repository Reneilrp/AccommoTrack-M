<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BookingOccupant extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'first_name',
        'middle_name',
        'last_name',
        'date_of_birth',
        'sex',
        'bed_number',
        'relationship_to_booker',
        'phone',
        'email',
        'move_in_verified_at',
        'notes',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'move_in_verified_at' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}
