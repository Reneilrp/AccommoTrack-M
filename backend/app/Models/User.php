<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\SoftDeletes;
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
 *
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
 *
 * @mixin \Eloquent
 */
class User extends Authenticatable
{
    use HasApiTokens, Notifiable, SoftDeletes;

    protected $fillable = [
        'role',
        'email',
        'password',
        'first_name',
        'middle_name',
        'last_name',
        'sex',
        'identified_as',
        'phone',
        'date_of_birth',
        'profile_image',
        'is_verified',
        'is_active',
        'payment_methods_settings',
        'notification_preferences',
        'preferences',
        'is_blocked',
        'paymongo_child_id',
        'paymongo_verification_status',
        'paymongo_verification_bypass',
        'email_otp_code',
        'email_otp_expires_at',
        'strikes',
        'suspended_until',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'email_otp_code',
        'email_otp_expires_at',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_blocked' => 'boolean',
        'is_active' => 'boolean',
        'push_notifications_enabled' => 'boolean',
        'email_notifications_enabled' => 'boolean',
        'last_active_at' => 'datetime',
        'suspended_until' => 'datetime',
        'strikes' => 'integer',
        'payment_methods_settings' => 'array',
        'notification_preferences' => 'array',
        'preferences' => 'array',
        'date_of_birth' => 'date',
        'paymongo_verification_bypass' => 'boolean',
    ];

