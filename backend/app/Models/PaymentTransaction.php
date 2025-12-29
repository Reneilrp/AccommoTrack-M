<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentTransaction extends Model
{
    use HasFactory;

    protected $table = 'payment_transactions';

    protected $fillable = [
        'invoice_id', 'tenant_id', 'amount_cents', 'currency', 'status', 'method',
        'gateway_reference', 'gateway_response', 'idempotency_key', 'refunded_amount_cents',
        'gateway_fee_cents', 'net_amount_cents', 'balance_transaction_id', 'provider_event_id'
    ];

    protected $casts = [
        'gateway_response' => 'array',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function tenant()
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }
}
