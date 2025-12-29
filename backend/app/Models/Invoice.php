<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
