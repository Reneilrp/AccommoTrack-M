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
        'daily_rate',
        'billing_policy',
        'min_stay_days',
        'prorate_base',
        'capacity',
        'pricing_model',
        'status',
        'current_tenant_id',
        'description'
    ];

    protected $casts = [
        'property_id' => 'integer',
        'floor' => 'integer',
        'monthly_rate' => 'decimal:2',
        'daily_rate' => 'decimal:2',
        'prorate_base' => 'integer',
        'min_stay_days' => 'integer',
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
     * Relationship: Room has many tenants (many-to-many through room_tenant_assignments)
     */
    public function tenants()
    {
        return $this->belongsToMany(User::class, 'room_tenant_assignments', 'room_id', 'tenant_id')
                    ->withPivot('start_date', 'end_date', 'status', 'monthly_rent')
                    ->wherePivot('status', 'active');
    }

    /**
     * Get occupied count (actual number of tenants)
     */
    public function getOccupiedAttribute()
    {
        // Count active tenants in this room
        $activeTenantsCount = $this->tenants()->count();
        
        // If no active tenants but room has current_tenant_id (legacy support)
        if ($activeTenantsCount === 0 && $this->current_tenant_id) {
            return 1;
        }
        
        return $activeTenantsCount;
    }

    /**
     * Get tenant name(s) (for compatibility with frontend)
     */
    public function getTenantAttribute()
    {
        $activeTenants = $this->tenants;
        
        if ($activeTenants->count() > 0) {
            return $activeTenants->map(function ($tenant) {
                return $tenant->first_name . ' ' . $tenant->last_name;
            })->implode(', ');
        }
        
        // Fallback to current_tenant_id for legacy support
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
        return $this->occupied >= $this->capacity;
    }

    /**
     * Get available slots in the room
     */
    public function getAvailableSlotsAttribute()
    {
        if ($this->status === 'maintenance') {
            return 0;
        }
        
        $occupiedCount = $this->occupied;
        return max(0, $this->capacity - $occupiedCount);
    }

    /**
     * Check if room is available (has available slots)
     */
    public function isAvailable()
    {
        return $this->status !== 'maintenance' && $this->available_slots > 0;
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
     * Assign tenant to room (supports multiple tenants)
     */
    public function assignTenant($tenantId, $moveInDate = null)
    {
        // Check if room has available slots
        if ($this->available_slots <= 0) {
            throw new \Exception('Room is fully occupied');
        }
        
        // Add tenant to room_tenant_assignments
        $this->tenants()->attach($tenantId, [
            'start_date' => $moveInDate ?? now()->format('Y-m-d'),
            'monthly_rent' => $this->monthly_rate,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now()
        ]);
        
        // Update room status and current_tenant_id (for legacy compatibility)
        $updateData = ['status' => 'occupied'];
        if (!$this->current_tenant_id) {
            $updateData['current_tenant_id'] = $tenantId;
        }
        
        $this->update($updateData);
        
        // Update property available rooms count
        if ($this->property && method_exists($this->property, 'updateAvailableRooms')) {
            $this->property->updateAvailableRooms();
        }
    }

    /**
     * Remove tenant from room
     */
    public function removeTenant($tenantId = null)
    {
        if ($tenantId) {
            // Remove specific tenant
            $this->tenants()->updateExistingPivot($tenantId, [
                'status' => 'ended',
                'end_date' => now()->format('Y-m-d'),
                'updated_at' => now()
            ]);
            
            // If this was the current_tenant_id, update it
            if ($this->current_tenant_id == $tenantId) {
                $remainingTenants = $this->tenants()->where('tenant_id', '!=', $tenantId)->first();
                $this->update([
                    'current_tenant_id' => $remainingTenants ? $remainingTenants->id : null
                ]);
            }
        } else {
            // Remove all tenants (legacy behavior)
            $this->tenants()->updateExistingPivot($this->tenants()->pluck('id')->toArray(), [
                'status' => 'ended',
                'end_date' => now()->format('Y-m-d'),
                'updated_at' => now()
            ]);
            
            $this->update(['current_tenant_id' => null]);
        }
        
        // Update room status if no active tenants remain
        if ($this->occupied === 0) {
            $this->update(['status' => 'available']);
        }
        
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

    /**
     * Calculate actual payment per tenant based on pricing model and current occupancy
     * Used for booking/payment calculations
     */
    public function calculatePaymentPerTenant()
    {
        $monthlyRateFloat = (float) $this->monthly_rate;
        
        // Get current number of tenants
        $currentOccupants = $this->tenants()->count();
        
        if ($this->pricing_model === 'per_bed') {
            // For per-bed pricing, each tenant pays the full monthly rate
            return $monthlyRateFloat;
        }
        
        // For full_room pricing, divide by number of tenants or capacity
        if ($currentOccupants > 0) {
            // Divide by actual occupants
            return round($monthlyRateFloat / $currentOccupants, 2);
        }
        
        // If no tenants yet, show full price
        return $monthlyRateFloat;
    }

    /**
     * Calculate price for an arbitrary number of days using room billing settings.
     * Returns array with total and breakdown.
     */
    public function calculatePriceForDays(int $days)
    {
        $days = max(1, $days);
        $monthly = (float) $this->monthly_rate;
        $daily = $this->daily_rate !== null ? (float) $this->daily_rate : null;
        $policy = $this->billing_policy ?? 'monthly';
        $prorateBase = $this->prorate_base ?? 30;

        $months = intdiv($days, $prorateBase);
        $remaining = $days % $prorateBase;

        $monthCharge = $months * $monthly;
        $daysCharge = 0.0;
        $method = $policy;

        if ($policy === 'daily') {
            $ratePerDay = $daily ?? ($monthly / $prorateBase);
            $daysCharge = $days * $ratePerDay;
            $total = $daysCharge;
            $method = 'daily';
        } elseif ($policy === 'monthly_with_daily') {
            $total = $monthCharge;
            if ($remaining > 0) {
                $ratePerDay = $daily ?? ($monthly / $prorateBase);
                $daysCharge = $remaining * $ratePerDay;
                $total += $daysCharge;
            }
            $method = 'monthly_with_daily';
        } else { // monthly (prorate leftover)
            $total = $monthCharge;
            if ($remaining > 0) {
                $daysCharge = ($monthly * $remaining) / $prorateBase;
                $total += $daysCharge;
            }
            $method = 'monthly';
        }

        $total = round($total, 2);

        return [
            'total' => $total,
            'breakdown' => [
                'months' => $months,
                'remaining_days' => $remaining,
                'month_charge' => round($monthCharge, 2),
                'days_charge' => round($daysCharge, 2),
            ],
            'method' => $method,
        ];
    }

    /**
     * Get formatted room payment display for booking page
     */
    public function getPaymentDisplay()
    {
        $monthlyRateFloat = (float) $this->monthly_rate;
        
        if ($this->pricing_model === 'per_bed') {
            return [
                'pricing_model' => 'per_bed',
                'display' => '₱' . number_format($monthlyRateFloat, 2) . ' per bed/tenant',
                'amount_per_tenant' => $monthlyRateFloat
            ];
        }
        
        $occupants = $this->tenants()->count();
        $perTenant = $occupants > 0 ? round($monthlyRateFloat / $occupants, 2) : $monthlyRateFloat;
        
        return [
            'pricing_model' => 'full_room',
            'display' => '₱' . number_format($monthlyRateFloat, 2) . ' (÷' . ($occupants > 0 ? $occupants : 'capacity') . ')',
            'amount_per_tenant' => $perTenant
        ];
    }
}