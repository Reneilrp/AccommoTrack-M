<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Property extends Model
{
    use HasFactory;

    protected $fillable = [
        'landlord_id',
        // Basic Information
        'title',
        'description',
        'property_type',
        'current_status',
        // Location Details
        'street_address',
        'city',
        'province',
        'postal_code',
        'country',
        'barangay',
        // Property Coordinates
        'latitude',
        'longitude',
        'nearby_landmarks',
        // Property Specifications
        'number_of_bedrooms',
        'number_of_bathrooms',
        'floor_area',
        'parking_spaces',
        'floor_level',
        'max_occupants',
        // Room Management
        'total_rooms',
        'available_rooms',
        // Rental Information
        'price_per_month',
        'security_deposit',
        'currency',
        'utilities_included',
        'minimum_lease_term',
        // Status
        'is_published',
        'is_available'
    ];

    protected $casts = [
        'landlord_id' => 'integer',
        'number_of_bedrooms' => 'integer',
        'number_of_bathrooms' => 'integer',
        'floor_area' => 'decimal:2',
        'parking_spaces' => 'integer',
        'max_occupants' => 'integer',
        'total_rooms' => 'integer',
        'available_rooms' => 'integer',
        'price_per_month' => 'decimal:2',
        'security_deposit' => 'decimal:2',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'is_published' => 'boolean',
        'is_available' => 'boolean'
    ];

    /**
     * Relationship: Property belongs to a User (Landlord)
     */
    public function landlord()
    {
        return $this->belongsTo(User::class, 'landlord_id');
    }

    /**
     * Relationship: Property has many Rooms
     */
    public function rooms()
    {
        return $this->hasMany(Room::class);
    }

    /**
     * Get the full address
     */
    public function getFullAddressAttribute()
    {
        $parts = array_filter([
            $this->street_address,
            $this->barangay,
            $this->city,
            $this->province,
            $this->postal_code
        ]);
        
        return implode(', ', $parts);
    }

    /**
     * Accessor: Get total rooms count from database
     */
    public function getTotalRoomsCountAttribute()
    {
        return $this->rooms()->count();
    }

    /**
     * Accessor: Get available rooms count from database
     */
    public function getAvailableRoomsCountAttribute()
    {
        return $this->rooms()->where('status', 'available')->count();
    }

    /**
     * Accessor: Get occupied rooms count
     */
    public function getOccupiedRoomsCountAttribute()
    {
        return $this->rooms()->where('status', 'occupied')->count();
    }

    /**
     * Accessor: Get maintenance rooms count
     */
    public function getMaintenanceRoomsCountAttribute()
    {
        return $this->rooms()->where('status', 'maintenance')->count();
    }

    /**
     * Check if property is active
     */
    public function isActive()
    {
        return $this->current_status === 'active';
    }

    /**
     * Check if property is published
     */
    public function isPublished()
    {
        return $this->is_published === true;
    }

    /**
     * Check if property is available
     */
    public function isAvailable()
    {
        return $this->is_available === true && $this->available_rooms > 0;
    }

    /**
     * Check if property belongs to a specific landlord
     */
    public function belongsToLandlord($landlordId)
    {
        return $this->landlord_id == $landlordId;
    }

    /**
     * Scope: Get only active properties
     */
    public function scopeActive($query)
    {
        return $query->where('current_status', 'active');
    }

    /**
     * Scope: Get only published properties
     */
    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    /**
     * Scope: Get available properties
     */
    public function scopeAvailable($query)
    {
        return $query->where('is_available', true)
                     ->where('available_rooms', '>', 0);
    }

    /**
     * Scope: Filter by property type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('property_type', $type);
    }

    /**
     * Scope: Filter by city
     */
    public function scopeInCity($query, $city)
    {
        return $query->where('city', $city);
    }

    /**
     * Update available rooms count based on actual room data
     */
    public function updateAvailableRooms()
    {
        $this->available_rooms = $this->rooms()->where('status', 'available')->count();
        $this->save();
    }

    /**
     * Update total rooms count based on actual room data
     */
    public function updateTotalRooms()
    {
        $this->total_rooms = $this->rooms()->count();
        $this->save();
    }
}