    protected $appends = [
        'caretaker_permissions',
        'name',
        'is_paymongo_ready',
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted()
    {
        static::deleting(function ($user) {
            // Check if this is a soft delete (not a force delete)
            if (method_exists($user, 'isForceDeleting') && ! $user->isForceDeleting()) {
                // To avoid conflict with UNIQUE email constraint while allowing re-registration,
                // we append a timestamp suffix to the email of the deleted record.
                // We only do this if it hasn't been renamed yet (avoiding multiple suffixes).
                if (! str_contains($user->email, '.deleted.')) {
                    $originalEmail = $user->email;
                    $user->email = $originalEmail . '.deleted.' . time();
                    // We must save manually here because runSoftDelete only updates deleted_at
                    $user->save();
                }
            }
        });

        static::restoring(function ($user) {
            if (str_contains($user->email, '.deleted.')) {
                $restoredEmail = explode('.deleted.', $user->email)[0];
                // Only restore original email if it's not taken by another ACTIVE user
                if (! static::where('email', $restoredEmail)->exists()) {
                    $user->email = $restoredEmail;
                }
            }
        });
    }

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
     * Subscription records for landlord accounts.
     */
    public function landlordSubscriptions()
    {
        return $this->hasMany(LandlordSubscription::class, 'landlord_id');
    }

    /**
     * Active/effective subscription record for landlord accounts.
     */
    public function activeLandlordSubscription()
    {
        return $this->hasOne(LandlordSubscription::class, 'landlord_id')
            ->whereIn('status', [
                LandlordSubscription::STATUS_ACTIVE,
                LandlordSubscription::STATUS_GRACE,
                LandlordSubscription::STATUS_RESTRICTED,
            ])
            ->where('starts_at', '<=', now())
            ->where(function ($query) {
                $query->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->latestOfMany('starts_at');
    }

    /**
     * Admin grant records for landlord subscriptions.
     */
    public function subscriptionGrants()
    {
        return $this->hasMany(SubscriptionGrant::class, 'landlord_id');
    }

    /**
     * Landlord verification record
     */
    public function landlordVerification()
    {
        return $this->hasOne(LandlordVerification::class, 'user_id');
    }

    /**
     * Legal consent records accepted by this user.
     */
    public function legalConsents()
    {
        return $this->hasMany(UserLegalConsent::class, 'user_id');
    }

    /**
     * Bookings made by tenant
     */
    public function bookings()
    {
        return $this->hasMany(Booking::class, 'tenant_id');
    }

    /**
     * Eviction records where this user is the tenant.
     */
    public function tenantEvictions()
    {
        return $this->hasMany(TenantEviction::class, 'tenant_id');
    }

    /**
     * Latest scheduled eviction for this tenant.
     */
    public function scheduledEviction()
    {
        return $this->hasOne(TenantEviction::class, 'tenant_id')
            ->where('status', 'scheduled')
            ->latestOfMany('scheduled_for');
    }

    /**
     * Latest eviction record regardless of status.
     */
    public function latestEvictionRecord()
    {
        return $this->hasOne(TenantEviction::class, 'tenant_id')->latestOfMany();
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
        return trim($this->first_name.' '.$this->middle_name.' '.$this->last_name);
    }

    /**
     * Get name attribute as alias for full_name
     */
    public function getNameAttribute()
    {
        return $this->full_name;
    }

    /**
     * Get profile image URL — automatically resolves to CDN/storage URL.
     * Handles both old full-URL values and new relative path values.
     */
    public function getProfileImageAttribute(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        // Already a full URL (e.g. old records or already-transformed values)
        if (str_starts_with($value, 'http')) {
            return $value;
        }

        // Strip any stale leading /storage/ or storage/ prefix from old DB values
        $clean = ltrim(preg_replace('#^/?storage/#', '', $value), '/');

        return Storage::url($clean);
    }

    /**
     * Custom notifications relationship to override the default Laravel one.
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class, 'user_id')->orderBy('created_at', 'desc');
    }

    /**
     * Custom unread notifications relationship.
     */
    public function unreadNotifications()
    {
        return $this->notifications()->where('is_read', false);
    }

    /**
     * Registered device push tokens for Expo notifications.
     */
    public function pushTokens()
    {
        return $this->hasMany(DevicePushToken::class, 'user_id');
    }

    public function getCaretakerPermissionsAttribute(): array
    {
        if (! $this->isCaretaker()) {
            return [
                'bookings' => true,
                'approve_bookings' => true,
                'cancel_bookings' => true,
                'manage_add_ons' => true,
                'messages' => true,
                'tenants' => true,
                'rooms' => true,
                'properties' => true,
                'maintenance' => true,
                'payments' => true,
                'analytics' => true,
                'view_audit_logs' => true,
                'can_approve_bookings' => true,
                'can_cancel_bookings' => true,
                'can_manage_add_ons' => true,
                'can_view_audit_logs' => true,
            ];
        }

        // Load the assignment if not already loaded
        if (! $this->relationLoaded('caretakerAssignment')) {
            $this->load('caretakerAssignment');
        }

        $assignment = $this->caretakerAssignment;

        return [
            'bookings' => (bool) optional($assignment)->can_view_bookings,
            'approve_bookings' => (bool) optional($assignment)->can_approve_bookings,
            'cancel_bookings' => (bool) optional($assignment)->can_cancel_bookings,
            'manage_add_ons' => (bool) optional($assignment)->can_manage_add_ons,
            'messages' => (bool) optional($assignment)->can_view_messages,
            'tenants' => (bool) optional($assignment)->can_view_tenants,
            'rooms' => (bool) optional($assignment)->can_view_rooms,
            'properties' => (bool) optional($assignment)->can_view_properties,
            'maintenance' => (bool) optional($assignment)->can_manage_maintenance,
            'payments' => (bool) optional($assignment)->can_manage_payments,
            'analytics' => (bool) optional($assignment)->can_view_analytics,
            'view_audit_logs' => (bool) optional($assignment)->can_view_audit_logs,
            'can_approve_bookings' => (bool) optional($assignment)->can_approve_bookings,
            'can_cancel_bookings' => (bool) optional($assignment)->can_cancel_bookings,
            'can_manage_add_ons' => (bool) optional($assignment)->can_manage_add_ons,
            'can_view_audit_logs' => (bool) optional($assignment)->can_view_audit_logs,
        ];
    }

    /**
     * Check if this landlord is ready to accept PayMongo payments.
     * Returns true if verified OR if bypass is enabled for testing.
     */
    public function getIsPaymongoReadyAttribute(): bool
    {
        return $this->isPaymongoReady();
    }

    public function isPaymongoReady(): bool
    {
        // Check if bypass is enabled for this specific user
        if ((bool) $this->paymongo_verification_bypass) {
            return true;
        }

        // Normal verification check
        return $this->paymongo_child_id && $this->paymongo_verification_status === 'verified';
    }
}
