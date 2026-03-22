<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\Invoice;
use App\Models\Room;
use App\Models\User;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
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
            $search = trim((string) $request->query('search', ''));
            $landlordId = $context['landlord_id'];

            // If caretaker, ensure they only see tenants from assigned properties
            $allowedPropertyIds = null;
            if ($context['is_caretaker']) {
                $allowedPropertyIds = $context['assignment']->properties()->pluck('properties.id')->toArray();

                // If filtering by property, ensure caretaker is assigned to it
                if ($propertyId && ! in_array($propertyId, $allowedPropertyIds)) {
                    return response()->json([], 200);
                }
            }

            $confirmedStatuses = ['confirmed', 'completed', 'partial-completed'];

            $query = User::where('role', 'tenant')
                ->with([
                    'tenantProfile',
                    'roomAssignments.property',
                    'bookings' => function ($q) use ($landlordId) {
                        $q->where('landlord_id', $landlordId)
                            ->with('room.property')
                            ->orderBy('created_at', 'desc');
                    },
                ])
                ->where(function ($q) use ($landlordId, $allowedPropertyIds) {
                    $q->whereHas('roomAssignments', function ($q2) use ($landlordId, $allowedPropertyIds) {
                        $q2->whereHas('property', function ($q3) use ($landlordId, $allowedPropertyIds) {
                            $q3->where('landlord_id', $landlordId);
                            if ($allowedPropertyIds) {
                                $q3->whereIn('id', $allowedPropertyIds);
                            }
                        });
                    })
                        ->orWhereHas('bookings', function ($q2) use ($landlordId, $allowedPropertyIds) {
                            $q2->whereIn('status', ['confirmed', 'partial-completed'])
                                ->whereHas('room', function ($q3) use ($landlordId, $allowedPropertyIds) {
                                    $q3->whereHas('property', function ($q4) use ($landlordId, $allowedPropertyIds) {
                                        $q4->where('landlord_id', $landlordId);
                                        if ($allowedPropertyIds) {
                                            $q4->whereIn('id', $allowedPropertyIds);
                                        }
                                    });
                                });
                        });
                });

            // Filter by specific property if provided
            if ($propertyId) {
                $query->where(function ($q) use ($propertyId) {
                    $q->whereHas('roomAssignments', fn ($q2) => $q2->where('property_id', $propertyId))
                        ->orWhereHas('bookings', fn ($q2) => $q2->where('property_id', $propertyId)->whereIn('status', ['confirmed', 'partial-completed']));
                });
            }

            if ($search !== '') {
                $searchTerm = '%'.$search.'%';
                $query->where(function ($q) use ($searchTerm) {
                    $q->where('first_name', 'like', $searchTerm)
                        ->orWhere('last_name', 'like', $searchTerm)
                        ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", [$searchTerm])
                        ->orWhere('email', 'like', $searchTerm)
                        ->orWhereHas('room', fn ($roomQuery) => $roomQuery->where('room_number', 'like', $searchTerm))
                        ->orWhereHas('bookings.room', fn ($roomQuery) => $roomQuery->where('room_number', 'like', $searchTerm));
                });
            }

            $tenants = $query->get()->map(function ($tenant) use ($propertyId) {
                // ... map logic remains same ...
                $legacyRoom = $tenant->room;
                $latestBooking = $propertyId
                    ? $tenant->bookings->where('property_id', $propertyId)->first()
                    : $tenant->bookings->first();
                $bookingRoom = $latestBooking?->room;
                $room = ($legacyRoom && (! $propertyId || (string) $legacyRoom->property_id === (string) $propertyId))
                    ? $legacyRoom : $bookingRoom;

                $hasOverdue = Invoice::where('tenant_id', $tenant->id)->where('status', 'pending')->where('due_date', '<', now())->exists();

                return [
                    'id' => $tenant->id,
                    'first_name' => $tenant->first_name,
                    'last_name' => $tenant->last_name,
                    'full_name' => $tenant->first_name.' '.$tenant->last_name,
                    'email' => $tenant->email,
                    'phone' => $tenant->phone,
                    'is_active' => $tenant->is_active,
                    'room' => $room ? [
                        'id' => $room->id,
                        'room_number' => $room->room_number,
                        'property_name' => $room->property->title ?? 'N/A',
                        'property_id' => $room->property_id,
                    ] : null,
                    'tenantProfile' => $tenant->tenantProfile,
                    'latestBooking' => $latestBooking,
                ];
            });

            return response()->json($tenants);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to load tenants', 'message' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, string $id): JsonResponse
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_tenants');
            $landlordId = $context['landlord_id'];

            $tenant = User::where('role', 'tenant')->findOrFail($id);

            // Verify the tenant belongs to one of the landlord's properties
            // and if caretaker, check property isolation
            $tenantRoom = $tenant->room;
            $hasValidBooking = $tenant->bookings()->where('landlord_id', $landlordId)->exists();

            if (! $tenantRoom && ! $hasValidBooking) {
                throw new AccessDeniedHttpException('This tenant is not associated with your properties.');
            }

            if ($context['is_caretaker']) {
                $allowedPropertyIds = $context['assignment']->properties()->pluck('properties.id')->toArray();
                $tenantPropertyIds = $tenant->bookings()
                    ->where('landlord_id', $landlordId)
                    ->pluck('property_id')
                    ->unique()
                    ->toArray();

                if ($tenantRoom) {
                    $tenantPropertyIds[] = $tenantRoom->property_id;
                }

                if (empty(array_intersect($allowedPropertyIds, $tenantPropertyIds))) {
                    throw new AccessDeniedHttpException('You do not have permission to view this tenant.');
                }
            }

            // ... (rest of show logic can remain, but now securely gated) ...
            return $this->getTenantDetails($tenant, $landlordId);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to load tenant', 'message' => $e->getMessage()], 500);
        }
    }

    private function getTenantDetails($tenant, $landlordId)
    {
        $confirmedStatuses = ['confirmed', 'completed', 'partial-completed'];
        $latestBooking = $tenant->bookings->whereIn('status', $confirmedStatuses)->first();
        $room = $latestBooking?->room ?? $tenant->room;

        $bookings = \App\Models\Booking::where('tenant_id', $tenant->id)
            ->where('landlord_id', $landlordId)
            ->with(['room.property'])
            ->orderBy('created_at', 'desc')
            ->get();

        $maintenanceRequests = \App\Models\MaintenanceRequest::where('tenant_id', $tenant->id)
            ->where('landlord_id', $landlordId)
            ->with(['property', 'booking.room'])
            ->orderBy('created_at', 'desc')
            ->get();

        $addonRequests = \DB::table('booking_addons')
            ->join('bookings', 'booking_addons.booking_id', '=', 'bookings.id')
            ->join('addons', 'booking_addons.addon_id', '=', 'addons.id')
            ->where('bookings.tenant_id', $tenant->id)
            ->where('bookings.landlord_id', $landlordId)
            ->select([
                'booking_addons.*',
                'addons.name as addon_name',
                'addons.price as current_price',
                'addons.price_type',
                'bookings.booking_reference',
            ])
            ->get()
            ->map(function ($addon) {
                $price = (float) $addon->price_at_booking;
                if ($price <= 0 && $addon->current_price > 0) {
                    $price = (float) $addon->current_price;
                }

                return [
                    'id' => $addon->id,
                    'booking_id' => $addon->booking_id,
                    'addon_id' => $addon->addon_id,
                    'quantity' => $addon->quantity,
                    'price' => $price,
                    'price_at_booking' => (float) $addon->price_at_booking,
                    'status' => $addon->status,
                    'addon_name' => $addon->addon_name,
                    'price_type' => $addon->price_type,
                    'booking_reference' => $addon->booking_reference,
                    'created_at' => $addon->created_at,
                ];
            });

        $transferRequests = \App\Models\TransferRequest::where('tenant_id', $tenant->id)
            ->where('landlord_id', $landlordId)
            ->with(['currentRoom', 'requestedRoom.property'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'id' => $tenant->id,
            'first_name' => $tenant->first_name,
            'last_name' => $tenant->last_name,
            'full_name' => $tenant->first_name.' '.$tenant->last_name,
            'email' => $tenant->email,
            'phone' => $tenant->phone,
            'gender' => $tenant->gender,
            'date_of_birth' => $tenant->date_of_birth,
            'room' => $room ? ['room_number' => $room->room_number, 'property_name' => $room->property->title] : null,
            'tenantProfile' => $tenant->tenantProfile,
            'history' => [
                'bookings' => $bookings,
                'maintenance' => $maintenanceRequests,
                'addons' => $addonRequests,
                'transfers' => $transferRequests,
            ],
        ]);
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
            'gender' => ['nullable', Rule::in(['male', 'female', 'other', 'prefer_not_to_say'])],
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
            'date_of_birth' => $validated['date_of_birth'] ?? null,
            'gender' => $validated['gender'] ?? null,
        ]);

        $user->tenantProfile()->create([
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
            'gender' => ['nullable', Rule::in(['male', 'female', 'other', 'prefer_not_to_say'])],
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'emergency_contact_relationship' => 'nullable|string|max:100',
            'current_address' => 'nullable|string',
            'preference' => 'nullable|string',
        ]);

        $userFields = array_intersect_key($validated, array_flip(['first_name', 'middle_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender']));
        if (! empty($userFields)) {
            $user->update($userFields);
        }

        $profileFields = array_intersect_key($validated, array_flip([
            'emergency_contact_name',
            'emergency_contact_phone',
            'emergency_contact_relationship',
            'current_address',
            'preference',
        ]));

        if (! empty($profileFields)) {
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
                'error' => 'Cannot delete tenant who is currently occupying a room. Please unassign them first.',
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

        if (! $room->isAvailable() || $room->available_slots <= 0) {
            return response()->json([
                'error' => 'Room not available',
                'occupied_slots' => $room->occupied,
                'total_capacity' => $room->capacity,
                'available_slots' => $room->available_slots,
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
            Log::error('Manual room assignment failed: '.$e->getMessage());

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

        if (! $tenant->room) {
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

    /**
     * Transfer tenant to a new room
     */
    public function transferRoom(Request $request, string $id): JsonResponse
    {
        $context = $this->resolveLandlordContext($request);
        $this->assertNotCaretaker($context);

        $validated = $request->validate([
            'new_room_id' => 'required|exists:rooms,id',
            'reason' => 'required|string',
            'damage_charge' => 'nullable|numeric|min:0',
            'damage_description' => 'nullable|string|required_if:damage_charge,>0',
        ]);

        $tenant = User::where('role', 'tenant')->with(['roomAssignments', 'tenantProfile'])->findOrFail($id);
        $oldRoom = $tenant->roomAssignments()->first();
        $newRoom = Room::with('property')->findOrFail($validated['new_room_id']);

        // Verify new room belongs to the same landlord
        if ($newRoom->property->landlord_id !== $context['landlord_id']) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Verify new room availability
        if (! $newRoom->isAvailable() || $newRoom->available_slots <= 0) {
            return response()->json(['error' => 'New room is not available'], 400);
        }

        try {
            \Illuminate\Support\Facades\DB::beginTransaction();

            // 1. Handle damage charges if provided
            if (! empty($validated['damage_charge']) && $validated['damage_charge'] > 0) {
                $reference = 'DMG-'.date('Ymd').'-'.strtoupper(\Illuminate\Support\Str::random(6));
                Invoice::create([
                    'reference' => $reference,
                    'landlord_id' => $context['landlord_id'],
                    'property_id' => $oldRoom->property_id,
                    'tenant_id' => $tenant->id,
                    'description' => 'Damage charge during transfer from '.($oldRoom ? $oldRoom->room_number : 'previous room').': '.$validated['damage_description'],
                    'amount_cents' => (int) round($validated['damage_charge'] * 100),
                    'currency' => 'PHP',
                    'status' => 'pending',
                    'issued_at' => now(),
                    'due_date' => now(),
                ]);
            }

            // 2. End current booking/assignment
            if ($oldRoom) {
                // Find latest active booking
                $activeBooking = \App\Models\Booking::where('tenant_id', $tenant->id)
                    ->where('room_id', $oldRoom->id)
                    ->whereIn('status', ['confirmed', 'active'])
                    ->first();

                if ($activeBooking) {
                    $this->bookingService->updateStatus($activeBooking, ['status' => 'completed']);
                }

                $oldRoom->removeTenant($tenant->id);
            }

            // 3. Start new booking for the new room
            $moveInDate = now()->format('Y-m-d');
            $endDate = \Carbon\Carbon::parse($moveInDate)->addMonths(6)->format('Y-m-d');

            $newBooking = $this->bookingService->createBooking([
                'room_id' => $newRoom->id,
                'start_date' => $moveInDate,
                'end_date' => $endDate,
                'notes' => 'Transferred from '.($oldRoom ? $oldRoom->room_number : 'previous room').'. Reason: '.$validated['reason'],
            ], $tenant->id);

            // Confirm the booking immediately
            $this->bookingService->updateStatus($newBooking, ['status' => 'confirmed']);

            // 4. Update tenant profile notes
            if ($tenant->tenantProfile) {
                $currentNotes = $tenant->tenantProfile->notes ?? '';
                $transferLog = "\n[".now()->toDateString().'] Room Transfer: '.($oldRoom ? $oldRoom->room_number : 'N/A').' -> '.$newRoom->room_number.'. Reason: '.$validated['reason'];
                $tenant->tenantProfile->update([
                    'notes' => $currentNotes.$transferLog,
                ]);
            }

            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                'message' => 'Room transfer successful',
                'tenant' => $tenant->load(['tenantProfile', 'roomAssignments.property']),
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            Log::error('Room transfer failed: '.$e->getMessage());

            return response()->json(['error' => 'Failed to transfer room', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Broadcast a message to multiple tenants
     */
    public function broadcast(Request $request): JsonResponse
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_messages');
            $landlordId = $context['landlord_id'];

            $validated = $request->validate([
                'message' => 'required|string|max:2000',
                'recipients' => 'required|array',
                'recipients.*' => 'exists:users,id',
            ]);

            $senderId = $landlordId;
            $actualSenderId = Auth::id();
            $senderRole = Auth::user()->role;
            $messageText = $validated['message'];
            $recipientIds = $validated['recipients'];

            $sentCount = 0;

            foreach ($recipientIds as $recipientId) {
                // Find or create conversation
                $conversation = \App\Models\Conversation::where(function ($q) use ($senderId, $recipientId) {
                    $q->where('user_one_id', $senderId)->where('user_two_id', $recipientId);
                })
                    ->orWhere(function ($q) use ($senderId, $recipientId) {
                        $q->where('user_one_id', $recipientId)->where('user_two_id', $senderId);
                    })
                    ->first();

                if (! $conversation) {
                    $conversation = \App\Models\Conversation::create([
                        'user_one_id' => $senderId,
                        'user_two_id' => $recipientId,
                    ]);
                }

                // Create message
                $message = \App\Models\Message::create([
                    'conversation_id' => $conversation->id,
                    'sender_id' => $senderId,
                    'actual_sender_id' => $actualSenderId,
                    'sender_role' => $senderRole,
                    'receiver_id' => $recipientId,
                    'message' => $messageText,
                    'is_read' => false,
                ]);

                $conversation->update(['last_message_at' => now()]);

                // Broadcast the message event
                try {
                    broadcast(new \App\Events\MessageSent($message))->toOthers();
                } catch (\Exception $e) {
                    // Ignore broadcast errors in loop
                }

                $sentCount++;
            }

            return response()->json([
                'message' => "Broadcast sent successfully to $sentCount tenants.",
                'sent_count' => $sentCount,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to send broadcast', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Evict a tenant
     */
    public function evict(Request $request, string $id): JsonResponse
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->assertNotCaretaker($context);
            $landlordId = $context['landlord_id'];

            $validated = $request->validate([
                'reason' => 'required|string|max:1000',
            ]);

            $tenant = User::where('role', 'tenant')->with(['room', 'tenantProfile'])->findOrFail($id);

            // Verify the tenant belongs to this landlord
            $hasValidBooking = $tenant->bookings()->where('landlord_id', $landlordId)->exists();
            if (! $tenant->room && ! $hasValidBooking) {
                throw new AccessDeniedHttpException('This tenant is not associated with your properties.');
            }

            \Illuminate\Support\Facades\DB::beginTransaction();

            // 1. End current booking
            $activeBooking = \App\Models\Booking::where('tenant_id', $tenant->id)
                ->where('landlord_id', $landlordId)
                ->whereIn('status', ['confirmed', 'active'])
                ->first();

            if ($activeBooking) {
                $this->bookingService->updateStatus($activeBooking, ['status' => 'cancelled']);
            }

            // 2. Unassign from room if assigned
            if ($tenant->room) {
                if ($tenant->room->property->landlord_id !== $landlordId) {
                    throw new AccessDeniedHttpException('Unauthorized room unassignment.');
                }
                $tenant->room->removeTenant($tenant->id);
            }

            // 3. Update tenant profile
            if ($tenant->tenantProfile) {
                $currentNotes = $tenant->tenantProfile->notes ?? '';
                $evictionLog = "\n[".now()->toDateString().'] EVICTED. Reason: '.$validated['reason'];
                $tenant->tenantProfile->update([
                    'status' => 'evicted',
                    'move_out_date' => now()->format('Y-m-d'),
                    'notes' => $currentNotes.$evictionLog,
                ]);
            }

            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                'message' => 'Tenant evicted successfully.',
                'tenant' => $tenant->load(['tenantProfile', 'room']),
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();

            return response()->json(['error' => 'Failed to evict tenant', 'message' => $e->getMessage()], 500);
        }
    }

    protected function assertNotCaretaker(array $context): void
    {
        if ($context['is_caretaker']) {
            throw new AccessDeniedHttpException('Caretaker accounts are read-only for tenants.');
        }
    }
}
