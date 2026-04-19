<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReceiptDispute extends Model
{
    protected $fillable = [
        'invoice_id',
        'receipt_reference',
        'reporter_name',
        'reporter_email',
        'message',
        'status',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
}
