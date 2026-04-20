<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Http\Requests\StoreRoomRequest;
use App\Http\Requests\UpdateRoomRequest;
use App\Http\Resources\RoomResource;
use App\Models\Property;
use App\Models\Room;
use App\Services\RoomService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class RoomController extends Controller
{
    use ResolvesLandlordAccess;

    protected RoomService $roomService;

    public function __construct(RoomService $roomService)
    {
        $this->roomService = $roomService;
    }

    public function index(Request $request, $propertyId = null)
    {
        try {
            $propertyId = $propertyId ?? $request->query('property_id');
            if (! $propertyId) {
                return response()->json(['message' => 'Property ID is required'], 400);
            }

            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_rooms');
            $this->checkPropertyAccess($context, (int) $propertyId);

            $roomsQuery = Room::where('property_id', $propertyId)
                ->withAggregates()
                ->with([
                    'tenants',
                    'amenities',
                    'images',
                    'bookings' => function ($query) {
                        $query->whereIn('status', ['reserved', 'confirmed', 'active', 'completed', 'partial-completed'])
                            ->where(function ($bookingQuery) {
                                $bookingQuery->whereNull('end_date')
                                    ->orWhereDate('end_date', '>=', now()->startOfDay());
                            })
                            ->with('occupants')
                            ->orderByDesc('start_date');
                    },
                ])
                ->orderBy('room_number');

            $rooms = $roomsQuery->get();
            if ($rooms->isNotEmpty()) {
                $rooms->loadMissing('activeEvictionLock');
            }

            return response()->json(RoomResource::collection($rooms)->resolve());
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Property not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch rooms', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(StoreRoomRequest $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->assertNotCaretaker($context);

            $property = Property::where('landlord_id', $context['landlord_id'])
                ->findOrFail($request->validated()['property_id']);

            $room = $this->roomService->createRoom($request->validated(), $property);

            return response()->json((new RoomResource($room->fresh(['tenants', 'amenities', 'images', 'bookings.occupants'])))->resolve());
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create room', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(UpdateRoomRequest $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->assertNotCaretaker($context);

            $room = Room::whereHas('property', fn ($q) => $q->where('landlord_id', $context['landlord_id']))->findOrFail($id);

            $updatedRoom = $this->roomService->updateRoom($room, $request->validated());

            return response()->json((new RoomResource($updatedRoom->load(['tenants', 'amenities', 'images', 'bookings.occupants'])))->resolve());
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Room not found or unauthorized'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update room', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->assertNotCaretaker($context);

            $room = Room::whereHas('property', fn ($q) => $q->where('landlord_id', $context['landlord_id']))->findOrFail($id);

            $this->roomService->deleteRoom($room);

            return response()->json(['message' => 'Room deleted successfully'], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Room not found or unauthorized'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete room', 'error' => $e->getMessage()], 500);
        }
    }

    public function updateStatus(Request $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_rooms');

            $room = Room::findOrFail($id);
            $this->checkPropertyAccess($context, $room->property_id);

            $validated = $request->validate(['status' => 'required|in:available,occupied,maintenance']);

            $updatedRoom = $this->roomService->updateStatus($room, $validated['status']);

            return response()->json((new RoomResource($updatedRoom->load(['tenants', 'bookings.occupants'])))->resolve());
        } catch (ValidationException $e) {
            return response()->json(['message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Room not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update room status', 'error' => $e->getMessage()], 500);
        }
    }

    public function getStats(Request $request, $propertyId)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_rooms');
            $this->checkPropertyAccess($context, (int) $propertyId);

            $property = Property::findOrFail($propertyId);

            return response()->json([
                'total' => Room::where('property_id', $propertyId)->count(),
                'total_limit' => $property->total_rooms,
                'occupied' => Room::where('property_id', $propertyId)->where('status', 'occupied')->count(),
                'available' => Room::where('property_id', $propertyId)
                    ->where('status', 'available')
                    ->get()
                    ->filter(function ($room) {
                        return $room->isAvailable();
                    })
                    ->count(),
                'maintenance' => Room::where('property_id', $propertyId)->where('status', 'maintenance')->count(),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Property not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch stats', 'error' => $e->getMessage()], 500);
        }
    }

    public function pricing(Request $request, $id)
    {
        try {
            $room = Room::findOrFail($id);
            $start = $request->query('start') ?? $request->query('start_date');
            $end = $request->query('end') ?? $request->query('end_date');
            $bedCount = (int) ($request->query('bed_count') ?? 1);
            $requestedContractMode = strtolower((string) ($request->query('contract_mode') ?? 'monthly'));
            $contractMode = in_array($requestedContractMode, ['daily', 'monthly'], true)
                ? $requestedContractMode
                : 'monthly';

            if (! $start || ! $end) {
                return response()->json(['message' => '`start` and `end` dates are required'], 400);
            }

            $result = $room->calculatePriceForPeriod($start, $end);

            // Adjust total based on pricing model
            if (($room->pricing_model ?? 'full_room') === 'per_bed') {
                $result['total'] = round($result['total'] * $bedCount, 2);
            }

            $result['days'] = Carbon::parse($start)->diffInDays(Carbon::parse($end));
            $result['base_total'] = round((float) $result['total'], 2);

            $promoOffer = $this->resolvePromoOffer($room, $result, $contractMode);
            $result['promo_offer'] = $promoOffer;
            $result['promo_eligible'] = $promoOffer !== null;
            if ($promoOffer) {
                $result['promo_total'] = round((float) $promoOffer['discounted_total'], 2);
            }

            return response()->json($result, 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Room not found'], 404);
        }
    }

    private function resolvePromoOffer(Room $room, array $priceResult, string $contractMode): ?array
    {
        if ($contractMode !== 'monthly') {
            return null;
        }

        $breakdown = $priceResult['breakdown'] ?? [];
        $months = (int) ($breakdown['months'] ?? 0);
        $remainingDays = (int) ($breakdown['remaining_days'] ?? 0);

        if ($months < 1 || $remainingDays !== 0) {
            return null;
        }

        return $room->calculateDurationDiscount((float) ($priceResult['total'] ?? 0), $months);
    }

    /**
     * Get payment options for a specific room (based on property settings)
     */
    public function getPaymentOptions(Request $request, $id)
    {
        try {
            $room = Room::with('property.landlord')->findOrFail($id);
            $property = $room->property;
            $landlord = $property->landlord;

            // Default methods
            $methods = ['cash'];

            // Check if property has specific accepted payments
            if (! empty($property->accepted_payments)) {
                $methods = $property->accepted_payments;
            }

            // PayMongo readiness check
            $isPaymongoReady = false;
            if ($landlord && $landlord->isPaymongoReady()) {
                $isPaymongoReady = true;
            }

            return response()->json([
                'methods' => $methods,
                'is_paymongo_ready' => $isPaymongoReady,
                'property_id' => $property->id,
                'landlord_id' => $landlord->id,
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Room not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch payment options', 'error' => $e->getMessage()], 500);
        }
    }

    public function assignTenant(Request $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->assertNotCaretaker($context);

            $room = Room::whereHas('property', fn ($q) => $q->where('landlord_id', $context['landlord_id']))->findOrFail($id);

            $validated = $request->validate([
                'tenant_id' => 'required|exists:users,id',
                'start_date' => 'nullable|date',
            ]);

            $updatedRoom = $this->roomService->assignTenant($room, $validated['tenant_id'], $validated['start_date'] ?? null);

            return response()->json((new RoomResource($updatedRoom->load(['tenants', 'bookings.occupants'])))->resolve());
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Room not found or unauthorized'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to assign tenant', 'error' => $e->getMessage()], 500);
        }
    }

    public function extendStay(Request $request, string $id): JsonResponse
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_rooms');

            $validated = $request->validate([
                'tenant_id' => 'required|exists:users,id',
                'type' => 'nullable|in:monthly,daily',
                'value' => 'nullable|integer|min:1',
                'days' => 'nullable|integer|min:1',
                'months' => 'nullable|integer|min:1',
            ]);

            // Map incoming days/months to type/value for the service
            $type = $validated['type'] ?? (isset($validated['days']) ? 'daily' : 'monthly');
            $value = $validated['value'] ?? ($validated['days'] ?? ($validated['months'] ?? 1));

            $room = Room::whereHas('property', fn ($q) => $q->where('landlord_id', $context['landlord_id']))
                ->findOrFail($id);
            $this->checkPropertyAccess($context, (int) $room->property_id);

            $result = $this->roomService->extendStay($room, $validated['tenant_id'], $type, $value);

            return response()->json([
                'success' => true,
                'message' => 'Stay extended successfully',
                'data' => $result,
            ]);
        } catch (AccessDeniedHttpException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 403);
        } catch (\Exception $e) {
            // For business logic errors thrown from the service, return 400
            // For actual server crashes, this might still catch them, but we prioritize the message
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'error' => $e->getMessage() // Keep error key for backward compatibility
            ], 400);
        }
    }

    public function removeTenant(Request $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->assertNotCaretaker($context);

            $room = Room::whereHas('property', fn ($q) => $q->where('landlord_id', $context['landlord_id']))->findOrFail($id);

            $tenantId = $request->input('tenant_id');

            $updatedRoom = $this->roomService->removeTenant($room, $tenantId);

            return response()->json((new RoomResource($updatedRoom->load(['tenants', 'bookings.occupants'])))->resolve());
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Room not found or unauthorized'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to remove tenant', 'error' => $e->getMessage()], 500);
        }
    }
}
