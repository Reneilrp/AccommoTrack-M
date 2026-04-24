<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

/**
 * @property int $id
 * @property int $property_id
 * @property int $room_id
 * @property int $tenant_id
 * @property int $landlord_id
 * @property string $booking_reference
 * @property \Illuminate\Support\Carbon $start_date
 * @property \Illuminate\Support\Carbon $end_date
 * @property int $total_months
 * @property numeric $monthly_rent
 * @property numeric $total_amount
 * @property numeric|null $refund_amount
 * @property string|null $refund_processed_at
 * @property string $status
 * @property string $payment_status
 * @property string|null $payment_method
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon|null $cancelled_at
 * @property string|null $cancellation_reason
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Addon> $addons
 * @property-read int|null $addons_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Invoice> $invoices
 * @property-read int|null $invoices_count
 * @property-read \App\Models\User $landlord
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Payment> $payments
 * @property-read int|null $payments_count
 * @property-read \App\Models\Property $property
 * @property-read \App\Models\Room $room
 * @property-read \App\Models\User $tenant
 *
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking cancelled()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking confirmed()
 * @method static \Database\Factories\BookingFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking forLandlord(int $landlordId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking forProperty(int $propertyId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking forTenant(int $tenantId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking paid()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking paymentStatus(string $status)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking pending()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking unpaid()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereBookingReference($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereCancellationReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereCancelledAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereEndDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereLandlordId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereMonthlyRent($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking wherePaymentMethod($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking wherePaymentStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking wherePropertyId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereRefundAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereRefundProcessedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereRoomId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereStartDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereTotalAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereTotalMonths($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Booking whereUpdatedAt($value)
 *
 * @mixin \Eloquent
 */
