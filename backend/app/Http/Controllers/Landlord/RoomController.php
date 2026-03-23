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
use Illuminate\Http\Request;

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

            $rooms = Room::where('property_id', $propertyId)
                ->with('tenants', 'amenities', 'images')
                ->orderBy('room_number')
                ->get();

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

            return response()->json((new RoomResource($room->fresh(['tenants', 'amenities', 'images'])))->resolve());
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

            return response()->json((new RoomResource($updatedRoom->load(['tenants', 'amenities', 'images'])))->resolve());
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

            return response()->json((new RoomResource($updatedRoom->load('tenants')))->resolve());
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
                'available' => Room::where('property_id', $propertyId)->where('status', 'available')->count(),
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

            if (! $start || ! $end) {
                return response()->json(['message' => '`start` and `end` dates are required'], 400);
            }

            $result = $room->calculatePriceForPeriod($start, $end);

            // Adjust total based on pricing model
            if (($room->pricing_model ?? 'full_room') === 'per_bed') {
                $result['total'] = round($result['total'] * $bedCount, 2);
            }

            $result['days'] = Carbon::parse($start)->diffInDays(Carbon::parse($end));

            return response()->json($result, 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Room not found'], 404);
        }
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
            if ($landlord && $landlord->paymongo_child_id && $landlord->paymongo_verification_status === 'verified') {
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

            return response()->json((new RoomResource($updatedRoom))->resolve());
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

            $result = $this->roomService->extendStay($room, $validated['tenant_id'], $type, $value);

            return response()->json([
                'message' => 'Stay extended successfully',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to extend stay', 'error' => $e->getMessage()], 500);
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

            return response()->json((new RoomResource($updatedRoom))->resolve());
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Room not found or unauthorized'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to remove tenant', 'error' => $e->getMessage()], 500);
        }
    }
}
