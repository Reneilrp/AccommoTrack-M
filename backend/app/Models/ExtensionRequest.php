<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExtensionRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'tenant_id',
        'landlord_id',
        'current_end_date',
        'requested_end_date',
        'extension_type',
        'proposed_amount',
        'tenant_notes',
        'landlord_notes',
        'status',
        'handled_at',
    ];

    protected $casts = [
        'current_end_date' => 'date',
        'requested_end_date' => 'date',
        'proposed_amount' => 'decimal:2',
        'handled_at' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
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
