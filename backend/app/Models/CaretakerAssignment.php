<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property int $id
 * @property int $landlord_id
 * @property int $caretaker_id
 * @property bool $can_view_bookings
 * @property bool $can_view_messages
 * @property bool $can_view_tenants
 * @property bool $can_view_rooms
 * @property bool $can_view_properties
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User $caretaker
 * @property-read \App\Models\User $landlord
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Property> $properties
 * @property-read int|null $properties_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CaretakerAssignment newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CaretakerAssignment newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CaretakerAssignment query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CaretakerAssignment whereCanViewBookings($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CaretakerAssignment whereCanViewMessages($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CaretakerAssignment whereCanViewProperties($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CaretakerAssignment whereCanViewRooms($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CaretakerAssignment whereCanViewTenants($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CaretakerAssignment whereCaretakerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CaretakerAssignment whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CaretakerAssignment whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CaretakerAssignment whereLandlordId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CaretakerAssignment whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class CaretakerAssignment extends Model
{
    protected $fillable = [
        'landlord_id',
        'caretaker_id',
        'can_view_bookings',
        'can_view_messages',
        'can_view_tenants',
        'can_view_rooms',
        'can_view_properties',
    ];

    protected $casts = [
        'can_view_bookings' => 'boolean',
        'can_view_messages' => 'boolean',
        'can_view_tenants' => 'boolean',
        'can_view_rooms' => 'boolean',
        'can_view_properties' => 'boolean',
    ];

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(User::class, 'landlord_id');
    }

    public function caretaker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'caretaker_id');
    }

    /**
     * Properties assigned to this caretaker
     */
    public function properties(): BelongsToMany
    {
        return $this->belongsToMany(
            Property::class,
            'caretaker_property_assignments',
            'caretaker_assignment_id',
            'property_id'
        )->withTimestamps();
    }

    /**
     * Get assigned property IDs
     */
    public function getAssignedPropertyIds(): array
    {
        return $this->properties()->pluck('properties.id')->toArray();
    }

    /**
     * Sync assigned properties
     */
    public function syncProperties(array $propertyIds): void
    {
        $this->properties()->sync($propertyIds);
    }
}
