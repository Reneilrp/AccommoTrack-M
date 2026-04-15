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

    protected $appends = ['full_name'];

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function setFullNameAttribute(?string $value): void
    {
        if (empty($value)) {
            $this->attributes['first_name'] = null;
            $this->attributes['last_name'] = null;
            return;
        }
        
        $parts = array_filter(explode(' ', trim($value)));
        $lastName = array_pop($parts);
        $firstName = implode(' ', $parts);
        
        if (empty($firstName)) {
            $firstName = $lastName;
            $lastName = null;
        }
        
        $this->attributes['first_name'] = $firstName ?: null;
        $this->attributes['last_name'] = $lastName ?: null;
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}
