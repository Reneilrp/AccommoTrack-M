<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'tenant_id',
        'landlord_id',
        'room_id',
        'booking_reference',
        'start_date',
        'end_date',
        'total_months',
        'monthly_rent',
        'total_amount',
        'status',
        'payment_status',
        'notes',
        'cancelled_at',
        'cancellation_reason'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'monthly_rent' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'cancelled_at' => 'datetime'
    ];

    /**
     * Relationship: Booking belongs to Property
     */
    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * Relationship: Booking belongs to Tenant (User)
     */
    public function tenant()
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }

    /**
     * Relationship: Booking belongs to Landlord (User)
     */
    public function landlord()
    {
        return $this->belongsTo(User::class, 'landlord_id');
    }

    /**
     * Relationship: Booking belongs to Room
     */
    public function room()
    {
        return $this->belongsTo(Room::class);
    }
}