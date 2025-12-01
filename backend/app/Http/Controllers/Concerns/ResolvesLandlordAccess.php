<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

trait ResolvesLandlordAccess
{
    protected function resolveLandlordContext(Request $request): array
    {
        $user = $request->user();

        if (!$user || !$user->managesLandlordData()) {
            throw new AccessDeniedHttpException('Landlord or caretaker access required.');
        }

        $landlordId = $user->effectiveLandlordId();

        if (!$landlordId) {
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
        if (!$context['is_caretaker']) {
            return;
        }

        $assignment = $context['assignment'];

        if (!$assignment || !$assignment->{$permissionColumn}) {
            throw new AccessDeniedHttpException('Caretaker does not have permission to access this data.');
        }
    }
}
