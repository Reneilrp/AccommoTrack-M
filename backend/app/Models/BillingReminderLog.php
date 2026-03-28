<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BillingReminderLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'booking_id',
        'tenant_id',
        'reminder_type',
        'target_date',
        'sent_at',
    ];

    protected $casts = [
        'target_date' => 'date',
        'sent_at' => 'datetime',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function tenant()
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }
}
