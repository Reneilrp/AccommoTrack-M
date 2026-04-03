<?php

namespace App\Http\Controllers\Permission;

use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

trait ResolvesLandlordAccess
{
    protected function resolveLandlordContext(Request $request): array
    {
        $user = $request->user();

        if (! $user || ! $user->managesLandlordData()) {
            throw new AccessDeniedHttpException('Landlord or caretaker access required.');
        }

        $landlordId = $user->effectiveLandlordId();

        if (! $landlordId) {
            throw new AccessDeniedHttpException('Caretaker assignment is missing.');
        }

        return [
            'landlord_id' => $landlordId,
            'is_caretaker' => $user->isCaretaker(),
            'assignment' => $user->isCaretaker() ? $user->caretakerAssignment : null,
            'user' => $user,
        ];
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
}
