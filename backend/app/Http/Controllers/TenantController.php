<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\User;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use App\Services\BookingService;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class TenantController extends Controller
{
    use ResolvesLandlordAccess;

    protected $bookingService;

    public function __construct(BookingService $bookingService)
    {
        $this->bookingService = $bookingService;
    }

    /**
     * Get all tenants (with optional property filter)
     * Shows only tenants who have rooms in landlord's properties
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_tenants');

            $propertyId = $request->query('property_id');

            $landlordId = $context['landlord_id'];

            $confirmedStatuses = ['confirmed', 'completed', 'partial-completed'];

            // Get tenants who either:
            //   (a) have a room assigned via current_tenant_id (legacy), OR
            //   (b) have a confirmed/completed booking for a room in this landlord's properties
            $query = User::where('role', 'tenant')
                ->with([
                    'tenantProfile',
                    'room.property',
                    'bookings' => function ($q) use ($confirmedStatuses) {
                        $q->whereIn('status', $confirmedStatuses)
                          ->with('room.property')
                          ->orderBy('created_at', 'desc');
                    },
                ])
                ->where(function ($q) use ($landlordId, $confirmedStatuses) {
                    // (a) legacy: room.current_tenant_id points to this user
                    $q->whereHas('room', function ($q2) use ($landlordId) {
                        $q2->whereHas('property', function ($q3) use ($landlordId) {
                            $q3->where('landlord_id', $landlordId);
                        });
                    })
                    // (b) booking-based: tenant has a confirmed booking for a room in landlord's property
                    ->orWhereHas('bookings', function ($q2) use ($landlordId, $confirmedStatuses) {
                        $q2->whereIn('status', $confirmedStatuses)
                           ->whereHas('room', function ($q3) use ($landlordId) {
                               $q3->whereHas('property', function ($q4) use ($landlordId) {
                                   $q4->where('landlord_id', $landlordId);
                               });
                           });
                    });
                });

            // Filter by specific property if provided
            if ($propertyId) {
                $query->where(function ($q) use ($propertyId, $confirmedStatuses) {
                    // (a) legacy room assignment on this property
                    $q->whereHas('room', function ($q2) use ($propertyId) {
                        $q2->where('property_id', $propertyId);
                    })
                    // (b) confirmed booking for a room on this property
                    ->orWhereHas('bookings', function ($q2) use ($propertyId, $confirmedStatuses) {
                        $q2->whereIn('status', $confirmedStatuses)
                           ->where('property_id', $propertyId);
                    });
                });
            }

            $tenants = $query->get()->map(function ($tenant) use ($propertyId, $confirmedStatuses) {
                // Prefer legacy room assignment; fall back to the latest confirmed booking's room
                $legacyRoom = $tenant->room;

                // If filtering by property, pick booking room that matches the requested property
                $latestBooking = $propertyId
                    ? $tenant->bookings->where('property_id', $propertyId)->first()
                    : $tenant->bookings->first();

                $bookingRoom = $latestBooking?->room;

                // Use legacy room if it exists and (no filter or it matches the property),
                // otherwise fall back to the booking room
                $room = ($legacyRoom && (!$propertyId || (string) $legacyRoom->property_id === (string) $propertyId))
                    ? $legacyRoom
                    : $bookingRoom;

                return [
                    'id' => $tenant->id,
                    'first_name' => $tenant->first_name,
                    'middle_name' => $tenant->middle_name,
                    'last_name' => $tenant->last_name,
                    'full_name' => $tenant->first_name . ' ' . $tenant->last_name,
                    'email' => $tenant->email,
                    'phone' => $tenant->phone,
                    'profile_image' => $tenant->profile_image,
                    'is_active' => $tenant->is_active,

                    // Room — resolved from either legacy assignment or confirmed booking
                    'room' => $room ? [
                        'id' => $room->id,
                        'room_number' => $room->room_number,
                        'room_type' => $room->room_type,
                        'type_label' => $room->type,
                        'monthly_rate' => $latestBooking ? $latestBooking->monthly_rent : $room->monthly_rate,
                        'property_name' => $room->property->title ?? 'N/A',
                        'property_id' => $room->property_id,
                    ] : null,

                    // Tenant profile details
                    'tenantProfile' => $tenant->tenantProfile ? [
                        'move_in_date' => $tenant->tenantProfile->move_in_date,
                        'move_out_date' => $tenant->tenantProfile->move_out_date,
                        'status' => $tenant->tenantProfile->status,
                        'date_of_birth' => $tenant->tenantProfile->date_of_birth,
                        'emergency_contact_name' => $tenant->tenantProfile->emergency_contact_name,
                        'emergency_contact_phone' => $tenant->tenantProfile->emergency_contact_phone,
                        'emergency_contact_relationship' => $tenant->tenantProfile->emergency_contact_relationship,
                        'current_address' => $tenant->tenantProfile->current_address,
                        'preference' => $tenant->tenantProfile->preference,
                        'notes' => $tenant->tenantProfile->notes,
                    ] : null,

                    // Latest booking information for payment tracking
                    'latestBooking' => $latestBooking ? [
                        'id' => $latestBooking->id,
                        'status' => $latestBooking->status,
                        'payment_status' => $latestBooking->payment_status,
                        'created_at' => $latestBooking->created_at,
                        'updated_at' => $latestBooking->updated_at,
                        'start_date' => $latestBooking->start_date,
                        'end_date' => $latestBooking->end_date,
                        'total_amount' => $latestBooking->total_amount,
                    ] : null,
                ];
            });

            return response()->json($tenants);
        } catch (\Exception $e) {
            Log::error('Error in TenantController@index: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'property_id' => $request->query('property_id'),
                'user_id' => optional($request->user())->id
            ]);
            
            return response()->json([
                'error' => 'Failed to load tenants',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new tenant
     */
    public function store(Request $request): JsonResponse
    {
        $context = $this->resolveLandlordContext($request);
        $this->assertNotCaretaker($context);

        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
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
            'middle_name' => $validated['middle_name'] ?? '',
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
            'status' => 'inactive', // inactive until assigned to a room
        ]);

        return response()->json($user->load('tenantProfile'), 201);
    }

    /**
     * Update tenant information
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $context = $this->resolveLandlordContext($request);
        $this->assertNotCaretaker($context);

        $user = User::where('role', 'tenant')->findOrFail($id);

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'middle_name' => 'sometimes|string|max:255',
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

        $userFields = array_intersect_key($validated, array_flip(['first_name', 'middle_name', 'last_name', 'email', 'phone']));
        if (!empty($userFields)) {
            $user->update($userFields);
        }

        $profileFields = array_intersect_key($validated, array_flip([
            'date_of_birth',
            'emergency_contact_name',
            'emergency_contact_phone',
            'emergency_contact_relationship',
            'current_address',
            'preference'
        ]));

        if (!empty($profileFields)) {
            $user->tenantProfile()->updateOrCreate(
                ['user_id' => $user->id],
                $profileFields
            );
        }

        return response()->json($user->load(['tenantProfile', 'room']));
    }

    /**
     * Delete tenant
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $context = $this->resolveLandlordContext($request);
        $this->assertNotCaretaker($context);

        $user = User::where('role', 'tenant')->findOrFail($id);

        // Check if tenant is currently assigned to a room in landlord's property
        if ($user->room && $user->room->property->landlord_id === $context['landlord_id']) {
            return response()->json([
                'error' => 'Cannot delete tenant who is currently occupying a room. Please unassign them first.'
            ], 400);
        }

        $user->delete();
        return response()->json(null, 204);
    }

    /**
     * Assign tenant to a room
     */
    public function assignRoom(Request $request, string $id): JsonResponse
    {
        $context = $this->resolveLandlordContext($request);
        $this->assertNotCaretaker($context);

        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'move_in_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $tenant = User::where('role', 'tenant')->findOrFail($id);
        $room = Room::with('property')->findOrFail($validated['room_id']);

        // Verify room belongs to landlord
        if ($room->property->landlord_id !== $context['landlord_id']) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if (!$room->isAvailable() || $room->available_slots <= 0) {
            return response()->json([
                'error' => 'Room not available',
                'occupied_slots' => $room->occupied,
                'total_capacity' => $room->capacity,
                'available_slots' => $room->available_slots
            ], 400);
        }

        // Use BookingService to create a confirmed booking
        // This will automatically handle assignTenant, profile update, and invoice creation
        try {
            \Illuminate\Support\Facades\DB::beginTransaction();

            $moveInDate = $validated['move_in_date'] ?? now()->format('Y-m-d');
            $endDate = $validated['end_date'] ?? \Carbon\Carbon::parse($moveInDate)->addMonths(6)->format('Y-m-d');

            $booking = $this->bookingService->createBooking([
                'room_id' => $room->id,
                'start_date' => $moveInDate,
                'end_date' => $endDate,
                'notes' => $validated['notes'] ?? 'Manually assigned by landlord',
            ], $tenant->id);

            // Confirm the booking immediately
            $this->bookingService->updateStatus($booking, ['status' => 'confirmed']);

            \Illuminate\Support\Facades\DB::commit();

            return response()->json($tenant->load(['tenantProfile', 'room']));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            Log::error('Manual room assignment failed: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to assign room', 'message' => $e->getMessage()], 500);
        }
    }


    /**
     * Unassign tenant from room
     */
    public function unassignRoom(Request $request, string $id): JsonResponse
    {
        $context = $this->resolveLandlordContext($request);
        $this->assertNotCaretaker($context);

        $tenant = User::where('role', 'tenant')->with('room.property')->findOrFail($id);

        if (!$tenant->room) {
            return response()->json(['error' => 'Tenant is not assigned to any room'], 400);
        }

        if ($tenant->room->property->landlord_id !== $context['landlord_id']) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $room = $tenant->room;

        $room->update([
            'current_tenant_id' => null,
            'status' => 'available',
        ]);

        if ($tenant->tenantProfile) {
            $tenant->tenantProfile->update([
                'status' => 'inactive',
                'move_out_date' => now()->format('Y-m-d'),
            ]);
        }

        $room->property->updateAvailableRooms();

        return response()->json($tenant->load(['tenantProfile', 'room']));
    }

        protected function assertNotCaretaker(array $context): void
        {
            if ($context['is_caretaker']) {
                throw new AccessDeniedHttpException('Caretaker accounts are read-only for tenants.');
            }
        }
}
