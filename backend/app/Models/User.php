<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'password',
        'role',
        'phone',
        'profile_image',
        'is_verified',
        'is_active',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_verified' => 'boolean',
        'is_active' => 'boolean',
        'password' => 'hashed',
    ];
    protected $appends = [
        'age'
    ];


    // === RELATIONSHIPS ===
    public function tenantProfile()
    {
        return $this->hasOne(TenantProfile::class);
    }

    public function room()
    {
        return $this->hasOne(Room::class, 'tenant_id');
    }

    public function isTenant()
    {
        return $this->role === 'tenant';
    }

    public function isLandlord()
    {
        return $this->role === 'landlord';
    }

    public function getAgeAttribute()
    {
        if (!$this->tenantProfile || !$this->tenantProfile->date_of_birth) {
            return null;
        }

        $birthDate = $this->tenantProfile->date_of_birth;
        return \Carbon\Carbon::parse($birthDate)->age;
    }
}
