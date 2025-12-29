<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesLandlordAccess;
use App\Models\CaretakerAssignment;
use App\Models\Property;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class CaretakerController extends Controller
{
    use ResolvesLandlordAccess;

    public function index(Request $request)
    {
        $context = $this->resolveLandlordContext($request);

        // Get landlord's properties for reference
        $landlordProperties = Property::where('landlord_id', $context['landlord_id'])
            ->select('id', 'title')
            ->get()
            ->map(fn($p) => ['id' => $p->id, 'name' => $p->title]);

        $assignments = CaretakerAssignment::with(['caretaker', 'properties:id,title'])
            ->where('landlord_id', $context['landlord_id'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (CaretakerAssignment $assignment) {
                return [
                    'id' => $assignment->id,
                    'caretaker' => [
                        'id' => $assignment->caretaker->id,
                        'first_name' => $assignment->caretaker->first_name,
                        'last_name' => $assignment->caretaker->last_name,
                        'email' => $assignment->caretaker->email,
                        'phone' => $assignment->caretaker->phone,
                        'is_active' => $assignment->caretaker->is_active,
                    ],
                    'permissions' => [
                        'bookings' => $assignment->can_view_bookings,
                        'messages' => $assignment->can_view_messages,
                        'tenants' => $assignment->can_view_tenants,
                        'rooms' => $assignment->can_view_rooms,
                        'properties' => $assignment->can_view_properties,
                    ],
                    'assigned_properties' => $assignment->properties->map(fn($p) => [
                        'id' => $p->id,
                        'name' => $p->title
                    ])->toArray(),
                    'assigned_property_ids' => $assignment->properties->pluck('id')->toArray(),
                    'created_at' => $assignment->created_at,
                ];
            });

        return response()->json([
            'caretakers' => $assignments,
            'landlord_properties' => $landlordProperties
        ]);
    }

    public function store(Request $request)
    {
        $context = $this->resolveLandlordContext($request);

        if ($context['is_caretaker']) {
            throw new AccessDeniedHttpException('Caretakers cannot create other caretakers.');
        }

        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|max:255|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:8|confirmed',
            'permissions.can_view_bookings' => 'sometimes|boolean',
            'permissions.can_view_messages' => 'sometimes|boolean',
            'permissions.can_view_tenants' => 'sometimes|boolean',
            'permissions.can_view_rooms' => 'sometimes|boolean',
            'permissions.can_view_properties' => 'sometimes|boolean',
            'property_ids' => 'sometimes|array',
            'property_ids.*' => 'integer|exists:properties,id',
        ]);

        // Validate that property_ids belong to this landlord
        if (!empty($validated['property_ids'])) {
            $validPropertyIds = Property::where('landlord_id', $context['landlord_id'])
                ->whereIn('id', $validated['property_ids'])
                ->pluck('id')
                ->toArray();
            $validated['property_ids'] = $validPropertyIds;
        }

        $temporaryPassword = $validated['password'] ?? Str::random(12);

        $caretaker = User::create([
            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($temporaryPassword),
            'role' => 'caretaker',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $permissions = [
            'can_view_bookings' => data_get($validated, 'permissions.can_view_bookings', true),
            'can_view_messages' => data_get($validated, 'permissions.can_view_messages', true),
            'can_view_tenants' => data_get($validated, 'permissions.can_view_tenants', true),
            'can_view_rooms' => data_get($validated, 'permissions.can_view_rooms', false),
            'can_view_properties' => data_get($validated, 'permissions.can_view_properties', false),
        ];

        $assignment = CaretakerAssignment::create(array_merge(
            [
                'landlord_id' => $context['landlord_id'],
                'caretaker_id' => $caretaker->id,
            ],
            $permissions
        ));

        // Assign properties if provided
        if (!empty($validated['property_ids'])) {
            $assignment->syncProperties($validated['property_ids']);
        }

        $assignment->load('properties:id,title');

        return response()->json([
            'message' => 'Caretaker access created successfully.',
            'caretaker' => [
                'assignment_id' => $assignment->id,
                'first_name' => $caretaker->first_name,
                'last_name' => $caretaker->last_name,
                'email' => $caretaker->email,
                'phone' => $caretaker->phone,
                'permissions' => [
                    'bookings' => $permissions['can_view_bookings'],
                    'messages' => $permissions['can_view_messages'],
                    'tenants' => $permissions['can_view_tenants'],
                    'rooms' => $permissions['can_view_rooms'],
                    'properties' => $permissions['can_view_properties'],
                ],
                'assigned_properties' => $assignment->properties->map(fn($p) => [
                    'id' => $p->id,
                    'name' => $p->title
                ])->toArray(),
            ],
            'temporary_password' => $temporaryPassword,
        ], 201);
    }

    public function update(Request $request, $assignmentId)
    {
        $context = $this->resolveLandlordContext($request);

        if ($context['is_caretaker']) {
            throw new AccessDeniedHttpException('Caretakers cannot update other caretaker permissions.');
        }

        $validated = $request->validate([
            'permissions' => 'sometimes|array',
            'permissions.can_view_bookings' => 'sometimes|boolean',
            'permissions.can_view_messages' => 'sometimes|boolean',
            'permissions.can_view_tenants' => 'sometimes|boolean',
            'permissions.can_view_rooms' => 'sometimes|boolean',
            'permissions.can_view_properties' => 'sometimes|boolean',
            'property_ids' => 'sometimes|array',
            'property_ids.*' => 'integer|exists:properties,id',
        ]);

        $assignment = CaretakerAssignment::where('landlord_id', $context['landlord_id'])
            ->with('caretaker')
            ->findOrFail($assignmentId);

        // Update permissions if provided
        if (isset($validated['permissions'])) {
            $payload = $validated['permissions'];

            $updates = [
                'can_view_bookings' => array_key_exists('can_view_bookings', $payload)
                    ? (bool) $payload['can_view_bookings']
                    : $assignment->can_view_bookings,
                'can_view_messages' => array_key_exists('can_view_messages', $payload)
                    ? (bool) $payload['can_view_messages']
                    : $assignment->can_view_messages,
                'can_view_tenants' => array_key_exists('can_view_tenants', $payload)
                    ? (bool) $payload['can_view_tenants']
                    : $assignment->can_view_tenants,
                'can_view_rooms' => array_key_exists('can_view_rooms', $payload)
                    ? (bool) $payload['can_view_rooms']
                    : $assignment->can_view_rooms,
                'can_view_properties' => array_key_exists('can_view_properties', $payload)
                    ? (bool) $payload['can_view_properties']
                    : $assignment->can_view_properties,
            ];

            $assignment->update($updates);
        }

        // Update property assignments if provided
        if (array_key_exists('property_ids', $validated)) {
            $propertyIds = $validated['property_ids'] ?? [];
            
            // Validate that property_ids belong to this landlord
            if (!empty($propertyIds)) {
                $validPropertyIds = Property::where('landlord_id', $context['landlord_id'])
                    ->whereIn('id', $propertyIds)
                    ->pluck('id')
                    ->toArray();
                $propertyIds = $validPropertyIds;
            }
            
            $assignment->syncProperties($propertyIds);
        }

        $assignment->refresh();
        $assignment->load('properties:id,title');

        return response()->json([
            'message' => 'Caretaker updated successfully.',
            'caretaker' => [
                'assignment_id' => $assignment->id,
                'first_name' => $assignment->caretaker->first_name,
                'last_name' => $assignment->caretaker->last_name,
                'email' => $assignment->caretaker->email,
                'phone' => $assignment->caretaker->phone,
                'permissions' => [
                    'bookings' => $assignment->can_view_bookings,
                    'messages' => $assignment->can_view_messages,
                    'tenants' => $assignment->can_view_tenants,
                    'rooms' => $assignment->can_view_rooms,
                    'properties' => $assignment->can_view_properties,
                ],
                'assigned_properties' => $assignment->properties->map(fn($p) => [
                    'id' => $p->id,
                    'name' => $p->title
                ])->toArray(),
            ],
        ]);
    }

    public function destroy(Request $request, $assignmentId)
    {
        $context = $this->resolveLandlordContext($request);

        $assignment = CaretakerAssignment::where('landlord_id', $context['landlord_id'])
            ->findOrFail($assignmentId);

        $caretaker = $assignment->caretaker;
        $assignment->delete();

        if ($caretaker) {
            $caretaker->update(['is_active' => false]);
        }

        return response()->json(['message' => 'Caretaker access revoked.']);
    }

    public function resetPassword(Request $request, $assignmentId)
    {
        $context = $this->resolveLandlordContext($request);

        if ($context['is_caretaker']) {
            throw new AccessDeniedHttpException('Caretakers cannot reset other credentials.');
        }

        $assignment = CaretakerAssignment::where('landlord_id', $context['landlord_id'])
            ->with('caretaker')
            ->findOrFail($assignmentId);

        $temporaryPassword = Str::random(12);
        $assignment->caretaker->update([
            'password' => Hash::make($temporaryPassword),
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Caretaker password reset.',
            'temporary_password' => $temporaryPassword,
        ]);
    }
}
