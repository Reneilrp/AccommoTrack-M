<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

/**
 * @property int $id
 * @property int $property_id
 * @property string $room_number
 * @property string $room_type
 * @property int $floor
 * @property numeric $monthly_rate
 * @property numeric|null $daily_rate
 * @property string $billing_policy
 * @property int $min_stay_days
 * @property int $capacity
 * @property string $pricing_model
 * @property string $status
 * @property int|null $current_tenant_id
 * @property string|null $description
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Amenity> $amenities
 * @property-read int|null $amenities_count
 * @property-read \App\Models\User|null $currentTenant
 * @property-read mixed $available_slots
 * @property-read mixed $occupied
 * @property-read mixed $price
 * @property-read mixed $tenant
 * @property-read mixed $type
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\RoomImage> $images
 * @property-read int|null $images_count
 * @property-read \App\Models\Property $property
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\User> $tenants
 * @property-read int|null $tenants_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room available()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room byFloor($floor)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room byType($type)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room forProperty($propertyId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room inPriceRange($minPrice, $maxPrice)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room occupied()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room underMaintenance()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereBillingPolicy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereCapacity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereCurrentTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereDailyRate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereFloor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereMinStayDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereMonthlyRate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room wherePricingModel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room wherePropertyId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereRoomNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereRoomType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Room withMinCapacity($minCapacity)
 * @mixin \Eloquent
 */
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
     * Scope: Get rooms belonging to a landlord (via property)
     */
    public function scopeForLandlord($query, int $landlordId)
    {
        return $query->whereHas('property', function ($q) use ($landlordId) {
            $q->where('landlord_id', $landlordId);
        });
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
        $daysInMonth = 30; // Hardcoded to 30

        $months = intdiv($days, $daysInMonth);
        $remaining = $days % $daysInMonth;

        $monthCharge = $months * $monthly;
        $daysCharge = 0.0;
        $method = $policy;

        if ($policy === 'daily') {
            $ratePerDay = $daily ?? ($monthly / $daysInMonth);
            $daysCharge = $days * $ratePerDay;
            $total = $daysCharge;
            $method = 'daily';
        } elseif ($policy === 'monthly_with_daily') {
            $total = $monthCharge;
            if ($remaining > 0) {
                $ratePerDay = $daily ?? ($monthly / $daysInMonth);
                $daysCharge = $remaining * $ratePerDay;
                $total += $daysCharge;
            }
            $method = 'monthly_with_daily';
        } else { // monthly (calculate leftover)
            $total = $monthCharge;
            if ($remaining > 0) {
                // For plain monthly policy, we calculate strictly by base days if not exact month
                $daysCharge = ($monthly * $remaining) / $daysInMonth;
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
     * Calculate price for a booking period using actual calendar months.
     * This treats full calendar-month segments as whole months (no prorate)
     * and charges any remaining days according to the room's billing policy.
     *
     * @param Carbon|string $startDate
     * @param Carbon|string $endDate
     * @return array
     */
    public function calculatePriceForPeriod($startDate, $endDate)
    {
        $start = $startDate instanceof Carbon ? $startDate->copy() : Carbon::parse($startDate);
        $end = $endDate instanceof Carbon ? $endDate->copy() : Carbon::parse($endDate);

        $days = max(1, $start->diffInDays($end) + 1);
        $monthly = (float) $this->monthly_rate;
        $daily = $this->daily_rate !== null ? (float) $this->daily_rate : null;
        $policy = $this->billing_policy ?? 'monthly';

        // If billing is strictly daily, use daily rate
        if ($policy === 'daily') {
            $ratePerDay = $daily ?? ($monthly / 30);
            $total = round($days * $ratePerDay, 2);
            return [
                'total' => $total,
                'breakdown' => [
                    'months' => 0,
                    'remaining_days' => $days,
                    'month_charge' => 0.00,
                    'days_charge' => round($days * $ratePerDay, 2),
                ],
                'method' => 'daily',
            ];
        }

        // For monthly-based billing (no prorate): count units as 30-day chunks and round up
        $units = (int) ceil($days / 30);
        $monthCharge = $units * $monthly;
        $total = round($monthCharge, 2);

        return [
            'total' => $total,
            'breakdown' => [
                'months' => $units,
                'remaining_days' => $days % 30,
                'month_charge' => round($monthCharge, 2),
                'days_charge' => 0.00,
            ],
            'method' => 'monthly_30day',
        ];
    }

    /**
     * Get formatted room payment display for booking page
     */
    public function getPaymentDisplay()
    {
        $monthlyRateFloat = (float) $this->monthly_rate;
        $billingPolicy = $this->billing_policy ?? 'monthly';

        // If billing is daily, show daily display
        if ($billingPolicy === 'daily') {
            $daily = $this->daily_rate !== null ? (float)$this->daily_rate : ($monthlyRateFloat / 30);
            return [
                'pricing_model' => $this->pricing_model ?? 'full_room',
                'display' => '₱' . number_format($daily, 2) . ' per day',
                'amount_per_tenant' => $daily
            ];
        }

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