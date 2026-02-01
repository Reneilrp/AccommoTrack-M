<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $property_id
 * @property string $name
 * @property string|null $description
 * @property numeric $price
 * @property string $price_type
 * @property string $addon_type
 * @property int|null $stock
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Booking> $bookings
 * @property-read int|null $bookings_count
 * @property-read string $addon_type_label
 * @property-read string $price_type_label
 * @property-read \App\Models\Property $property
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon active()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon monthly()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon oneTime()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon whereAddonType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon wherePrice($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon wherePriceType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon wherePropertyId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon whereStock($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Addon whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class Addon extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'name',
        'description',
        'price',
        'price_type',
        'addon_type',
        'stock',
        'is_active'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'stock' => 'integer',
        'is_active' => 'boolean'
    ];

    /**
     * Relationship: Addon belongs to Property
     */
    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * Relationship: Addon has many bookings through pivot
     */
    public function bookings()
    {
        return $this->belongsToMany(Booking::class, 'booking_addons')
                    ->withPivot([
                        'id',
                        'quantity',
                        'price_at_booking',
                        'status',
                        'request_note',
                        'response_note',
                        'approved_at',
                        'approved_by',
                        'invoiced_at',
                        'invoice_id'
                    ])
                    ->withTimestamps();
    }

    /**
     * Scope: Only active addons
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Monthly recurring addons
     */
    public function scopeMonthly($query)
    {
        return $query->where('price_type', 'monthly');
    }

    /**
     * Scope: One-time addons
     */
    public function scopeOneTime($query)
    {
        return $query->where('price_type', 'one_time');
    }

    /**
     * Check if addon has available stock
     */
    public function hasStock(): bool
    {
        // If stock is null, it's unlimited
        if (is_null($this->stock)) {
            return true;
        }

        return $this->stock > 0;
    }

    /**
     * Get the display label for price type
     */
    public function getPriceTypeLabelAttribute(): string
    {
        return match($this->price_type) {
            'one_time' => 'One-time',
            'monthly' => 'Monthly',
            default => $this->price_type
        };
    }

    /**
     * Get the display label for addon type
     */
    public function getAddonTypeLabelAttribute(): string
    {
        return match($this->addon_type) {
            'rental' => 'Rental (Provided)',
            'fee' => 'Usage Fee',
            default => $this->addon_type
        };
    }
}
