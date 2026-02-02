<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $role
 * @property string $email
 * @property string $password
 * @property string|null $remember_token
 * @property string $first_name
 * @property string|null $middle_name
 * @property string $last_name
 * @property string|null $phone
 * @property string|null $profile_image
 * @property bool $is_verified
 * @property bool $is_active
 * @property array<array-key, mixed>|null $payment_methods_settings
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Booking> $bookings
 * @property-read int|null $bookings_count
 * @property-read \App\Models\CaretakerAssignment|null $caretakerAssignment
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\CaretakerAssignment> $caretakers
 * @property-read int|null $caretakers_count
 * @property-read array $caretaker_permissions
 * @property-read mixed $current_room
 * @property-read mixed $full_name
 * @property-read \Illuminate\Notifications\DatabaseNotificationCollection<int, \Illuminate\Notifications\DatabaseNotification> $notifications
 * @property-read int|null $notifications_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Property> $properties
 * @property-read int|null $properties_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Booking> $receivedBookings
 * @property-read int|null $received_bookings_count
 * @property-read \App\Models\Room|null $room
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Room> $roomAssignments
 * @property-read int|null $room_assignments_count
 * @property-read \App\Models\TenantProfile|null $tenantProfile
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Laravel\Sanctum\PersonalAccessToken> $tokens
 * @property-read int|null $tokens_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User landlords()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User tenants()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereFirstName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereIsVerified($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereLastName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereMiddleName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePaymentMethodsSettings($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePhone($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereProfileImage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRememberToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRole($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'role',
        'email',
        'password',
        'first_name',
        'middle_name',
        'last_name',
        'phone',
        'profile_image',
        'is_verified',
        'is_active',
        'payment_methods_settings',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_verified' => 'boolean',
        'is_active' => 'boolean',
        'payment_methods_settings' => 'array',
    ];

    protected $appends = [
        'caretaker_permissions',
    ];

    /**
     * Tenant Profile relationship (for tenants only)
     */
    public function tenantProfile()
    {
        return $this->hasOne(TenantProfile::class, 'user_id');
    }

    /**
     * Room relationship (tenant's current room)
     * Uses 'current_tenant_id' column in rooms table
     */
    public function room()
    {
        return $this->hasOne(Room::class, 'current_tenant_id');
    }

    /**
     * Room assignments relationship (many-to-many through room_tenant_assignments)
     */
    public function roomAssignments()
    {
        return $this->belongsToMany(Room::class, 'room_tenant_assignments', 'tenant_id', 'room_id')
                    ->withPivot('start_date', 'end_date', 'status', 'monthly_rent')
                    ->wherePivot('status', 'active');
    }

    /**
     * Get current active room assignment
     */
    public function getCurrentRoomAttribute()
    {
        return $this->roomAssignments()->first();
    }

    /**
     * Properties owned by landlord
     */
    public function properties()
    {
        return $this->hasMany(Property::class, 'landlord_id');
    }

    /**
     * Landlord verification record
     */
    public function landlordVerification()
    {
        return $this->hasOne(LandlordVerification::class, 'user_id');
    }

    /**
     * Bookings made by tenant
     */
    public function bookings()
    {
        return $this->hasMany(Booking::class, 'tenant_id');
    }

    /**
     * Bookings received by landlord
     */
    public function receivedBookings()
    {
        return $this->hasMany(Booking::class, 'landlord_id');
    }

    /**
     * Caretakers that belong to this landlord
     */
    public function caretakers()
    {
        return $this->hasMany(CaretakerAssignment::class, 'landlord_id');
    }

    /**
     * Landlord assignment for caretaker user
     */
    public function caretakerAssignment()
    {
        return $this->hasOne(CaretakerAssignment::class, 'caretaker_id');
    }

    /**
     * Scope: Get only landlords
     */
    public function scopeLandlords($query)
    {
        return $query->where('role', 'landlord');
    }

    /**
     * Scope: Get only tenants
     */
    public function scopeTenants($query)
    {
        return $query->where('role', 'tenant');
    }

    /**
     * Determine landlord context for landlord/caretaker
     */
    public function effectiveLandlordId(): ?int
    {
        if ($this->role === 'landlord') {
            return $this->id;
        }

        if ($this->role === 'caretaker' && $this->caretakerAssignment) {
            return $this->caretakerAssignment->landlord_id;
        }

        return null;
    }

    public function managesLandlordData(): bool
    {
        return $this->role === 'landlord' || ($this->role === 'caretaker' && (bool) $this->caretakerAssignment);
    }

    public function isCaretaker(): bool
    {
        return $this->role === 'caretaker';
    }

    /**
     * Get full name attribute
     */
    public function getFullNameAttribute()
    {
        return trim($this->first_name . ' ' . $this->middle_name . ' ' . $this->last_name);
    }

    public function getCaretakerPermissionsAttribute(): array
    {
        if (!$this->isCaretaker()) {
            return [
                'bookings' => true,
                'messages' => true,
                'tenants' => true,
                'rooms' => true,
                'properties' => true,
            ];
        }

        // Load the assignment if not already loaded
        if (!$this->relationLoaded('caretakerAssignment')) {
            $this->load('caretakerAssignment');
        }

        $assignment = $this->caretakerAssignment;

        return [
            'bookings' => (bool) optional($assignment)->can_view_bookings,
            'messages' => (bool) optional($assignment)->can_view_messages,
            'tenants' => (bool) optional($assignment)->can_view_tenants,
            'rooms' => (bool) optional($assignment)->can_view_rooms,
            'properties' => (bool) optional($assignment)->can_view_properties,
        ];
    }
}