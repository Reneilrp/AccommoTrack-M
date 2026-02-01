<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int|null $invoice_id
 * @property int|null $tenant_id
 * @property int $amount_cents
 * @property int|null $gateway_fee_cents
 * @property int|null $net_amount_cents
 * @property string $currency
 * @property string $status
 * @property string|null $method
 * @property string|null $gateway_reference
 * @property string|null $balance_transaction_id
 * @property array<array-key, mixed>|null $gateway_response
 * @property string|null $idempotency_key
 * @property string|null $provider_event_id
 * @property int $refunded_amount_cents
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Invoice|null $invoice
 * @property-read \App\Models\User|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereAmountCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereBalanceTransactionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereCurrency($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereGatewayFeeCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereGatewayReference($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereGatewayResponse($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereIdempotencyKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereInvoiceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereMethod($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereNetAmountCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereProviderEventId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereRefundedAmountCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
