<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
 *
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
 *
 * @mixin \Eloquent
 */
class Room extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'room_number',
        'room_type',
        'sex_restriction',
        'floor',
        'monthly_rate',
        'daily_rate',
        'billing_policy',
        'min_stay_days',
        'capacity',
        'pricing_model',
        'status',
        'require_1month_advance',
        'current_tenant_id',
        'description',
        'rules',
        'duration_pricing',
    ];

    protected $casts = [
        'property_id' => 'integer',
        'floor' => 'integer',
        'monthly_rate' => 'decimal:2',
        'daily_rate' => 'decimal:2',
        'min_stay_days' => 'integer',
        'capacity' => 'integer',
        // Note: require_1month_advance is intentionally NOT cast to boolean here.
        // It is a nullable column: null = inherit from property, true/false = explicit override.
        // We check for null explicitly in requiresAdvance() before casting.
        'current_tenant_id' => 'integer',
        'rules' => 'array',
        'duration_pricing' => 'array',
    ];

    /**
     * Resolve whether this room requires 1 month advance payment.
     *
     * Three-state logic:
     *   null  → inherit from parent property (default for new rooms)
     *   true  → explicitly enabled on this room (overrides property)
     *   false → explicitly disabled on this room (overrides property even if property=true)
     */
    public function requiresAdvance(): bool
    {
        $roomFlag = $this->getRawOriginal('require_1month_advance') ?? $this->attributes['require_1month_advance'] ?? null;

        // Null means inherit from parent property
        if ($roomFlag === null) {
            return (bool) ($this->property?->require_1month_advance ?? false);
        }

        // Explicit room-level override (true or false)
        return (bool) $roomFlag;
    }

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
     * Relationship: Room has many tenant assignments
     */
    public function tenantAssignments()
    {
        return $this->hasMany(\App\Models\RoomTenantAssignment::class, 'room_id');
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
     * Relationship: Room has many bookings
     */
    public function bookings()
    {
        return $this->hasMany(Booking::class, 'room_id');
    }

    /**
     * Relationship: Room has many tenant eviction records.
     */
    public function evictionSchedules()
    {
        return $this->hasMany(TenantEviction::class, 'room_id');
    }

    /**
     * Relationship: Room has one active booking lock caused by pending eviction.
     */
    public function activeEvictionLock()
    {
        return $this->hasOne(TenantEviction::class, 'room_id')
            ->where('status', 'scheduled')
            ->oldestOfMany('scheduled_for');
    }

    /**
     * Get available bed numbers for assignment
     */
    public function getAvailableBedNumbers()
    {
        $totalBeds = $this->capacity;
        $assignedBeds = $this->tenantAssignments()
            ->where('status', 'active')
            ->get()
            ->flatMap(fn ($a) => explode(',', $a->bed_numbers ?? ''))
            ->filter()
            ->map(fn ($n) => (int) $n)
            ->unique()
            ->values();

        return collect(range(1, $totalBeds))->diff($assignedBeds)->values();
    }

    /**
     * Scope: Eager load aggregated sums to prevent N+1 queries.
     */
    public function scopeWithAggregates($query)
    {
        return $query
            ->withSum(['tenantAssignments as occupied_tenant_beds' => function ($q) {
                $q->where('status', 'active');
            }], 'bed_count')
            ->withSum(['bookings as occupied_walkin_beds' => function ($q) {
                $q->whereIn('status', ['confirmed', 'completed', 'partial-completed'])
                  ->whereNull('tenant_id')
                  ->where('start_date', '<=', now())
                  ->where(function ($q2) {
                      $q2->whereNull('end_date')
                         ->orWhere('end_date', '>=', now());
                  });
            }], 'bed_count')
            ->withSum(['bookings as pending_beds' => function ($q) {
                $q->whereIn('status', ['pending', 'pending_reservation', 'reserved']);
            }], 'bed_count');
    }

    /**
     * Get occupied count (actual number of beds taken)
     */
    public function getOccupiedAttribute()
    {
        // 1. Sum bed_count for all active tenants in this room (registered users)
        $occupiedByTenants = array_key_exists('occupied_tenant_beds', $this->attributes)
            ? (int) $this->attributes['occupied_tenant_beds']
            : (int) $this->tenants()->sum('room_tenant_assignments.bed_count');

        // 2. Add beds from confirmed walk-in guests (who don't have a tenant_id/user account yet)
        $occupiedByWalkins = array_key_exists('occupied_walkin_beds', $this->attributes)
            ? (int) $this->attributes['occupied_walkin_beds']
            : (int) Booking::where('room_id', $this->id)
                ->whereIn('status', ['confirmed', 'completed', 'partial-completed'])
                ->whereNull('tenant_id')
                ->where('start_date', '<=', now())
                ->where(function ($query) {
                    $query->whereNull('end_date')
                        ->orWhere('end_date', '>=', now());
                })
                ->sum('bed_count');

        $totalOccupied = $occupiedByTenants + $occupiedByWalkins;

        // If no active assignments but room has legacy current_tenant_id
        if ($totalOccupied === 0 && $this->current_tenant_id) {
            return 1;
        }

        return $totalOccupied;
    }

    /**
     * Get tenant name(s) (for compatibility with frontend)
     */
    public function getTenantAttribute()
    {
        $names = collect();

        // Add registered tenants
        $this->tenants->each(function ($tenant) use ($names) {
            $names->push($tenant->first_name.' '.$tenant->last_name);
        });

        // Add walk-in guests (confirmed active bookings with no tenant_id)
        if ($this->relationLoaded('bookings')) {
            $walkins = $this->bookings->filter(function ($b) {
                return is_null($b->tenant_id)
                    && in_array($b->status, ['confirmed', 'completed', 'partial-completed'])
                    && (! $b->start_date || \Carbon\Carbon::parse($b->start_date)->startOfDay() <= now()->startOfDay())
                    && (! $b->end_date || \Carbon\Carbon::parse($b->end_date)->startOfDay() >= now()->startOfDay());
            })->pluck('guest_name');
        } else {
            $walkins = Booking::where('room_id', $this->id)
                ->whereIn('status', ['confirmed', 'completed', 'partial-completed'])
                ->whereNull('tenant_id')
                ->where('start_date', '<=', now())
                ->where(function ($query) {
                    $query->whereNull('end_date')
                        ->orWhere('end_date', '>=', now());
                })
                ->pluck('guest_name');
        }

        $names = $names->merge($walkins)->filter()->unique();

        if ($names->count() > 0) {
            return $names->implode(', ');
        }

        // Fallback to current_tenant_id for legacy support
        if ($this->currentTenant) {
            return $this->currentTenant->first_name.' '.$this->currentTenant->last_name;
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
            'bedSpacer' => 'Bed Spacer',
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
     * Subtracts confirmed tenants AND pending bookings from capacity.
     */
    public function getAvailableSlotsAttribute()
    {
        if ($this->status === 'maintenance' || $this->is_booking_locked) {
            return 0;
        }

        $occupiedCount = $this->occupied;
        $pendingBeds = $this->pending_beds;

        return max(0, $this->capacity - ($occupiedCount + $pendingBeds));
    }

    /**
     * Get pending beds for this room.
     */
    public function getPendingBedsAttribute()
    {
        if (array_key_exists('pending_beds', $this->attributes)) {
            return (int) $this->attributes['pending_beds'];
        }

        return (int) Booking::where('room_id', $this->id)
            ->whereIn('status', ['pending', 'pending_reservation', 'reserved'])
            ->sum('bed_count');
    }

    /**
     * Viewer-facing display status that preserves canonical room status.
     *
     * Rules:
     * - maintenance stays maintenance
     * - if pending requests consume all remaining slots, show reserved
     * - if the room is fully occupied, show occupied
     * - otherwise use canonical status
     */
    public function getDisplayStatusAttribute()
    {
        if ($this->status === 'maintenance') {
            return 'maintenance';
        }

        $occupiedCount = (int) $this->occupied;
        $pendingBeds = (int) $this->pending_beds;
        $availableAfterPending = max(0, $this->capacity - ($occupiedCount + $pendingBeds));
        $isFullyOccupied = $occupiedCount >= (int) $this->capacity;

        if ($pendingBeds > 0 && $availableAfterPending === 0) {
            return 'reserved';
        }

        if ($isFullyOccupied) {
            return 'occupied';
        }

        return 'available';
    }

    /**
     * Check if room is available (has available slots)
     */
    public function isAvailable($requestedBeds = 1)
    {
        return ! $this->is_booking_locked
            && $this->status !== 'maintenance'
            && $this->available_slots >= $requestedBeds;
    }

    /**
     * Get active eviction lock details for this room.
     */
    public function getActiveEvictionLockAttribute()
    {
        if ($this->relationLoaded('activeEvictionLock')) {
            return $this->getRelation('activeEvictionLock');
        }

        $lock = $this->activeEvictionLock()->first();
        $this->setRelation('activeEvictionLock', $lock);

        return $lock;
    }

    /**
     * Room booking lock flag.
     */
    public function getIsBookingLockedAttribute(): bool
    {
        return (bool) $this->active_eviction_lock;
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
            'current_tenant_id' => $tenantId,
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
     * Assign tenant to room (supports multiple tenants and beds)
     *
     * @param  int  $tenantId
     * @param  string|null  $moveInDate
     * @param  int  $bedCount
     * @param  string|null  $bedNumbers  Comma-separated bed numbers (e.g., "1,3,5")
     */
    public function assignTenant($tenantId, $moveInDate = null, $bedCount = 1, $bedNumbers = null)
    {
        $requestedBeds = (int) ($bedCount ?: 1);

        // Check if room has physical space for more active tenants/beds
        $currentOccupied = $this->occupied;
        if ($currentOccupied + $requestedBeds > $this->capacity) {
            throw new \Exception('Room has insufficient available beds');
        }

        // Add tenant to room_tenant_assignments
        // Use 0.00 fallback: daily-rate rooms may have null monthly_rate, but the
        // room_tenant_assignments.monthly_rent column is NOT NULL.
        $this->tenants()->attach($tenantId, [
            'start_date' => $moveInDate ?? now()->format('Y-m-d'),
            'bed_count' => $requestedBeds,
            'bed_numbers' => $bedNumbers,
            'monthly_rent' => $this->monthly_rate ?? 0.00,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Update room status and current_tenant_id (for legacy compatibility)
        $isFull = ($currentOccupied + $requestedBeds) >= $this->capacity;
        $updateData = ['status' => $isFull ? 'occupied' : 'available'];
        if (! $this->current_tenant_id) {
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
    public function removeTenant($tenantId = null, ?string $endDate = null)
    {
        $effectiveEndDate = $endDate ?: now()->format('Y-m-d');

        if ($tenantId) {
            // Remove specific tenant
            $this->tenants()->updateExistingPivot($tenantId, [
                'status' => 'ended',
                'end_date' => $effectiveEndDate,
                'updated_at' => now(),
            ]);

            // If this was the current_tenant_id, update it
            if ($this->current_tenant_id == $tenantId) {
                $remainingTenants = $this->tenants()->where('tenant_id', '!=', $tenantId)->first();
                $this->update([
                    'current_tenant_id' => $remainingTenants ? $remainingTenants->id : null,
                ]);
            }
        } else {
            // Remove all tenants (legacy behavior)
            $this->tenants()->updateExistingPivot($this->tenants()->pluck('id')->toArray(), [
                'status' => 'ended',
                'end_date' => $effectiveEndDate,
                'updated_at' => now(),
            ]);

            $this->update(['current_tenant_id' => null]);
        }

        // Update room status if beds are now available
        if ($this->occupied < $this->capacity && $this->status === 'occupied') {
            $this->update(['status' => 'available']);
        }

        // Update property available rooms count
        if ($this->property && method_exists($this->property, 'updateAvailableRooms')) {
            $this->property->updateAvailableRooms();
        }
    }

    /**
     * Scope: Get only available rooms
     * Excludes rooms under maintenance, fully occupied, or fully reserved by pending bookings.
     */
    public function scopeAvailable($query)
    {
        return $query->where('status', 'available')
            ->whereDoesntHave('evictionSchedules', function ($q) {
                $q->where('status', 'scheduled');
            })
            ->where(function ($q) {
                // Ensure room has slots left after accounting for pending bookings
                $q->whereRaw('(capacity - (SELECT COUNT(*) FROM room_tenant_assignments rta WHERE rta.room_id = rooms.id AND rta.status = "active") - (SELECT COUNT(*) FROM bookings b WHERE b.room_id = rooms.id AND b.status = "pending")) > 0');
            });
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
        $daysInMonth = 30;

        $months = intdiv($days, $daysInMonth);
        $remaining = $days % $daysInMonth;

        if ($policy === 'daily') {
            $ratePerDay = $daily ?? ($monthly / $daysInMonth);
            $total = round($days * $ratePerDay, 2);

            return [
                'total' => $total,
                'breakdown' => [
                    'months' => 0,
                    'remaining_days' => $days,
                    'month_charge' => 0.00,
                    'days_charge' => $total,
                ],
                'method' => 'daily',
            ];
        }

        if ($policy === 'monthly_with_daily') {
            $monthCharge = $months * $monthly;
            $ratePerDay = $daily ?? ($monthly / $daysInMonth);
            $daysCharge = $remaining * $ratePerDay;
            $total = round($monthCharge + $daysCharge, 2);

            return [
                'total' => $total,
                'breakdown' => [
                    'months' => $months,
                    'remaining_days' => $remaining,
                    'month_charge' => round($monthCharge, 2),
                    'days_charge' => round($daysCharge, 2),
                ],
                'method' => 'monthly_with_daily',
            ];
        }

        // Default 'monthly' (fixed 30-day block logic)
        $totalMonths = ($remaining > 0) ? $months + 1 : $months;
        $total = round($totalMonths * $monthly, 2);

        return [
            'total' => $total,
            'breakdown' => [
                'months' => $totalMonths,
                'remaining_days' => $remaining,
                'month_charge' => $total,
                'days_charge' => 0.00,
            ],
            'method' => 'monthly_fixed',
        ];
    }

    /**
     * Calculate price for a booking period using actual calendar months.
     * Fixed to ensure 30 days = exactly 1 month price.
     */
    public function calculatePriceForPeriod($startDate, $endDate)
    {
        $start = $startDate instanceof Carbon ? $startDate->copy() : Carbon::parse($startDate);
        $end = $endDate instanceof Carbon ? $endDate->copy() : Carbon::parse($endDate);

        $days = max(1, $start->diffInDays($end));
        $monthly = (float) $this->monthly_rate;
        $daily = $this->daily_rate !== null ? (float) $this->daily_rate : null;
        $policy = $this->billing_policy ?? 'monthly';
        $daysInMonth = 30;

        if ($policy === 'daily') {
            $ratePerDay = $daily ?? ($monthly / $daysInMonth);
            $total = round($days * $ratePerDay, 2);

            return [
                'total' => $total,
                'breakdown' => [
                    'months' => 0,
                    'remaining_days' => $days,
                    'month_charge' => 0.00,
                    'days_charge' => $total,
                ],
                'method' => 'daily',
            ];
        }

        $months = intdiv($days, $daysInMonth);
        $remaining = $days % $daysInMonth;

        if ($policy === 'monthly_with_daily') {
            $monthCharge = $months * $monthly;
            $ratePerDay = $daily ?? ($monthly / $daysInMonth);
            $daysCharge = $remaining * $ratePerDay;
            $total = round($monthCharge + $daysCharge, 2);

            return [
                'total' => $total,
                'breakdown' => [
                    'months' => $months,
                    'remaining_days' => $remaining,
                    'month_charge' => round($monthCharge, 2),
                    'days_charge' => round($daysCharge, 2),
                ],
                'method' => 'monthly_with_daily',
            ];
        }

        // Default 'monthly' policy (fixed 30-day block logic)
        // If there's any remainder, it's treated as a full month
        $totalMonths = ($remaining > 0) ? $months + 1 : $months;
        $total = round($totalMonths * $monthly, 2);

        return [
            'total' => $total,
            'breakdown' => [
                'months' => $totalMonths,
                'remaining_days' => $remaining,
                'month_charge' => $total,
                'days_charge' => 0.00,
            ],
            'method' => 'monthly_30day_fixed',
        ];
    }

    /**
     * @return array<string, array{discount_type: string, discount_value: float}>
     */
    public static function sanitizeDurationPricing(mixed $rawPricing): array
    {
        if (! is_array($rawPricing)) {
            return [];
        }

        $allowedTerms = [3, 6, 9, 12];
        $normalized = [];

        foreach ($allowedTerms as $term) {
            $key = (string) $term;
            $entry = $rawPricing[$key] ?? $rawPricing[$term] ?? null;
            if (! is_array($entry)) {
                continue;
            }

            $discountType = strtolower(trim((string) ($entry['discount_type'] ?? '')));
            $discountValue = $entry['discount_value'] ?? null;

            if (! in_array($discountType, ['percent', 'fixed'], true) || ! is_numeric($discountValue)) {
                continue;
            }

            $normalizedValue = (float) $discountValue;
            if ($normalizedValue <= 0) {
                continue;
            }

            if ($discountType === 'percent') {
                $normalizedValue = min(100.0, $normalizedValue);
                if ($normalizedValue <= 0) {
                    continue;
                }
            }

            $normalized[$key] = [
                'discount_type' => $discountType,
                'discount_value' => round($normalizedValue, 2),
            ];
        }

        return $normalized;
    }

    /**
     * @return array<string, array{discount_type: string, discount_value: float}>
     */
    public function normalizedDurationPricing(): array
    {
        return self::sanitizeDurationPricing($this->duration_pricing);
    }

    /**
     * @return array{discount_type: string, discount_value: float}|null
     */
    public function getDurationPricingForTerm(int $months): ?array
    {
        $pricing = $this->normalizedDurationPricing();
        $key = (string) $months;

        return $pricing[$key] ?? null;
    }

    /**
     * @return array{months: int, discount_type: string, discount_value: float, discount_amount: float, discounted_total: float}|null
     */
    public function calculateDurationDiscount(float $baseAmount, int $months): ?array
    {
        $promo = $this->getDurationPricingForTerm($months);
        if (! $promo) {
            return null;
        }

        $baseTotal = max(0.0, round($baseAmount, 2));
        if ($baseTotal <= 0) {
            return null;
        }

        $discountAmount = $promo['discount_type'] === 'percent'
            ? round($baseTotal * ($promo['discount_value'] / 100), 2)
            : round($promo['discount_value'], 2);

        $discountAmount = min($discountAmount, $baseTotal);
        $discountedTotal = max(0.0, round($baseTotal - $discountAmount, 2));

        return [
            'months' => $months,
            'discount_type' => $promo['discount_type'],
            'discount_value' => (float) $promo['discount_value'],
            'discount_amount' => $discountAmount,
            'discounted_total' => $discountedTotal,
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
            $daily = $this->daily_rate !== null ? (float) $this->daily_rate : ($monthlyRateFloat / 30);

            return [
                'pricing_model' => $this->pricing_model ?? 'full_room',
                'display' => '₱'.number_format($daily, 2).' per day',
                'amount_per_tenant' => $daily,
            ];
        }

        if ($this->pricing_model === 'per_bed') {
            return [
                'pricing_model' => 'per_bed',
                'display' => '₱'.number_format($monthlyRateFloat, 2).' per bed/tenant',
                'amount_per_tenant' => $monthlyRateFloat,
            ];
        }

        $occupants = $this->tenants()->count();
        $perTenant = $occupants > 0 ? round($monthlyRateFloat / $occupants, 2) : $monthlyRateFloat;

        return [
            'pricing_model' => 'full_room',
            'display' => '₱'.number_format($monthlyRateFloat, 2).' (÷'.($occupants > 0 ? $occupants : 'capacity').')',
            'amount_per_tenant' => $perTenant,
        ];
    }
}
