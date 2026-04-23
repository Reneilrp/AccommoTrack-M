<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class TenantCredit extends Model
{
    protected function amount(): Attribute
{
    return Attribute::make(
        // When reading from DB: divide by 100 (10000 -> 100.00)
        get: fn ($value) => $value !== null ? $value / 100 : null,
        
        // When saving to DB: multiply by 100 (100.00 -> 10000)
        set: fn ($value) => $value !== null ? (int) round($value * 100) : null,
    );
}
    protected $guarded = [];

    public function tenant()
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }

    public function property()
    {
        return $this->belongsTo(Property::class, 'property_id');
    }

    public function room()
    {
        return $this->belongsTo(Room::class, 'room_id');
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public static function getBalance($tenantId, $propertyId = null)
    {
        $query = self::where('tenant_id', $tenantId);
        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        $credits = (clone $query)->whereIn('type', ['credit', 'refund'])->sum('amount_cents');
        $debits = (clone $query)->where('type', 'debit')->sum('amount_cents');

        return max(0, $credits - $debits);
    }
}
