<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class TenantCredit extends Model
{
    protected function amountCents(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value !== null ? $value / 100 : null,
            set: fn ($value) => $value !== null ? (int) round($value * 100) : null,
        );
    }

    protected function amount(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->amount_cents,
            set: fn ($value) => ['amount_cents' => $value],
        );
    }

    public static function getBalance($tenantId, $propertyId = null)
    {
        $query = self::where('tenant_id', $tenantId);
        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        $credits = (clone $query)->whereIn('type', ['credit', 'refund'])->sum('amount_cents');
        $debits = (clone $query)->where('type', 'debit')->sum('amount_cents');

        // Return decimal (e.g., 100.00 instead of 10000)
        return max(0, ($credits - $debits) / 100);
    }
}
