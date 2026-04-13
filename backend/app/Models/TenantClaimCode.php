<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TenantClaimCode extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'landlord_id',
        'code_hash',
        'challenge_token',
        'attempts',
        'max_attempts',
        'expires_at',
        'challenge_verified_at',
        'challenge_expires_at',
        'pending_email',
        'pending_password',
        'otp_hash',
        'otp_expires_at',
        'otp_sent_at',
        'used_at',
        'revoked_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'challenge_verified_at' => 'datetime',
        'challenge_expires_at' => 'datetime',
        'otp_expires_at' => 'datetime',
        'otp_sent_at' => 'datetime',
        'used_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function scopeActive($query)
    {
        return $query
            ->whereNull('used_at')
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now());
    }

    public function tenant()
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }

    public function landlord()
    {
        return $this->belongsTo(User::class, 'landlord_id');
    }
}
