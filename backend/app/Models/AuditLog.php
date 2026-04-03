<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'domain',
        'event',
        'severity',
        'actor_id',
        'actor_role',
        'subject_type',
        'subject_id',
        'booking_id',
        'invoice_id',
        'payment_transaction_id',
        'property_id',
        'tenant_id',
        'landlord_id',
        'status_before',
        'status_after',
        'summary',
        'metadata',
        'request_id',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
