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
     * Relationship: Room has many amenities (many-to-many)
     */
    public function amenities()
    {
        return $this->belongsToMany(Amenity::class, 'room_amenities', 'room_id', 'amenity_id');
    }

    /**
     * Relationship: Room has many images
     */
    public function images()
    {
        return $this->hasMany(RoomImage::class, 'room_id');
    }

    /**
     * Get occupied count (for compatibility with frontend)
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
            'bedSpacer' => 'Bed Spacer'
        ];
        
        return $types[$this->room_type] ?? ucfirst($this->room_type);
    }

    /**
     * Get roomNumber (alias for room_number for frontend compatibility)
     */
    public function getRoomNumberAttribute()
    {
        return $this->attributes['room_number'];
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
     * Mark room as available
     */
    public function markAsAvailable()
    {
        $this->update(['status' => 'available', 'current_tenant_id' => null]);
        
        // Update property available rooms count
        if ($this->property && method_exists($this->property, 'updateAvailableRooms')) {
            $this->property->updateAvailableRooms();
        }
    }

    /**
     * Mark room as occupied
     */
    public function markAsOccupied($tenantId = null)
    {
        $this->update([
            'status' => 'occupied',
            'current_tenant_id' => $tenantId
        ]);
        
        // Update property available rooms count
        if ($this->property && method_exists($this->property, 'updateAvailableRooms')) {
            $this->property->updateAvailableRooms();
        }
    }

    /**
     * Mark room as under maintenance
     */
    public function markAsUnderMaintenance()
    {
        $this->update(['status' => 'maintenance']);
        
        // Update property available rooms count
        if ($this->property && method_exists($this->property, 'updateAvailableRooms')) {
            $this->property->updateAvailableRooms();
        }
    }

    /**
     * Assign tenant to room
     */
    public function assignTenant($tenantId)
    {
        $this->update([
            'current_tenant_id' => $tenantId,
            'status' => 'occupied'
        ]);
        
        // Update property available rooms count
        if ($this->property && method_exists($this->property, 'updateAvailableRooms')) {
            $this->property->updateAvailableRooms();
        }
    }

    /**
     * Remove tenant from room
     */
    public function removeTenant()
    {
        $this->update([
            'current_tenant_id' => null,
            'status' => 'available'
        ]);
        
        // Update property available rooms count
        if ($this->property && method_exists($this->property, 'updateAvailableRooms')) {
            $this->property->updateAvailableRooms();
        }
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
     * Scope: Get rooms under maintenance
     */
    public function scopeUnderMaintenance($query)
    {
        return $query->where('status', 'maintenance');
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

    /**
     * Scope: Get rooms with capacity greater than or equal to specified value
     */
    public function scopeWithMinCapacity($query, $minCapacity)
    {
        return $query->where('capacity', '>=', $minCapacity);
    }

    /**
     * Scope: Get rooms within price range
     */
    public function scopeInPriceRange($query, $minPrice, $maxPrice)
    {
        return $query->whereBetween('monthly_rate', [$minPrice, $maxPrice]);
    }

    /**
     * Boot method - handle model events
     */
    protected static function boot()
    {
        parent::boot();

        // When a room is deleted, update property stats
        static::deleted(function ($room) {
            if ($room->property && method_exists($room->property, 'updateTotalRooms')) {
                $room->property->updateTotalRooms();
            }
            if ($room->property && method_exists($room->property, 'updateAvailableRooms')) {
                $room->property->updateAvailableRooms();
            }
        });

        // When a room is created, update property stats
        static::created(function ($room) {
            if ($room->property && method_exists($room->property, 'updateTotalRooms')) {
                $room->property->updateTotalRooms();
            }
            if ($room->property && method_exists($room->property, 'updateAvailableRooms')) {
                $room->property->updateAvailableRooms();
            }
        });
    }
}