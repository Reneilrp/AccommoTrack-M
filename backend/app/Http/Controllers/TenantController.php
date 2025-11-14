<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;

class TenantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $propertyId = $request->query('property_id');

        $tenants = User::where('role', 'tenant')
            ->when($propertyId, fn($q) => $q->whereHas('room', fn($q) => $q->where('property_id', $propertyId)))
            ->with(['tenantProfile', 'room'])
            ->get();

        return response()->json($tenants);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8',
            'date_of_birth' => 'nullable|date',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'emergency_contact_relationship' => 'nullable|string|max:100',
            'current_address' => 'nullable|string',
            'preference' => 'nullable|string',
        ]);

        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => bcrypt($validated['password']),
            'role' => 'tenant',
        ]);

        $user->tenantProfile()->create([
            'date_of_birth' => $validated['date_of_birth'] ?? null,
            'emergency_contact_name' => $validated['emergency_contact_name'] ?? null,
            'emergency_contact_phone' => $validated['emergency_contact_phone'] ?? null,
            'emergency_contact_relationship' => $validated['emergency_contact_relationship'] ?? null,
            'current_address' => $validated['current_address'] ?? null,
            'preference' => $validated['preference'] ?? null,
        ]);

        return response()->json($user->load('tenantProfile'), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = User::where('role', 'tenant')->findOrFail($id);

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'phone' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'emergency_contact_relationship' => 'nullable|string|max:100',
            'current_address' => 'nullable|string',
            'preference' => 'nullable|string',
        ]);

        $userFields = array_intersect_key($validated, array_flip(['first_name', 'last_name', 'email', 'phone']));
        if (!empty($userFields)) {
            $user->update($userFields);
        }

        $profileFields = array_intersect_key($validated, array_flip([
            'date_of_birth', 'emergency_contact_name', 'emergency_contact_phone',
            'emergency_contact_relationship', 'current_address', 'preference'
        ]));
        
        if (!empty($profileFields)) {
            $user->tenantProfile()->updateOrCreate(
                ['user_id' => $user->id],
                $profileFields
            );
        }

        return response()->json($user->load('tenantProfile'));
    }

    public function destroy(string $id): JsonResponse
    {
        $user = User::where('role', 'tenant')->findOrFail($id);
        $user->delete();

        return response()->json(null, 204);
    }

    // --------------------------------------------------------------
    // ASSIGN ROOM
    // --------------------------------------------------------------
    public function assignRoom(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
        ]);

        $tenant = User::where('role', 'tenant')->findOrFail($id);

        $room = Room::findOrFail($validated['room_id']);

        if ($room->status !== 'available') {
            return response()->json(['error' => 'Room not available'], 400);
        }

        $room->update([
            'tenant_id' => $tenant->id,
            'status'    => 'occupied',
        ]);

        return response()->json($tenant->load(['tenantProfile', 'room']));
    }
}