<?php

namespace App\Http\Controllers\Permission;

use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

trait ResolvesLandlordAccess
{
    protected function resolveLandlordContext(Request $request): array
    {
        $user = $request->user();

        if (! $user) {
            throw new AccessDeniedHttpException('Authentication required.');
        }

        $cacheKey = "user_landlord_context_{$user->id}";

        return \Illuminate\Support\Facades\Cache::remember($cacheKey, 1800, function () use ($user) {
            if (! $user->managesLandlordData()) {
                throw new AccessDeniedHttpException('Landlord or caretaker access required.');
            }

            $landlordId = $user->effectiveLandlordId();

            if (! $landlordId) {
                throw new AccessDeniedHttpException('Caretaker assignment is missing.');
            }

            return [
                'landlord_id' => $landlordId,
                'is_caretaker' => $user->isCaretaker(),
                // Store assignment as array to avoid serialization issues with large objects
                'assignment' => $user->isCaretaker() ? $user->caretakerAssignment : null,
                'user_id' => $user->id,
            ];
        }) + ['user' => $user]; // Always merge fresh user model
    }

    protected function ensureCaretakerCan(array $context, string $permissionColumn): void
    {
        if (! $context['is_caretaker']) {
            return;
        }

        $assignment = $context['assignment'];

        if (! $assignment || ! ($assignment->{$permissionColumn} ?? false)) {
            throw new AccessDeniedHttpException('Caretaker does not have permission to access this data: '.str_replace('can_view_', '', $permissionColumn));
        }
    }

    /**
     * Check if caretaker has access to a specific property.
     * Throws exception if access is denied.
     */
    protected function checkPropertyAccess(array $context, int $propertyId): void
    {
        if (! $context['is_caretaker']) {
            // If landlord, ensure they own the property
            $owns = \App\Models\Property::where('id', $propertyId)
                ->where('landlord_id', $context['landlord_id'])
                ->exists();
            if (! $owns) {
                throw new AccessDeniedHttpException('You do not own this property.');
            }

            return;
        }

        $assignment = $context['assignment'];
        if (! $assignment) {
            throw new AccessDeniedHttpException('Caretaker assignment not found.');
        }

        $isAssigned = $assignment->properties()->where('properties.id', $propertyId)->exists();
        if (! $isAssigned) {
            throw new AccessDeniedHttpException('Caretaker is not assigned to this property.');
        }
    }

    protected function assertNotCaretaker(array $context): void
    {
        if ($context['is_caretaker']) {
            throw new AccessDeniedHttpException('This action is restricted to landlords only.');
        }
    }

    /**
     * Centralized scoping logic for Tenants.
     * Ensures caretakers only see users/tenants belonging to their assigned properties.
     */
    protected function applyCaretakerTenantScope($query, array $context): void
    {
        if (! $context['is_caretaker']) {
            // Standard landlord scope: filter by landlord_id via existing relationships
            $query->where(function($q) use ($context) {
                $q->whereHas('roomAssignments.property', fn($p) => $p->where('landlord_id', $context['landlord_id']))
                  ->orWhereHas('bookings', fn($b) => $b->where('landlord_id', $context['landlord_id']))
                  ->orWhereHas('bookingOccupantRecords.booking', fn($b) => $b->where('landlord_id', $context['landlord_id']));
            });
            return;
        }

        $assignment = $context['assignment'];
        if (! $assignment) {
            throw new AccessDeniedHttpException('Caretaker assignment not found.');
        }

        $allowedPropertyIds = $assignment->properties()->pluck('properties.id')->toArray();

        if (empty($allowedPropertyIds)) {
            $query->whereRaw('1=0'); // Block all results if no properties assigned
            return;
        }

        $query->where(function ($q) use ($allowedPropertyIds) {
            $q->whereHas('roomAssignments', fn ($q2) => $q2->whereIn('property_id', $allowedPropertyIds))
                ->orWhereHas('bookings', fn ($q2) => $q2->whereIn('property_id', $allowedPropertyIds))
                ->orWhereHas('bookingOccupantRecords.booking', fn ($q2) => $q2->whereIn('property_id', $allowedPropertyIds));
        });
    }
}
