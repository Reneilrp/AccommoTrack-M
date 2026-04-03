<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TenantEviction extends Model
{
    use HasFactory;

    protected $fillable = [
        'landlord_id',
        'tenant_id',
        'room_id',
        'booking_id',
        'status',
        'reason',
        'scheduled_for',
        'finalized_at',
        'cancelled_at',
        'reverted_at',
        'finalized_by',
        'cancelled_by',
        'reverted_by',
        'cancelled_reason',
        'reverted_reason',
    ];

    protected $casts = [
        'scheduled_for' => 'datetime',
        'finalized_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'reverted_at' => 'datetime',
    ];

    public function landlord()
    {
        return $this->belongsTo(User::class, 'landlord_id');
    }

    public function tenant()
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }

    public function room()
    {
        return $this->belongsTo(Room::class, 'room_id');
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }

    public function finalizedBy()
    {
        return $this->belongsTo(User::class, 'finalized_by');
    }

    public function cancelledBy()
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function revertedBy()
    {
        return $this->belongsTo(User::class, 'reverted_by');
    }

    public function scopeForLandlord($query, int $landlordId)
    {
        return $query->where('landlord_id', $landlordId);
    }

    public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled');
    }

    public function scopeFinalized($query)
    {
        return $query->where('status', 'finalized');
    }
}
