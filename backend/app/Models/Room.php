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
        'gender_restriction',
        'floor',
        'monthly_rate',
        'daily_rate',
        'billing_policy',
        'min_stay_days',
        'capacity',
        'pricing_model',
        'status',
        'current_tenant_id',
        'description',
        'rules',
    ];

    protected $casts = [
        'property_id' => 'integer',
        'floor' => 'integer',
        'monthly_rate' => 'decimal:2',
        'daily_rate' => 'decimal:2',
        'min_stay_days' => 'integer',
        'capacity' => 'integer',
        'current_tenant_id' => 'integer',
        'rules' => 'array',
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
     * Relationship: Room has many bookings
     */
    public function bookings()
    {
        return $this->hasMany(Booking::class, 'room_id');
    }

    /**
     * Get occupied count (actual number of beds taken)
     */
    public function getOccupiedAttribute()
    {
        // 1. Sum bed_count for all active tenants in this room (registered users)
        $occupiedByTenants = (int) $this->tenants()->sum('room_tenant_assignments.bed_count');

        // 2. Add beds from confirmed walk-in guests (who don't have a tenant_id/user account yet)
        // These are currently staying (start_date <= today <= end_date)
        $occupiedByWalkins = (int) Booking::where('room_id', $this->id)
            ->whereIn('status', ['confirmed', 'completed', 'partial-completed'])
            ->whereNull('tenant_id')
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
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
        $walkins = Booking::where('room_id', $this->id)
            ->whereIn('status', ['confirmed', 'completed', 'partial-completed'])
            ->whereNull('tenant_id')
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->pluck('guest_name');

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
        if ($this->status === 'maintenance') {
            return 0;
        }

        $occupiedCount = $this->occupied;
        $pendingBeds = (int) Booking::where('room_id', $this->id)
            ->where('status', 'pending')
            ->sum('bed_count');

        return max(0, $this->capacity - ($occupiedCount + $pendingBeds));
    }

    /**
     * Check if room is available (has available slots)
     */
    public function isAvailable($requestedBeds = 1)
    {
        return $this->status !== 'maintenance' && $this->available_slots >= $requestedBeds;
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
     */
    public function assignTenant($tenantId, $moveInDate = null, $bedCount = 1)
    {
        $requestedBeds = (int) ($bedCount ?: 1);

        // Check if room has physical space for more active tenants/beds
        $currentOccupied = $this->occupied;
        if ($currentOccupied + $requestedBeds > $this->capacity) {
            throw new \Exception('Room has insufficient available beds');
        }

        // Add tenant to room_tenant_assignments
        $this->tenants()->attach($tenantId, [
            'start_date' => $moveInDate ?? now()->format('Y-m-d'),
            'bed_count' => $requestedBeds,
            'monthly_rent' => $this->monthly_rate,
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
    public function removeTenant($tenantId = null)
    {
        if ($tenantId) {
            // Remove specific tenant
            $this->tenants()->updateExistingPivot($tenantId, [
                'status' => 'ended',
                'end_date' => now()->format('Y-m-d'),
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
                'end_date' => now()->format('Y-m-d'),
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
