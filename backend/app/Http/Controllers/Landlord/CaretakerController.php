<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;

use App\Http\Controllers\Permission\ResolvesLandlordAccess;
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
        $this->assertNotCaretaker($context);

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
                        'maintenance' => $assignment->can_manage_maintenance,
                        'payments' => $assignment->can_manage_payments,
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
        $this->assertNotCaretaker($context);

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
            'permissions.can_manage_maintenance' => 'sometimes|boolean',
            'permissions.can_manage_payments' => 'sometimes|boolean',
            'property_ids' => 'sometimes|array',
            'property_ids.*' => 'integer|exists:properties,id',
        ]);

        // ... validation logic ...

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
            'can_manage_maintenance' => data_get($validated, 'permissions.can_manage_maintenance', false),
            'can_manage_payments' => data_get($validated, 'permissions.can_manage_payments', false),
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
        $this->assertNotCaretaker($context);

        $assignment = CaretakerAssignment::where('landlord_id', $context['landlord_id'])
            ->with('caretaker')
            ->findOrFail($assignmentId);

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'middle_name' => 'sometimes|nullable|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $assignment->caretaker_id,
            'phone' => 'sometimes|nullable|string|max:20',
            'date_of_birth' => 'sometimes|nullable|date',
            'password' => 'sometimes|nullable|string|min:6|confirmed',
            'permissions' => 'sometimes|array',
            'permissions.can_view_bookings' => 'sometimes|boolean',
            'permissions.can_view_messages' => 'sometimes|boolean',
            'permissions.can_view_tenants' => 'sometimes|boolean',
            'permissions.can_view_rooms' => 'sometimes|boolean',
            'permissions.can_view_properties' => 'sometimes|boolean',
            'permissions.can_manage_maintenance' => 'sometimes|boolean',
            'permissions.can_manage_payments' => 'sometimes|boolean',
            'property_ids' => 'sometimes|array|min:1',
            'property_ids.*' => 'integer|exists:properties,id',
        ]);

        // ... caretaker details update ...

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
                'can_manage_maintenance' => array_key_exists('can_manage_maintenance', $payload)
                    ? (bool) $payload['can_manage_maintenance']
                    : $assignment->can_manage_maintenance,
                'can_manage_payments' => array_key_exists('can_manage_payments', $payload)
                    ? (bool) $payload['can_manage_payments']
                    : $assignment->can_manage_payments,
            ];

            $assignment->update($updates);
        }

        // ... property assignments update ...

        $assignment->refresh();
        $assignment->load('properties:id,title');

        return response()->json([
            'message' => 'Caretaker updated successfully.',
            'caretaker' => [
                'assignment_id' => $assignment->id,
                'first_name' => $assignment->caretaker->first_name,
                'middle_name' => $assignment->caretaker->middle_name,
                'last_name' => $assignment->caretaker->last_name,
                'email' => $assignment->caretaker->email,
                'phone' => $assignment->caretaker->phone,
                'date_of_birth' => $assignment->caretaker->date_of_birth,
                'permissions' => [
                    'bookings' => $assignment->can_view_bookings,
                    'messages' => $assignment->can_view_messages,
                    'tenants' => $assignment->can_view_tenants,
                    'rooms' => $assignment->can_view_rooms,
                    'properties' => $assignment->can_view_properties,
                    'maintenance' => $assignment->can_manage_maintenance,
                    'payments' => $assignment->can_manage_payments,
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
        $this->assertNotCaretaker($context);

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
        $this->assertNotCaretaker($context);

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