class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'tenant_id',
        'booking_mode',
        'landlord_id',
        'guest_name',
        'room_id',
        'bed_count',
        'bed_numbers',
        'booking_reference',
        'booking_group_reference',
        'start_date',
        'end_date',
        'move_in_date',
        'total_months',
        'monthly_rent',
        'total_amount',
        'status',
        'payment_status',
        'payment_plan',
        'contract_mode',
        'next_billing_date',
        'billing_day',
        'deposit_balance',
        'payment_method',
        'receipt_image_path',
        'reference_number',
        'notes',
        'cancelled_at',
        'cancellation_reason',
        'confirmed_at',
        'notice_given_at',
        'refund_amount',
        'refund_processed_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'monthly_rent' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'booking_mode' => 'string',
        'booking_group_reference' => 'string',
        'contract_mode' => 'string',
        'next_billing_date' => 'date',
        'billing_day' => 'integer',
        'deposit_balance' => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'cancelled_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'notice_given_at' => 'datetime',
        'refund_processed_at' => 'datetime',
        'guest_name' => 'string',
    ];

    protected function amount(): Attribute
    {
        return Attribute::make(
            // When reading from DB: divide by 100 (10000 -> 100.00)
            get: fn ($value) => $value !== null ? $value / 100 : null,
            
            // When saving to DB: multiply by 100 (100.00 -> 10000)
            set: fn ($value) => $value !== null ? (int) round($value * 100) : null,
        );
    }

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

    /**
     * Relationship: Booking has many proxy occupants.
     */
    public function occupants()
    {
        return $this->hasMany(BookingOccupant::class);
    }

    /**
     * Relationship: Booking has many Addons through pivot
     */
    public function addons()
    {
        return $this->belongsToMany(Addon::class, 'booking_addons')
            ->withPivot([
                'id',
                'quantity',
                'price_at_booking',
                'price_at_booking_cents',
                'status',
                'request_note',
                'response_note',
                'approved_at',
                'approved_by',
                'invoiced_at',
                'invoice_id',
                'cancellation_requested_at',
                'cancellation_effective_at',
            ])
            ->withTimestamps();
    }

    /**
     * Get active monthly addons for this booking
     */
    public function activeMonthlyAddons()
    {
        return $this->addons()
            ->wherePivot('status', 'active')
            ->where('price_type', 'monthly');
    }

    /**
     * Get pending addon requests for this booking
     */
    public function pendingAddons()
    {
        return $this->addons()->wherePivot('status', 'pending');
    }

    /**
     * Relationship: Booking has many Payments
     */
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Relationship: Booking has many Invoices
     */
    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * Relationship: Booking has many Deposit Settlements
     */
    public function depositSettlements()
    {
        return $this->hasMany(BookingDepositSettlement::class)->orderByDesc('created_at');
    }

    /**
     * Relationship: Booking has many Billing Reminder Logs
     */
    public function billingReminderLogs()
    {
        return $this->hasMany(BillingReminderLog::class)->orderByDesc('sent_at');
    }

    /**
     * Relationship: Booking has many Maintenance Requests
     */
    public function maintenanceRequests()
    {
        return $this->hasMany(MaintenanceRequest::class);
    }

    /**
     * Relationship: Booking has one Review
     */
    public function review()
    {
        return $this->hasOne(Review::class);
    }

    // ====================================================================
    // QUERY SCOPES
    // ====================================================================

    /**
     * Scope: Filter by landlord
     */
    public function scopeForLandlord($query, int $landlordId)
    {
        return $query->where('landlord_id', $landlordId);
    }

    /**
     * Scope: Filter by tenant
     */
    public function scopeForTenant($query, int $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope: Filter by property
     */
    public function scopeForProperty($query, int $propertyId)
    {
        return $query->where('property_id', $propertyId);
    }

    /**
     * Scope: Filter confirmed/completed bookings (for revenue calculation)
     */
    public function scopeConfirmed($query)
    {
        return $query->whereIn('status', ['confirmed', 'completed', 'partial-completed']);
    }

    /**
     * Scope: Filter pending bookings
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope: Filter cancelled bookings
     */
    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    /**
     * Scope: Filter by payment status
     */
    public function scopePaymentStatus($query, string $status)
    {
        return $query->where('payment_status', $status);
    }

    /**
     * Scope: Filter paid bookings
     */
    public function scopePaid($query)
    {
        return $query->where('payment_status', 'paid');
    }

    /**
     * Scope: Filter unpaid/partial bookings
     */
    public function scopeUnpaid($query)
    {
        return $query->whereIn('payment_status', ['unpaid', 'partial']);
    }

    /**
     * Resolve occupied slots for billing/display.
     */
    public function resolveOccupiedSlots(?int $occupantsCount = null): int
    {
        $bedCount = max(1, (int) ($this->bed_count ?? 1));

        if (($this->booking_mode ?? 'normal') !== 'proxy') {
            return $bedCount;
        }

        $resolvedOccupants = $occupantsCount;
        if ($resolvedOccupants === null) {
            $resolvedOccupants = (int) ($this->occupants_count ?? 0);
        }

        if ($resolvedOccupants <= 0 && $this->relationLoaded('occupants')) {
            $resolvedOccupants = (int) $this->occupants->count();
        }

        if ($resolvedOccupants <= 0) {
            $resolvedOccupants = $bedCount;
        }

        return max($bedCount, $resolvedOccupants, 1);
    }

    /**
     * Resolve monthly rent total for this booking.
     *
     * For legacy proxy/per-bed records where monthly_rent was stored as a single-bed price,
     * normalize to room monthly_rate * occupied slots.
     */
    public function resolveEffectiveMonthlyRent(?int $occupiedSlots = null): float
    {
        $storedMonthlyRent = max(0.0, (float) ($this->monthly_rent ?? 0));
        $room = $this->room;

        if (! $room) {
            return $storedMonthlyRent;
        }

        if (($this->booking_mode ?? 'normal') !== 'proxy') {
            return $storedMonthlyRent;
        }

        $billingPolicy = strtolower((string) ($room->billing_policy ?? 'monthly'));
        if ($billingPolicy === 'daily') {
            return $storedMonthlyRent;
        }

        $pricingModel = strtolower((string) ($room->pricing_model ?? 'full_room'));
        if ($pricingModel !== 'per_bed') {
            return $storedMonthlyRent;
        }

        $slots = max(1, (int) ($occupiedSlots ?? $this->resolveOccupiedSlots()));
        $perBedMonthlyRate = max(0.0, (float) ($room->monthly_rate ?? 0));

        if ($slots <= 1 || $perBedMonthlyRate <= 0) {
            return $storedMonthlyRent;
        }

        $expectedTotal = $perBedMonthlyRate * $slots;

        if ($storedMonthlyRent <= 0.0) {
            return $expectedTotal;
        }

        if ($storedMonthlyRent <= ($perBedMonthlyRate + 0.01)) {
            return $expectedTotal;
        }

        return $storedMonthlyRent;
    }
}
