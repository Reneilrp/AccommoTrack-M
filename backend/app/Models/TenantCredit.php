<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TenantCredit extends Model
{
    protected $guarded = [];

    public function tenant()
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }

    public function property()
    {
        return $this->belongsTo(Property::class, 'property_id');
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
