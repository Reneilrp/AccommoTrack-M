<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LandlordVerificationHistory extends Model
{
    use HasFactory;

    protected $table = 'landlord_verification_history';

    protected $fillable = [
        'landlord_verification_id',
        'valid_id_type',
        'valid_id_other',
        'valid_id_path',
        'permit_path',
        'status',
        'rejection_reason',
        'submitted_at',
        'reviewed_at',
        'reviewed_by',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function verification()
    {
        return $this->belongsTo(LandlordVerification::class, 'landlord_verification_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
