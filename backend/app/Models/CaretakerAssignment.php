<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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
