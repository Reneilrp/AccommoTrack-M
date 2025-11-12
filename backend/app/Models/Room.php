<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'room_number',
        'room_type',
        'floor',
        'monthly_rate',
        'capacity',
        'status',
        'current_tenant_id',
        'description'
    ];

    protected $casts = [
        'property_id' => 'integer',
        'floor' => 'integer',
        'monthly_rate' => 'decimal:2',
        'capacity' => 'integer',
        'current_tenant_id' => 'integer'
    ];

    /**
     * Relationship: Room belongs to a Property
     */
    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * Relationship: Room belongs to current tenant (User)
     */
    public function currentTenant()
    {
        return $this->belongsTo(User::class, 'current_tenant_id');
    }

    /**
     * Get occupied count (for compatibility with frontend)
     * Since your DB doesn't have 'occupied' field, we'll use status
     */
    public function getOccupiedAttribute()
    {
        return $this->status === 'occupied' ? $this->capacity : 0;
    }

    /**
     * Get tenant name (for compatibility with frontend)
     */
    public function getTenantAttribute()
    {
        if ($this->currentTenant) {
            return $this->currentTenant->first_name . ' ' . $this->currentTenant->last_name;
        }
        return null;
    }

    /**
     * Get amenities (for compatibility - you might want to add this later)
     */
    public function getAmenitiesAttribute()
    {
        return [];
    }

    /**
     * Get images (for compatibility - you might want to add this later)
     */
    public function getImagesAttribute()
    {
        return ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400'];
    }

    /**
     * Get price (alias for monthly_rate for frontend compatibility)
     */
    public function getPriceAttribute()
    {
        return $this->monthly_rate;
    }

    /**
     * Get type (alias for room_type for frontend compatibility)
     */
    public function getTypeAttribute()
    {
        // Convert enum to display format
        $types = [
            'single' => 'Single Room',
            'double' => 'Double Room',
            'quad' => 'Quad Room',
            'suite' => 'Suite'
        ];
        
        return $types[$this->room_type] ?? ucfirst($this->room_type);
    }

    /**
     * Check if room is fully occupied
     */
    public function isFullyOccupied()
    {
        return $this->status === 'occupied';
    }

    /**
     * Get available slots in the room
     */
    public function getAvailableSlotsAttribute()
    {
        return $this->status === 'available' ? $this->capacity : 0;
    }

    /**
     * Check if room is available
     */
    public function isAvailable()
    {
        return $this->status === 'available';
    }

    /**
     * Check if room is occupied
     */
    public function isOccupied()
    {
        return $this->status === 'occupied';
    }

    /**
     * Check if room is under maintenance
     */
    public function isUnderMaintenance()
    {
        return $this->status === 'maintenance';
    }

    /**
     * Scope: Get only available rooms
     */
    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    /**
     * Scope: Get only occupied rooms
     */
    public function scopeOccupied($query)
    {
        return $query->where('status', 'occupied');
    }

    /**
     * Scope: Get rooms by floor
     */
    public function scopeByFloor($query, $floor)
    {
        return $query->where('floor', $floor);
    }

    /**
     * Scope: Get rooms by type
     */
    public function scopeByType($query, $type)
    {
        return $query->where('room_type', $type);
    }

    /**
     * Scope: Get rooms for a specific property
     */
    public function scopeForProperty($query, $propertyId)
    {
        return $query->where('property_id', $propertyId);
    }
}