<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemBroadcast extends Model
{
    protected $fillable = [
        'created_by',
        'title',
        'message',
        'target_audience',
        'type',
        'is_active',
        'expires_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'expires_at' => 'datetime',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope: Only active (not expired) broadcasts
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            });
    }
}
