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

            // Start with a simpler query to avoid relationship issues
            // Get all tenants who are occupying rooms in landlord's properties (legacy system only for now)
            $query = User::where('role', 'tenant')
                ->with(['tenantProfile', 'room.property', 'bookings' => function($q) {
                    $q->where('status', 'confirmed')
                      ->orWhere('status', 'completed')
                      ->orWhere('status', 'partial-completed')
                      ->orderBy('created_at', 'desc');
                }])
                ->whereHas('room', function ($q) use ($landlordId) {
                    $q->whereHas('property', function ($q2) use ($landlordId) {
                        $q2->where('landlord_id', $landlordId);
                    });
                });

            // Filter by specific property if provided
            if ($propertyId) {
                $query->whereHas('room', function ($q) use ($propertyId) {
                    $q->where('property_id', $propertyId);
                });
            }

            $tenants = $query->get()->map(function ($tenant) {
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

                    // Room assignment (legacy system)
                    'room' => $tenant->room ? [
                        'id' => $tenant->room->id,
                        'room_number' => $tenant->room->room_number,
                        'room_type' => $tenant->room->room_type,
                        'monthly_rate' => $tenant->room->monthly_rate,
                        'property_name' => $tenant->room->property->title ?? 'N/A',
                        'property_id' => $tenant->room->property_id,
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
                    'latestBooking' => $tenant->bookings->first() ? [
                        'id' => $tenant->bookings->first()->id,
                        'status' => $tenant->bookings->first()->status,
                        'payment_status' => $tenant->bookings->first()->payment_status,
                        'created_at' => $tenant->bookings->first()->created_at,
                        'updated_at' => $tenant->bookings->first()->updated_at,
                        'start_date' => $tenant->bookings->first()->start_date,
                        'end_date' => $tenant->bookings->first()->end_date,
                        'total_amount' => $tenant->bookings->first()->total_amount,
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
