<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Room;
use App\Models\TenantClaimCode;
use App\Models\TenantCredit;
use App\Models\TenantEviction;
use App\Models\User;
use App\Services\BookingService;
use App\Services\RefundService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class TenantController extends Controller
{
    use ResolvesLandlordAccess;

    private const EVICTION_UNDO_WINDOW_HOURS = 24;

    private const CLAIM_CODE_TTL_HOURS = 24;

    protected $bookingService;

    protected $refundService;

    public function __construct(BookingService $bookingService, RefundService $refundService)
    {
        $this->bookingService = $bookingService;
        $this->refundService = $refundService;
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

            $confirmedStatuses = ['confirmed', 'completed', 'partial-completed', 'reserved', 'pending_reservation'];

            $query = User::where('role', 'tenant')
                ->with([
                    'tenantProfile',
                    'roomAssignments.property',
                    'bookings' => function ($q) use ($landlordId) {
                        $q->where('landlord_id', $landlordId)
                            ->with('room.property')
                            ->orderBy('created_at', 'desc');
                    },
                    'bookingOccupantRecords.booking' => function ($q) use ($landlordId) {
                        $q->where('landlord_id', $landlordId)
                            ->with('room.property');
                    },
                    'scheduledEviction' => function ($q) use ($landlordId) {
                        $q->where('landlord_id', $landlordId)
                            ->where('status', 'scheduled');
                    },
                    'latestEvictionRecord' => function ($q) use ($landlordId) {
                        $q->where('landlord_id', $landlordId);
                    },
                ])
                // OPTIMIZATION: Check for overdue invoices in a single subquery
                ->withExists(['invoices as has_overdue_invoices' => function($q) {
                    $q->where('status', 'pending')->where('due_date', '<', now());
                }])
                ->where(function ($q) use ($landlordId, $allowedPropertyIds, $confirmedStatuses) {
                    $q->whereHas('roomAssignments', function ($q2) use ($landlordId, $allowedPropertyIds) {
                        $q2->whereHas('property', function ($q3) use ($landlordId, $allowedPropertyIds) {
                            $q3->where('landlord_id', $landlordId);
                            if ($allowedPropertyIds) {
                                $q3->whereIn('id', $allowedPropertyIds);
                            }
                        });
                    })
                        ->orWhereHas('bookings', function ($q2) use ($landlordId, $allowedPropertyIds, $confirmedStatuses) {
                            $q2->whereIn('status', $confirmedStatuses)
                                ->whereHas('room', function ($q3) use ($landlordId, $allowedPropertyIds) {
                                    $q3->whereHas('property', function ($q4) use ($landlordId, $allowedPropertyIds) {
                                        $q4->where('landlord_id', $landlordId);
                                        if ($allowedPropertyIds) {
                                            $q4->whereIn('id', $allowedPropertyIds);
                                        }
                                    });
                                });
                        })
                        ->orWhereHas('bookingOccupantRecords.booking', function ($q2) use ($landlordId, $allowedPropertyIds, $confirmedStatuses) {
                            $q2->whereIn('status', $confirmedStatuses)
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
                $query->where(function ($q) use ($propertyId, $confirmedStatuses) {
                    $q->whereHas('roomAssignments', fn ($q2) => $q2->where('property_id', $propertyId))
                        ->orWhereHas('bookings', fn ($q2) => $q2->where('property_id', $propertyId)->whereIn('status', $confirmedStatuses))
                        ->orWhereHas('bookingOccupantRecords.booking', fn ($q2) => $q2->where('property_id', $propertyId)->whereIn('status', $confirmedStatuses));
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

            $perPage = $request->query('per_page', 50);
            $tenants = $query->paginate($perPage);

            $tenants->getCollection()->transform(function ($tenant) use ($propertyId) {
                // ... map logic remains same ...
                $legacyRoom = $tenant->room;

                $latestBooking = $propertyId
                    ? $tenant->bookings->where('property_id', $propertyId)->first()
                    : $tenant->bookings->first();

                if (! $latestBooking) {
                    $latestOccupantRecord = $propertyId
                        ? $tenant->bookingOccupantRecords->filter(fn ($rec) => $rec->booking && $rec->booking->property_id == $propertyId)->first()
                        : $tenant->bookingOccupantRecords->first();
                    $latestBooking = $latestOccupantRecord?->booking;
                }

                $bookingRoom = $latestBooking?->room;
                $room = ($legacyRoom && (! $propertyId || (string) $legacyRoom->property_id === (string) $propertyId))
                    ? $legacyRoom : $bookingRoom;
                $scheduledEviction = $tenant->scheduledEviction;
                $latestEviction = $tenant->latestEvictionRecord;

                return [
                    'id' => $tenant->id,
                    'first_name' => $tenant->first_name,
                    'last_name' => $tenant->last_name,
                    'full_name' => $tenant->first_name.' '.$tenant->last_name,
                    'email' => $tenant->email,
                    'phone' => $tenant->phone,
                    'is_active' => $tenant->is_active,
                    'has_overdue_invoices' => (bool) $tenant->has_overdue_invoices, // Value from subquery
                    'room' => $room ? [
                        'id' => $room->id,
                        'room_number' => $room->room_number,
                        'property_name' => $room->property->title ?? 'N/A',
                        'property_id' => $room->property_id,
                    ] : null,
                    'tenantProfile' => $tenant->tenantProfile,
                    'latestBooking' => $latestBooking,
                    'pending_eviction' => $this->serializeEviction($scheduledEviction),
                    'latest_eviction' => $this->serializeEviction($latestEviction),
                    'can_undo_eviction' => $this->canUndoEviction($latestEviction),
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
            $hasValidOccupantRecord = $tenant->bookingOccupantRecords()->whereHas('booking', function ($q) use ($landlordId) {
                $q->where('landlord_id', $landlordId);
            })->exists();

            if (! $tenantRoom && ! $hasValidBooking && ! $hasValidOccupantRecord) {
                throw new AccessDeniedHttpException('This tenant is not associated with your properties.');
            }

            if ($context['is_caretaker']) {
                $allowedPropertyIds = $context['assignment']->properties()->pluck('properties.id')->toArray();
                $tenantPropertyIds = $tenant->bookings()
                    ->where('landlord_id', $landlordId)
                    ->pluck('property_id')
                    ->unique()
                    ->toArray();

                $occupantPropertyIds = \App\Models\Booking::whereHas('occupants', function ($q) use ($tenant) {
                    $q->where('user_id', $tenant->id);
                })
                    ->where('landlord_id', $landlordId)
                    ->pluck('property_id')
                    ->unique()
                    ->toArray();

                $tenantPropertyIds = array_unique(array_merge($tenantPropertyIds, $occupantPropertyIds));

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
        $roomRelevantStatuses = ['active', 'confirmed', 'reserved', 'pending_reservation', 'completed', 'partial-completed'];
        $latestBooking = \App\Models\Booking::query()
            ->where('tenant_id', $tenant->id)
            ->where('landlord_id', $landlordId)
            ->whereIn('status', $roomRelevantStatuses)
            ->with(['room.property'])
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->first();

        // Prefer active tenant assignment room when present; otherwise use latest
        // relevant booking room to keep room number deterministic across reloads.
        $room = $tenant->room ?? $latestBooking?->room;

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

        $proxyOrigin = \App\Models\BookingOccupant::where('user_id', $tenant->id)
            ->whereHas('booking', function ($q) use ($landlordId) {
                $q->where('landlord_id', $landlordId);
            })
            ->with('booking.property')
            ->first();

        return response()->json([
            'id' => $tenant->id,
            'first_name' => $tenant->first_name,
            'last_name' => $tenant->last_name,
            'full_name' => $tenant->first_name.' '.$tenant->last_name,
            'email' => $tenant->email,
            'phone' => $tenant->phone,
            'sex' => $tenant->sex,
            'date_of_birth' => $tenant->date_of_birth,
            'room' => $room ? ['room_number' => $room->room_number, 'property_name' => $room->property->title] : null,
            'tenantProfile' => $tenant->tenantProfile,
            'proxy_origin' => $proxyOrigin ? [
                'booking_reference' => $proxyOrigin->booking->booking_reference,
                'property_name' => $proxyOrigin->booking->property->title,
            ] : null,
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
        $this->ensureCaretakerCanManageTenants($context);

        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => [
                'required',
                'email',
                Rule::unique('users')->whereNull('deleted_at'),
            ],
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8',
            'date_of_birth' => 'nullable|date',
            'sex' => ['nullable', Rule::in(['male', 'female'])],
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'emergency_contact_relationship' => 'nullable|string|max:100',
            'current_address' => 'nullable|string',
            'preference' => 'nullable|string',
            'room_id' => 'nullable|exists:rooms,id',
            'move_in_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if (array_key_exists('sex', $validated)) {
            $validated['sex'] = $this->normalizeGenderForStorage($validated['sex']);
        }

        $room = null;
        if (! empty($validated['room_id'])) {
            $room = Room::with('property')->findOrFail($validated['room_id']);

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

            if ($context['is_caretaker']) {
                $this->checkPropertyAccess($context, (int) $room->property_id);
            }
        }

        if ($context['is_caretaker'] && ! $room) {
            return response()->json([
                'error' => 'Caretakers must assign a room when creating a tenant.',
            ], 422);
        }

        try {
            DB::beginTransaction();

            $user = User::create([
                'first_name' => $validated['first_name'],
                'middle_name' => $validated['middle_name'] ?? '',
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'password' => bcrypt($validated['password']),
                'role' => 'tenant',
                'date_of_birth' => $validated['date_of_birth'] ?? null,
                'sex' => $validated['sex'] ?? null,
            ]);

            $user->tenantProfile()->create([
                'emergency_contact_name' => $validated['emergency_contact_name'] ?? null,
                'emergency_contact_phone' => $validated['emergency_contact_phone'] ?? null,
                'emergency_contact_relationship' => $validated['emergency_contact_relationship'] ?? null,
                'current_address' => $validated['current_address'] ?? null,
                'preference' => $validated['preference'] ?? null,
                'status' => 'inactive', // inactive until assigned to a room
            ]);

            if ($room) {
                $moveInDate = $validated['move_in_date'] ?? now()->format('Y-m-d');
                $endDate = $validated['end_date'] ?? Carbon::parse($moveInDate)->addMonths(6)->format('Y-m-d');

                $booking = $this->bookingService->createBooking([
                    'room_id' => $room->id,
                    'start_date' => $moveInDate,
                    'end_date' => $endDate,
                    'notes' => $validated['notes'] ?? 'Manually assigned by landlord during tenant creation',
                ], $user->id);

                $this->bookingService->updateStatus($booking, ['status' => 'confirmed']);
            }

            DB::commit();

            return response()->json($user->fresh()->load(['tenantProfile', 'room']), 201);
        } catch (\DomainException $e) {
            DB::rollBack();

            return response()->json([
                'error' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create tenant: '.$e->getMessage());

            return response()->json([
                'error' => 'Failed to create tenant',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update tenant information
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCanManageTenants($context);

        $user = $this->resolveTenantForLandlord((int) $id, (int) $context['landlord_id'], $context);

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'middle_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'phone' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'sex' => ['nullable', Rule::in(['male', 'female'])],
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'emergency_contact_relationship' => 'nullable|string|max:100',
            'current_address' => 'nullable|string',
            'preference' => 'nullable|string',
        ]);

        if (array_key_exists('sex', $validated)) {
            $validated['sex'] = $this->normalizeGenderForStorage($validated['sex']);
        }

        $userFields = array_intersect_key($validated, array_flip(['first_name', 'middle_name', 'last_name', 'email', 'phone', 'date_of_birth', 'sex']));
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
        $this->ensureCaretakerCanManageTenants($context);

        $user = $this->resolveTenantForLandlord((int) $id, (int) $context['landlord_id'], $context);

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
     * Generate a one-time claim code so a tenant can claim this existing account.
     */
    public function generateClaimCode(Request $request, string $id): JsonResponse
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCanManageTenants($context);

            $landlordId = (int) $context['landlord_id'];
            $tenant = $this->resolveTenantForLandlord((int) $id, $landlordId, $context);

            [$plainCode, $claim] = DB::transaction(function () use ($tenant, $landlordId) {
                TenantClaimCode::query()
                    ->where('tenant_id', $tenant->id)
                    ->whereNull('used_at')
                    ->whereNull('revoked_at')
                    ->update([
                        'revoked_at' => now(),
                    ]);

                $plainCode = (string) random_int(10000000, 99999999);

                $claim = TenantClaimCode::create([
                    'tenant_id' => $tenant->id,
                    'landlord_id' => $landlordId,
                    'code_hash' => hash_hmac('sha256', $plainCode, (string) config('app.key')),
                    'max_attempts' => 5,
                    'attempts' => 0,
                    'expires_at' => now()->addHours(self::CLAIM_CODE_TTL_HOURS),
                ]);

                return [$plainCode, $claim];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'claim_code' => $plainCode,
                    'expires_at' => optional($claim->expires_at)->toISOString(),
                    'tenant' => [
                        'id' => $tenant->id,
                        'first_name' => $tenant->first_name,
                        'last_name' => $tenant->last_name,
                    ],
                    'guardrail_hint' => 'Tenant claim flow: Step 1 claim code, Step 2 date of birth with email/password, Step 3 OTP verification.',
                ],
                'message' => 'Claim code generated successfully.',
            ]);
        } catch (AccessDeniedHttpException $e) {
            return response()->json([
                'success' => false,
                'errors' => [],
                'message' => $e->getMessage(),
            ], 403);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'errors' => [],
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Assign tenant to a room
     */
    public function assignRoom(Request $request, string $id): JsonResponse
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCanManageTenants($context);

            $validated = $request->validate([
                'room_id' => 'required|exists:rooms,id',
                'move_in_date' => 'nullable|date',
                'end_date' => 'nullable|date',
                'notes' => 'nullable|string',
            ]);

            $tenant = $this->resolveTenantForLandlord((int) $id, (int) $context['landlord_id'], $context);
            $room = Room::with('property')->findOrFail($validated['room_id']);

            if ($this->hasScheduledEviction((int) $tenant->id, (int) $context['landlord_id'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'This tenant has a pending eviction schedule. Cancel it before assigning a room.',
                ], 422);
            }

            // Verify room belongs to landlord
            if ($room->property->landlord_id !== $context['landlord_id']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to this room.',
                ], 403);
            }

            if ($context['is_caretaker']) {
                $this->checkPropertyAccess($context, (int) $room->property_id);
            }

            if (! $room->isAvailable() || $room->available_slots <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Room is fully occupied or not available.',
                    'errors' => [
                        'occupied_slots' => $room->occupied,
                        'total_capacity' => $room->capacity,
                    ],
                ], 400);
            }

            // Use BookingService to create a confirmed booking
            DB::beginTransaction();

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

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $tenant->load(['tenantProfile', 'room']),
                'message' => 'Tenant assigned to room successfully.',
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'errors' => $e->errors(),
                'message' => 'Validation failed.',
            ], 422);
        } catch (\DomainException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            if (isset($e) && DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            Log::error('Manual room assignment failed: '.$e->getMessage(), [
                'exception' => $e,
                'tenant_id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred during room assignment.',
                'error_detail' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Unassign tenant from room
     */
    public function unassignRoom(Request $request, string $id): JsonResponse
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCanManageTenants($context);

        $tenant = $this->resolveTenantForLandlord((int) $id, (int) $context['landlord_id'], $context);

        if ($this->hasScheduledEviction((int) $tenant->id, (int) $context['landlord_id'])) {
            return response()->json([
                'error' => 'This tenant has a pending eviction schedule. Cancel it before unassigning.',
            ], 422);
        }

        if (! $tenant->room) {
            return response()->json(['error' => 'Tenant is not assigned to any room'], 400);
        }

        if ($tenant->room->property->landlord_id !== $context['landlord_id']) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ($context['is_caretaker']) {
            $this->checkPropertyAccess($context, (int) $tenant->room->property_id);
        }

        $room = $tenant->room;

        try {
            \Illuminate\Support\Facades\DB::beginTransaction();

            // Fix #2: Cancel the active booking via BookingService so status, counters, and hooks are correct
            $activeBooking = \App\Models\Booking::where('tenant_id', $tenant->id)
                ->where('room_id', $room->id)
                ->whereIn('status', ['confirmed', 'active'])
                ->first();

            if ($activeBooking) {
                $this->bookingService->updateStatus($activeBooking, ['status' => 'cancelled']);
            }

            // Remove tenant from room (handles status + occupancy counter)
            $room->removeTenant($tenant->id);

            if ($tenant->tenantProfile) {
                $tenant->tenantProfile->update([
                    'status' => 'inactive',
                    'move_out_date' => now()->format('Y-m-d'),
                ]);
            }

            $room->property->updateAvailableRooms();

            \Illuminate\Support\Facades\DB::commit();

            return response()->json($tenant->load(['tenantProfile', 'room']));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            Log::error('Unassign room failed: '.$e->getMessage());

            return response()->json(['error' => 'Failed to unassign room', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Transfer tenant to a new room
     */
    public function transferRoom(Request $request, string $id): JsonResponse
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCanManageTenants($context);

        $validated = $request->validate([
            'booking_id' => 'nullable|integer|exists:bookings,id',
            'new_room_id' => 'required|exists:rooms,id',
            'reason' => 'required|string',
            'transfer_reason' => 'nullable|string', // e.g. "Tenant Request", "Maintenance Issue"
            'damage_charge' => 'nullable|numeric|min:0',
            'damage_description' => 'nullable|string|required_if:damage_charge,>0',
            'transfer_fee' => 'nullable|numeric|min:0',
            'new_end_date' => 'nullable|date',
            'prorated_adjustment' => 'nullable|numeric',
            'bed_number' => 'nullable|integer',
            'bed_numbers' => 'nullable|string',
            'refund_preference' => 'nullable|in:wallet,cash',
        ]);

        $tenant = $this->resolveTenantForLandlord((int) $id, (int) $context['landlord_id'], $context)
            ->loadMissing(['roomAssignments', 'tenantProfile']);

        if ($this->hasScheduledEviction((int) $tenant->id, (int) $context['landlord_id'])) {
            return response()->json([
                'error' => 'This tenant has a pending eviction schedule. Cancel it before transferring rooms.',
            ], 422);
        }

        $activeBooking = null;
        if (! empty($validated['booking_id'])) {
            $activeBooking = \App\Models\Booking::find($validated['booking_id']);
            if ($activeBooking && (int) $activeBooking->landlord_id !== (int) $context['landlord_id']) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
            if ($activeBooking && (int) $activeBooking->tenant_id !== (int) $tenant->id) {
                return response()->json(['error' => 'Booking does not belong to this tenant'], 422);
            }
        }

        $oldRoom = null;
        if ($activeBooking) {
            $oldRoom = $activeBooking->room;
        } else {
            $oldRoom = $tenant->roomAssignments()->first();
        }

        $newRoom = Room::with('property')->findOrFail($validated['new_room_id']);

        // Verify new room belongs to the same landlord
        if ($newRoom->property->landlord_id !== $context['landlord_id']) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ($context['is_caretaker']) {
            $this->checkPropertyAccess($context, (int) $newRoom->property_id);
            if ($oldRoom) {
                $this->checkPropertyAccess($context, (int) $oldRoom->property_id);
            }
        }

        // Check if there are 2 or more pending bookings for the requested room
        $pendingBookingsCount = Booking::where('room_id', $newRoom->id)
            ->whereIn('status', ['pending', 'pending_reservation', 'reserved'])
            ->count();

        if ($pendingBookingsCount >= 2) {
            return response()->json(['error' => 'Room transfer is not available. This room has 2 or more pending bookings.'], 422);
        }

        // Verify new room availability
        if (! $newRoom->isAvailable() || $newRoom->available_slots <= 0) {
            return response()->json(['error' => 'New room is not available'], 400);
        }

        // Guard against stale occupancy counters: enforce capacity check using active assignments.
        if ((int) $newRoom->tenants()->count() >= (int) $newRoom->capacity) {
            return response()->json(['error' => 'Room is fully occupied by active tenants'], 422);
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

            // 1.1 Handle transfer fee invoice
            if (! empty($validated['transfer_fee']) && $validated['transfer_fee'] > 0) {
                $reference = 'TRF-'.date('Ymd').'-'.strtoupper(\Illuminate\Support\Str::random(6));
                Invoice::create([
                    'reference' => $reference,
                    'landlord_id' => $context['landlord_id'],
                    'property_id' => $newRoom->property_id,
                    'tenant_id' => $tenant->id,
                    'description' => 'Transfer fee from '.($oldRoom ? $oldRoom->room_number : 'previous room').' to '.$newRoom->room_number,
                    'amount_cents' => $validated['transfer_fee'],
                    'currency' => 'PHP',
                    'status' => 'pending',
                    'issued_at' => now(),
                    'due_date' => now(),
                ]);
            }

            // 2. End current booking/assignment
            $originalEndDate = null;
            if ($oldRoom) {
                // If not already identified, find latest active booking for the old room
                if (! $activeBooking) {
                    $activeBooking = \App\Models\Booking::where('tenant_id', $tenant->id)
                        ->where('room_id', $oldRoom->id)
                        ->whereIn('status', ['confirmed', 'active'])
                        ->first();
                }

                if ($activeBooking) {
                    $originalEndDate = $activeBooking->end_date;
                    $activeBooking->end_date = now()->format('Y-m-d');
                    $activeBooking->save();

                    // Defer pending/unpaid invoices for the old booking (e.g. transfer fees, damage charges, or rent)
                    // This allows proxy bookings to preserve their paper trail, and landlords can manually mark them as paid or cancelled later.
                    \App\Models\Invoice::where('booking_id', $activeBooking->id)
                        ->whereNotIn('status', ['paid', 'cancelled', 'void', 'partial'])
                        ->update([
                            'status' => 'deferred',
                            'description' => \Illuminate\Support\Facades\DB::raw("CONCAT(description, ' (Deferred due to room transfer)')"),
                        ]);

                    // End the physical stay first, then close the old booking lifecycle.
                    $oldRoom->removeTenant($tenant->id);

                    // Use the new transferred enum status when ending a booking due to transfer.
                    $this->bookingService->updateStatus($activeBooking, ['status' => 'transferred']);
                } else {
                    $oldRoom->removeTenant($tenant->id);
                }
            }

            // 3. Start new booking for the new room
            $isCurrentLease = empty($validated['new_end_date']) && $activeBooking;
            $moveInDate = $isCurrentLease
                ? $activeBooking->start_date
                : now()->format('Y-m-d');

            if (! empty($validated['new_end_date'])) {
                $endDate = \Carbon\Carbon::parse($validated['new_end_date'])->format('Y-m-d');
            } else {
                if ($originalEndDate) {
                    $parsedOriginalEnd = \Carbon\Carbon::parse($originalEndDate);
                    if ($parsedOriginalEnd->lte(\Carbon\Carbon::parse(now()->format('Y-m-d')))) {
                        // Keep fallback aligned with 30-day monthly billing blocks.
                        $endDate = \Carbon\Carbon::parse(now()->format('Y-m-d'))->addDays(30)->format('Y-m-d');
                    } else {
                        $endDate = $parsedOriginalEnd->format('Y-m-d');
                    }
                } else {
                    // Default transfer lease: exactly 1 billing month (30 days).
                    $endDate = \Carbon\Carbon::parse(now()->format('Y-m-d'))->addDays(30)->format('Y-m-d');
                }
            }

            $newBooking = $this->bookingService->createBooking([
                'room_id' => $newRoom->id,
                'start_date' => $moveInDate, // Preserves identical billing cycle if "Current Lease"
                'end_date' => $endDate,
                'allow_past_start' => true,
                'skip_reservation_invoice' => true,
                'bed_number' => $validated['bed_number'] ?? null,
                'bed_numbers' => $validated['bed_numbers'] ?? null,
                'notes' => 'Transferred from '.($oldRoom ? $oldRoom->room_number : 'previous room').'. Reason: '.$validated['reason'],
            ], $tenant->id);

            // Confirm the booking immediately. Skip double-billing if we already charge the prorated difference manually.
            $proratedAdjustment = round((float) ($validated['prorated_adjustment'] ?? 0), 2);
            $skipInitialRent = $proratedAdjustment !== 0.00 || ($creditCalculation['final_credit'] ?? 0) > 0;

            $this->bookingService->updateStatus($newBooking, [
                'status' => 'confirmed',
                'skip_initial_rent_invoice' => $skipInitialRent,
            ]);

            // 3.5. Calculate and Apply Prorated Credit
            $creditAmount = 0;
            if ($activeBooking) {
                $damageCharge = $validated['damage_charge'] ?? 0;
                $transferFee = $validated['transfer_fee'] ?? 0;
                $creditCalculation = $this->refundService->calculateProratedCredit($activeBooking, $damageCharge, $transferFee);
                $creditAmount = $creditCalculation['final_credit'];

                // Record refund in old booking
                if ($creditAmount > 0) {
                    $this->refundService->recordRefundInBooking($activeBooking, $creditAmount);
                }
            }

            // Apply credit to new booking's first invoice

            // ONLY if we are not using the frontend's calculated prorated_adjustment
            if ($creditAmount > 0 && !isset($validated['prorated_adjustment'])) {
                $initialInvoice = Invoice::where('booking_id', $newBooking->id)
                    ->where('status', 'pending')
                    ->orderBy('id', 'asc')
                    ->first();

                if ($initialInvoice) {
                    $this->refundService->applyCreditToInvoice($initialInvoice, $creditAmount, [
                        'transfer_from_booking_id' => $activeBooking->id,
                        'transfer_from_room' => $oldRoom ? $oldRoom->room_number : 'N/A',
                        'transfer_to_room' => $newRoom->room_number,
                        'credit_calculation' => $creditCalculation ?? [],
                    ], $validated['refund_preference'] ?? 'wallet');

                    $newBooking->payment_status = match ($initialInvoice->status) {
                        'paid' => 'paid',
                        'partial' => 'partial',
                        default => 'unpaid',
                    };
                    $newBooking->save();
                } else {
                    TenantCredit::create([
                        'tenant_id' => $tenant->id,
                        'property_id' => $newRoom->property_id,
                        'room_id' => $newRoom->id,
                        'amount_cents' => $creditAmount,
                        'type' => 'credit',
                        'description' => 'Transfer credit (no pending invoice to apply)',
                    ]);
                }
            }

            // Handle manual prorated adjustment if provided (for room rate differences)
            if (isset($validated['prorated_adjustment']) && round((float) $validated['prorated_adjustment'], 2) !== 0.00) {
                $adj = round((float) $validated['prorated_adjustment'], 2);
                if ($adj > 0) {
                    $reference = 'ADJ-'.date('Ymd').'-'.strtoupper(\Illuminate\Support\Str::random(6));
                    Invoice::create([
                        'reference' => $reference,
                        'landlord_id' => $context['landlord_id'],
                        'property_id' => $newRoom->property_id,
                        'booking_id' => $newBooking->id,
                        'tenant_id' => $tenant->id,
                        'description' => 'Room rate difference for transferring to '.$newRoom->room_number,
                        'amount_cents' => (int) round($adj * 100),
                        'currency' => 'PHP',
                        'status' => 'pending',
                        'issued_at' => now(),
                        'due_date' => now()->addDays(3),
                    ]);
                } else {
                    TenantCredit::create([
                        'tenant_id' => $tenant->id,
                        'property_id' => $newRoom->property_id,
                        'room_id' => $newRoom->id,
                        'amount_cents' => (int) round(abs($adj) * 100),
                        'type' => 'credit',
                        'description' => 'Room transfer rate adjustment credit',
                    ]);
                }
            }

            // 4. Update tenant profile notes
            if ($tenant->tenantProfile) {
                $currentNotes = $tenant->tenantProfile->notes ?? '';
                $tReason = $validated['transfer_reason'] ?? 'Tenant Request';
                $transferLog = "\n[".now()->toDateString().'] Room Transfer: '.($oldRoom ? $oldRoom->room_number : 'N/A').' -> '.$newRoom->room_number.'. Type: '.$tReason.'. Reason: '.$validated['reason'];
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

            $message = $e->getMessage();
            $statusCode = 500;

            // Surface domain/business errors as 4xx so UI does not show a generic server failure.
            if (str_contains($message, 'fully occupied')
                || str_contains($message, 'not available')
                || str_contains($message, 'at least one day after today')) {
                $statusCode = 422;
            }

            return response()->json(['error' => 'Failed to transfer room', 'message' => $message], $statusCode);
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
     * Schedule an eviction with a grace period.
     */
    public function scheduleEviction(Request $request, string $id): JsonResponse
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCanManageTenants($context);
            $landlordId = (int) $context['landlord_id'];

            $validated = $request->validate([
                'reason' => 'required|string|max:1000',
                'effective_at' => 'nullable|date|after:now',
                'grace_hours' => 'nullable|integer|min:0|max:168',
                'send_broadcast' => 'nullable|boolean',
                'notice_body' => 'nullable|string|max:5000',
            ]);

            $evictionReason = trim((string) $validated['reason']);
            if ($evictionReason === '') {
                return response()->json(['message' => 'Reason for eviction is required.'], 422);
            }

            $effectiveAt = isset($validated['effective_at'])
                ? Carbon::parse($validated['effective_at'])
                : now()->addHours((int) ($validated['grace_hours'] ?? 24));

            $sendBroadcast = (bool) ($validated['send_broadcast'] ?? false);
            $noticeBody = trim((string) ($validated['notice_body'] ?? ''));

            $tenant = $this->resolveTenantForLandlord((int) $id, $landlordId, $context);

            if ($this->hasScheduledEviction((int) $tenant->id, $landlordId)) {
                return response()->json([
                    'message' => 'This tenant already has a pending eviction schedule.',
                ], 422);
            }

            if (($tenant->tenantProfile?->status ?? null) === 'evicted') {
                return response()->json([
                    'message' => 'Tenant is already marked as evicted.',
                ], 422);
            }

            $activeBooking = Booking::where('tenant_id', $tenant->id)
                ->where('landlord_id', $landlordId)
                ->whereIn('status', ['confirmed', 'active'])
                ->latest('id')
                ->first();

            $roomId = $activeBooking?->room_id ?? $tenant->room?->id;
            if (! $roomId && ! $activeBooking) {
                return response()->json([
                    'message' => 'Tenant must have an active stay before scheduling eviction.',
                ], 422);
            }

            $room = null;
            if ($roomId) {
                $room = Room::with('property')->find($roomId);
                if ($room && (int) optional($room->property)->landlord_id !== $landlordId) {
                    throw new AccessDeniedHttpException('Unauthorized room access for eviction scheduling.');
                }

                if ($room && $context['is_caretaker']) {
                    $this->checkPropertyAccess($context, (int) $room->property_id);
                }
            }

            $eviction = DB::transaction(function () use ($tenant, $landlordId, $activeBooking, $roomId, $evictionReason, $effectiveAt) {
                $record = TenantEviction::create([
                    'landlord_id' => $landlordId,
                    'tenant_id' => $tenant->id,
                    'room_id' => $roomId,
                    'booking_id' => $activeBooking?->id,
                    'status' => 'scheduled',
                    'reason' => $evictionReason,
                    'scheduled_for' => $effectiveAt,
                ]);

                $this->appendTenantProfileNote(
                    $tenant,
                    'EVICTION SCHEDULED for '.$effectiveAt->format('Y-m-d H:i').'. Reason: '.$evictionReason
                );

                return $record;
            });

            // Optionally broadcast the notice to the tenant via internal messaging
            if ($sendBroadcast) {
                try {
                    $landlordUser = \App\Models\User::find($landlordId);
                    if (! $landlordUser) {
                        throw new \RuntimeException('Landlord user not found.');
                    }

                    // Build the message body: use customized notice_body if provided, else a default
                    $broadcastText = $noticeBody !== ''
                        ? $noticeBody
                        : $this->buildDefaultNoticeText($tenant, $room, $effectiveAt, $evictionReason);

                    // Find or create conversation between landlord and tenant
                    $conversation = \App\Models\Conversation::where(function ($q) use ($landlordId, $tenant) {
                        $q->where('user_one_id', $landlordId)->where('user_two_id', $tenant->id);
                    })->orWhere(function ($q) use ($landlordId, $tenant) {
                        $q->where('user_one_id', $tenant->id)->where('user_two_id', $landlordId);
                    })->first();

                    if (! $conversation) {
                        $conversation = \App\Models\Conversation::create([
                            'user_one_id' => $landlordId,
                            'user_two_id' => $tenant->id,
                        ]);
                    }

                    $message = \App\Models\Message::create([
                        'conversation_id' => $conversation->id,
                        'sender_id' => $landlordId,
                        'actual_sender_id' => Auth::id(),
                        'sender_role' => Auth::user()->role,
                        'receiver_id' => $tenant->id,
                        'message' => $broadcastText,
                        'is_read' => false,
                    ]);

                    $conversation->update(['last_message_at' => now()]);

                    try {
                        broadcast(new \App\Events\MessageSent($message))->toOthers();
                    } catch (\Exception) {
                        // Ignore broadcast socket errors; message is persisted
                    }
                } catch (\Exception $broadcastErr) {
                    Log::warning('Failed to broadcast eviction notice: '.$broadcastErr->getMessage());
                }
            }

            return response()->json([
                'message' => 'Eviction scheduled successfully.',
                'eviction' => $this->serializeEviction($eviction),
                'broadcast_sent' => $sendBroadcast,
            ], 201);
        } catch (AccessDeniedHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to schedule eviction', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Generate a customizable "Notice to Vacate" preview for a tenant.
     * GET /landlord/tenants/{id}/evictions/notice
     */
    public function generateNoticePreview(Request $request, string $id): JsonResponse
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCanManageTenants($context);
            $landlordId = (int) $context['landlord_id'];

            $tenant = $this->resolveTenantForLandlord((int) $id, $landlordId, $context)
                ->loadMissing(['room.property', 'tenantProfile']);

            $eviction = TenantEviction::forLandlord($landlordId)
                ->where('tenant_id', $tenant->id)
                ->scheduled()
                ->orderBy('scheduled_for')
                ->first();

            $activeBooking = Booking::where('tenant_id', $tenant->id)
                ->where('landlord_id', $landlordId)
                ->whereIn('status', ['confirmed', 'active'])
                ->latest('id')
                ->first();

            $room = $tenant->room
                ?? ($activeBooking?->room_id ? Room::with('property')->find($activeBooking->room_id) : null);

            $landlordUser = \App\Models\User::find($landlordId);
            $landlordName = $landlordUser
                ? trim($landlordUser->first_name.' '.$landlordUser->last_name)
                : 'Property Management';

            $tenantName = trim($tenant->first_name.' '.$tenant->last_name);
            $roomNumber = $room?->room_number ?? 'N/A';
            $propertyName = $room?->property?->title ?? 'the property';
            $propertyAddress = $room?->property
                ? trim(implode(', ', array_filter([
                    $room->property->street_address ?? null,
                    $room->property->barangay ?? null,
                    $room->property->city ?? null,
                    $room->property->province ?? null,
                ])))
                : 'N/A';

            $moveOutDate = $eviction
                ? Carbon::parse($eviction->scheduled_for)->format('F j, Y')
                : Carbon::now()->addDays(30)->format('F j, Y');

            $reason = $eviction?->reason ?? 'Violation of lease terms.';
            $today = Carbon::now()->format('F j, Y');

            $noticeBody = $this->buildDefaultNoticeText($tenant, $room, $eviction?->scheduled_for ?? Carbon::now()->addDays(30), $reason);

            return response()->json([
                'success' => true,
                'data' => [
                    'tenant_name' => $tenantName,
                    'room_number' => $roomNumber,
                    'property_name' => $propertyName,
                    'property_address' => $propertyAddress,
                    'landlord_name' => $landlordName,
                    'move_out_date' => $moveOutDate,
                    'reason' => $reason,
                    'issued_date' => $today,
                    'notice_body' => $noticeBody,
                    'has_active_schedule' => (bool) $eviction,
                ],
            ]);
        } catch (AccessDeniedHttpException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 403);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Build the default Notice to Vacate text body.
     */
    private function buildDefaultNoticeText(User $tenant, ?Room $room, $scheduledFor, string $reason): string
    {
        $tenantName = trim($tenant->first_name.' '.$tenant->last_name);
        $roomNumber = $room?->room_number ?? 'N/A';
        $propertyName = $room?->property?->title ?? 'the property';
        $propertyAddress = $room?->property
            ? trim(implode(', ', array_filter([
                $room->property->street_address ?? null,
                $room->property->barangay ?? null,
                $room->property->city ?? null,
                $room->property->province ?? null,
            ])))
            : 'N/A';
        $moveOutDate = Carbon::parse($scheduledFor)->format('F j, Y');
        $today = Carbon::now()->format('F j, Y');

        return <<<EOT
NOTICE TO VACATE
Date: {$today}

To: {$tenantName}
Room: {$roomNumber}
Property: {$propertyName}
Address: {$propertyAddress}

Dear {$tenantName},

This letter serves as formal written notice that you are required to vacate your current accommodation (Room {$roomNumber}) at {$propertyName} no later than:

    MOVE-OUT DATE: {$moveOutDate}

Reason for Notice:
{$reason}

Please ensure that:
  1. The room is left in a clean and tidy condition.
  2. All keys, access cards, and property items are returned.
  3. Any outstanding balances or dues are fully settled.
  4. A move-out inspection is scheduled prior to your departure.

Failure to vacate by the stated date may result in further legal action in accordance with applicable tenancy laws.

If you have any questions or concerns regarding this notice, please contact the property management immediately.

Sincerely,
Property Management
{$propertyName}
EOT;
    }

    /**
     * Cancel a pending eviction schedule.
     */
    public function cancelScheduledEviction(Request $request, string $id): JsonResponse
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCanManageTenants($context);
            $landlordId = (int) $context['landlord_id'];

            $validated = $request->validate([
                'note' => 'nullable|string|max:1000',
            ]);

            $tenant = $this->resolveTenantForLandlord((int) $id, $landlordId, $context)->loadMissing('tenantProfile');

            $eviction = TenantEviction::forLandlord($landlordId)
                ->where('tenant_id', $tenant->id)
                ->scheduled()
                ->orderBy('scheduled_for')
                ->first();

            if (! $eviction) {
                return response()->json([
                    'message' => 'No pending eviction schedule found for this tenant.',
                ], 404);
            }

            $cancelNote = trim((string) ($validated['note'] ?? ''));

            $updatedEviction = DB::transaction(function () use ($eviction, $tenant, $cancelNote, $context) {
                $eviction->update([
                    'status' => 'cancelled',
                    'cancelled_at' => now(),
                    'cancelled_by' => $context['user']->id,
                    'cancelled_reason' => $cancelNote !== '' ? $cancelNote : null,
                ]);

                $note = 'EVICTION SCHEDULE CANCELLED.';
                if ($cancelNote !== '') {
                    $note .= ' Note: '.$cancelNote;
                }
                $this->appendTenantProfileNote($tenant, $note);

                return $eviction->fresh();
            });

            return response()->json([
                'message' => 'Pending eviction schedule cancelled.',
                'eviction' => $this->serializeEviction($updatedEviction),
            ]);
        } catch (AccessDeniedHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to cancel eviction schedule', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Finalize a pending eviction once grace period ends.
     */
    public function finalizeScheduledEviction(Request $request, string $id): JsonResponse
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCanManageTenants($context);
            $landlordId = (int) $context['landlord_id'];

            $validated = $request->validate([
                'force' => 'nullable|boolean',
            ]);
            $force = (bool) ($validated['force'] ?? false);

            $tenant = $this->resolveTenantForLandlord((int) $id, $landlordId, $context)->loadMissing(['room.property', 'tenantProfile']);

            $eviction = TenantEviction::forLandlord($landlordId)
                ->where('tenant_id', $tenant->id)
                ->scheduled()
                ->orderBy('scheduled_for')
                ->first();

            if (! $eviction) {
                return response()->json([
                    'message' => 'No pending eviction schedule found for this tenant.',
                ], 404);
            }

            if (! $force && $eviction->scheduled_for && now()->lt($eviction->scheduled_for)) {
                return response()->json([
                    'message' => 'Eviction is still in grace period and cannot be finalized yet.',
                    'scheduled_for' => optional($eviction->scheduled_for)->toISOString(),
                ], 422);
            }

            $updatedEviction = DB::transaction(function () use ($tenant, $eviction, $landlordId, $context) {
                $outcome = $this->performFinalEviction($tenant, $landlordId, $eviction->reason, $context);

                $eviction->update([
                    'status' => 'finalized',
                    'finalized_at' => now(),
                    'finalized_by' => $context['user']->id,
                    'booking_id' => $outcome['booking_id'] ?? $eviction->booking_id,
                    'room_id' => $outcome['room_id'] ?? $eviction->room_id,
                ]);

                return $eviction->fresh();
            });

            return response()->json([
                'message' => 'Tenant eviction finalized successfully.',
                'eviction' => $this->serializeEviction($updatedEviction),
                'tenant' => $tenant->fresh()->load(['tenantProfile', 'room']),
            ]);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (AccessDeniedHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to finalize eviction', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Undo a recently finalized eviction.
     */
    public function undoEviction(Request $request, string $id): JsonResponse
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCanManageTenants($context);
            $landlordId = (int) $context['landlord_id'];

            $validated = $request->validate([
                'reason' => 'nullable|string|max:1000',
            ]);
            $undoReason = trim((string) ($validated['reason'] ?? ''));

            $tenant = $this->resolveTenantForLandlord((int) $id, $landlordId, $context)->loadMissing('tenantProfile');

            if ($this->hasScheduledEviction((int) $id, $landlordId)) {
                return response()->json([
                    'message' => 'Cancel the pending eviction schedule before undoing a finalized eviction.',
                ], 422);
            }

            $eviction = TenantEviction::forLandlord($landlordId)
                ->where('tenant_id', $tenant->id)
                ->finalized()
                ->orderByDesc('finalized_at')
                ->orderByDesc('id')
                ->first();

            if (! $eviction) {
                return response()->json([
                    'message' => 'No finalized eviction record found for this tenant.',
                ], 404);
            }

            if (! $this->canUndoEviction($eviction)) {
                return response()->json([
                    'message' => 'Undo window has expired for this eviction.',
                ], 422);
            }

            $hasActiveStay = Booking::where('tenant_id', $tenant->id)
                ->where('landlord_id', $landlordId)
                ->whereIn('status', ['pending', 'confirmed', 'active'])
                ->exists();

            if ($hasActiveStay) {
                return response()->json([
                    'message' => 'Tenant already has an active or pending stay. Undo is blocked.',
                ], 422);
            }

            $payload = DB::transaction(function () use ($tenant, $eviction, $landlordId, $undoReason, $context) {
                $room = Room::with('property')->lockForUpdate()->find($eviction->room_id);
                if (! $room) {
                    throw new \DomainException('Original room is no longer available for undo.');
                }

                if ((int) optional($room->property)->landlord_id !== $landlordId) {
                    throw new AccessDeniedHttpException('Unauthorized room access for undo eviction.');
                }

                if ($context['is_caretaker']) {
                    $this->checkPropertyAccess($context, (int) $room->property_id);
                }

                if (! $room->isAvailable() || $room->available_slots <= 0) {
                    throw new \DomainException('Room is no longer available; undo is blocked to avoid reassignment conflicts.');
                }

                $previousBooking = null;
                if ($eviction->booking_id) {
                    $previousBooking = Booking::where('id', $eviction->booking_id)
                        ->where('tenant_id', $tenant->id)
                        ->where('landlord_id', $landlordId)
                        ->first();
                }

                $restoredBooking = null;

                if ($previousBooking
                    && $previousBooking->status === 'cancelled'
                    && (int) $previousBooking->room_id === (int) $room->id) {
                    $today = Carbon::today();
                    $previousBooking->status = 'pending';
                    $previousBooking->cancelled_at = null;
                    $previousBooking->cancellation_reason = null;
                    $previousBooking->start_date = $today->toDateString();
                    if (! $previousBooking->end_date || Carbon::parse($previousBooking->end_date)->lte($today)) {
                        $previousBooking->end_date = $today->copy()->addMonth()->toDateString();
                    }
                    $previousBooking->save();

                    $this->bookingService->updateStatus($previousBooking, ['status' => 'confirmed']);
                    $restoredBooking = $previousBooking->fresh();
                } else {
                    $startDate = Carbon::today();
                    $endDate = $startDate->copy()->addMonth();
                    if ($previousBooking?->end_date && Carbon::parse($previousBooking->end_date)->gt($startDate)) {
                        $endDate = Carbon::parse($previousBooking->end_date);
                    }

                    $createPayload = [
                        'room_id' => $room->id,
                        'start_date' => $startDate->toDateString(),
                        'end_date' => $endDate->toDateString(),
                        'notes' => 'Restored after eviction undo',
                    ];

                    if ((int) ($previousBooking?->bed_count ?? 0) > 0) {
                        $createPayload['bed_count'] = (int) $previousBooking->bed_count;
                    }

                    $restoredBooking = $this->bookingService->createBooking($createPayload, $tenant->id);
                    $this->bookingService->updateStatus($restoredBooking, ['status' => 'confirmed']);
                    $restoredBooking = $restoredBooking->fresh();
                }

                $tenant->tenantProfile()->updateOrCreate(
                    ['user_id' => $tenant->id],
                    [
                        'status' => 'active',
                        'move_out_date' => null,
                        'booking_id' => $restoredBooking->id,
                    ]
                );
                $tenant->load('tenantProfile');

                $eviction->update([
                    'status' => 'reverted',
                    'reverted_at' => now(),
                    'reverted_by' => $context['user']->id,
                    'reverted_reason' => $undoReason !== '' ? $undoReason : null,
                ]);

                $note = 'EVICTION UNDONE. Tenant restored to room '.$room->room_number.'.';
                if ($undoReason !== '') {
                    $note .= ' Note: '.$undoReason;
                }
                $this->appendTenantProfileNote($tenant, $note);

                return [
                    'eviction' => $eviction->fresh(),
                    'booking' => $restoredBooking,
                ];
            });

            return response()->json([
                'message' => 'Eviction has been undone and tenancy was restored.',
                'eviction' => $this->serializeEviction($payload['eviction']),
                'booking_id' => $payload['booking']->id,
                'tenant' => $tenant->fresh()->load(['tenantProfile', 'room']),
            ]);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (AccessDeniedHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to undo eviction', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Legacy immediate eviction endpoint.
     */
    public function evict(Request $request, string $id): JsonResponse
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCanManageTenants($context);
            $landlordId = (int) $context['landlord_id'];

            $validated = $request->validate([
                'reason' => 'required|string|max:1000',
            ]);
            $evictionReason = trim((string) $validated['reason']);

            $tenant = $this->resolveTenantForLandlord((int) $id, $landlordId, $context);

            if ($this->hasScheduledEviction((int) $tenant->id, $landlordId)) {
                return response()->json([
                    'message' => 'Tenant already has a pending eviction schedule. Finalize or cancel that schedule instead.',
                ], 422);
            }

            $payload = DB::transaction(function () use ($tenant, $landlordId, $evictionReason, $context) {
                $outcome = $this->performFinalEviction($tenant, $landlordId, $evictionReason, $context);

                $eviction = TenantEviction::create([
                    'landlord_id' => $landlordId,
                    'tenant_id' => $tenant->id,
                    'room_id' => $outcome['room_id'] ?? $tenant->room?->id,
                    'booking_id' => $outcome['booking_id'] ?? null,
                    'status' => 'finalized',
                    'reason' => $evictionReason,
                    'scheduled_for' => now(),
                    'finalized_at' => now(),
                    'finalized_by' => $context['user']->id,
                ]);

                return $eviction;
            });

            return response()->json([
                'message' => 'Tenant evicted successfully.',
                'eviction' => $this->serializeEviction($payload),
                'tenant' => $tenant->fresh()->load(['tenantProfile', 'room']),
            ]);
        } catch (AccessDeniedHttpException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to evict tenant', 'message' => $e->getMessage()], 500);
        }
    }

    private function resolveTenantForLandlord(int $tenantId, int $landlordId, ?array $context = null): User
    {
        $tenant = User::where('role', 'tenant')->with(['room.property', 'tenantProfile'])->findOrFail($tenantId);

        $hasValidBooking = $tenant->bookings()->where('landlord_id', $landlordId)->exists();
        if (! $tenant->room && ! $hasValidBooking) {
            throw new AccessDeniedHttpException('This tenant is not associated with your properties.');
        }

        if ($context) {
            $this->ensureTenantWithinCaretakerScope($context, $tenant, $landlordId);
        }

        return $tenant;
    }

    private function hasScheduledEviction(int $tenantId, int $landlordId): bool
    {
        return TenantEviction::where('tenant_id', $tenantId)
            ->where('landlord_id', $landlordId)
            ->where('status', 'scheduled')
            ->exists();
    }

    private function serializeEviction(?TenantEviction $eviction): ?array
    {
        if (! $eviction) {
            return null;
        }

        return [
            'id' => $eviction->id,
            'status' => $eviction->status,
            'reason' => $eviction->reason,
            'scheduled_for' => optional($eviction->scheduled_for)->toISOString(),
            'finalized_at' => optional($eviction->finalized_at)->toISOString(),
            'cancelled_at' => optional($eviction->cancelled_at)->toISOString(),
            'reverted_at' => optional($eviction->reverted_at)->toISOString(),
        ];
    }

    private function canUndoEviction(?TenantEviction $eviction): bool
    {
        if (! $eviction || $eviction->status !== 'finalized') {
            return false;
        }

        $reference = $eviction->finalized_at ?? $eviction->updated_at;
        if (! $reference) {
            return false;
        }

        return Carbon::parse($reference)->gte(now()->subHours(self::EVICTION_UNDO_WINDOW_HOURS));
    }

    private function appendTenantProfileNote(User $tenant, string $entry): void
    {
        $profile = $tenant->tenantProfile;

        if (! $profile) {
            $profile = $tenant->tenantProfile()->create([
                'status' => 'inactive',
            ]);
            $tenant->setRelation('tenantProfile', $profile);
        }

        $currentNotes = trim((string) ($profile->notes ?? ''));
        $noteLine = '['.now()->toDateString().'] '.$entry;

        $profile->update([
            'notes' => $currentNotes === '' ? $noteLine : $currentNotes."\n".$noteLine,
        ]);
    }

    private function performFinalEviction(User $tenant, int $landlordId, string $evictionReason, ?array $context = null): array
    {
        $activeBooking = Booking::where('tenant_id', $tenant->id)
            ->where('landlord_id', $landlordId)
            ->whereIn('status', ['confirmed', 'active'])
            ->latest('id')
            ->first();

        if ($activeBooking) {
            $this->bookingService->updateStatus($activeBooking, [
                'status' => 'cancelled',
                'cancellation_reason' => 'Evicted by landlord: '.$evictionReason,
            ]);
        }

        $roomId = $activeBooking?->room_id ?? $tenant->room?->id;
        $room = $roomId ? Room::with('property')->lockForUpdate()->find($roomId) : null;

        if ($room && (int) optional($room->property)->landlord_id !== $landlordId) {
            throw new AccessDeniedHttpException('Unauthorized room unassignment.');
        }

        if ($room && $context && $context['is_caretaker']) {
            $this->checkPropertyAccess($context, (int) $room->property_id);
        }

        if ($room && $room->tenants()->where('users.id', $tenant->id)->exists()) {
            $room->removeTenant($tenant->id);
        }

        $tenant->tenantProfile()->updateOrCreate(
            ['user_id' => $tenant->id],
            [
                'status' => 'evicted',
                'move_out_date' => now()->format('Y-m-d'),
            ]
        );
        $tenant->load('tenantProfile');

        $this->appendTenantProfileNote($tenant, 'EVICTION FINALIZED. Reason: '.$evictionReason);

        return [
            'booking_id' => $activeBooking?->id,
            'room_id' => $room?->id,
        ];
    }

    private function normalizeGenderForStorage(?string $sex): ?string
    {
        if ($sex === null) {
            return null;
        }

        $normalized = strtolower(trim($sex));

        return match ($normalized) {
            'male' => 'male',
            'female' => 'female',

            default => null,
        };
    }

    private function ensureCaretakerCanManageTenants(array $context): void
    {
        if (! $context['is_caretaker']) {
            return;
        }

        $this->ensureCaretakerCan($context, 'can_view_tenants');
    }

    private function ensureTenantWithinCaretakerScope(array $context, User $tenant, int $landlordId): void
    {
        if (! $context['is_caretaker']) {
            return;
        }

        $assignment = $context['assignment'];

        if (! $assignment) {
            throw new AccessDeniedHttpException('Caretaker assignment not found.');
        }

        $allowedPropertyIds = $assignment->properties()
            ->pluck('properties.id')
            ->map(fn ($value) => (int) $value)
            ->toArray();

        if ($allowedPropertyIds === []) {
            throw new AccessDeniedHttpException('Caretaker is not assigned to any property.');
        }

        $tenantPropertyIds = $tenant->bookings()
            ->where('landlord_id', $landlordId)
            ->pluck('property_id')
            ->filter()
            ->map(fn ($value) => (int) $value)
            ->unique()
            ->values()
            ->toArray();

        if ($tenant->room?->property_id) {
            $tenantPropertyIds[] = (int) $tenant->room->property_id;
        }

        $tenantPropertyIds = array_values(array_unique($tenantPropertyIds));

        if (empty(array_intersect($allowedPropertyIds, $tenantPropertyIds))) {
            throw new AccessDeniedHttpException('You do not have permission to manage this tenant.');
        }
    }
}
