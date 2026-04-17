<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoomTenantAssignment extends Model
{
    protected $table = 'room_tenant_assignments';

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'monthly_rent' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
        'bed_count' => 'integer',
        'room_id' => 'integer',
        'tenant_id' => 'integer',
    ];

    public function room()
    {
        return $this->belongsTo(Room::class, 'room_id');
    }

    public function tenant()
    {
        return $this->belongsTo(User::class, 'tenant_id');
    }
}
