<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $reference
 * @property int $landlord_id
 * @property int|null $property_id
 * @property int|null $booking_id
 * @property int|null $tenant_id
 * @property string|null $description
 * @property int|null $subtotal_cents
 * @property int|null $tax_cents
 * @property numeric|null $tax_percent
 * @property int|null $total_cents
 * @property int $amount_cents
 * @property string $currency
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $due_date
 * @property \Illuminate\Support\Carbon|null $issued_at
 * @property \Illuminate\Support\Carbon|null $paid_at
 * @property array<array-key, mixed>|null $metadata
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Property|null $property
 * @property-read \App\Models\User|null $tenant
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PaymentTransaction> $transactions
 * @property-read int|null $transactions_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereAmountCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereBookingId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereCurrency($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereDueDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereIssuedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereLandlordId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice wherePaidAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice wherePropertyId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereReference($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereSubtotalCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereTaxCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereTaxPercent($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereTotalCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Invoice whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class Invoice extends Model
{
    use HasFactory;

    protected $table = 'invoices';

    protected $fillable = [
        'reference', 'landlord_id', 'property_id', 'booking_id', 'tenant_id', 'description',
        'amount_cents', 'currency', 'status', 'due_date', 'issued_at', 'paid_at', 'metadata',
        'subtotal_cents', 'tax_cents', 'total_cents', 'tax_percent'
    ];

    protected $casts = [
        'metadata' => 'array',
        'issued_at' => 'datetime',
        'paid_at' => 'datetime',
        'due_date' => 'date',
    ];

    public function transactions()
    {
        return $this->hasMany(PaymentTransaction::class, 'invoice_id');
    }

    public function tenant()
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }

    public function property()
    {
        return $this->belongsTo(Property::class, 'property_id');
    }
}
