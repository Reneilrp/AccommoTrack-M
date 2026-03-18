<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoomResource;
use App\Models\Booking;
use App\Models\Room;
use App\Models\TransferRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TransferController extends Controller
{
    public function options(Request $request)
    {
        $tenant = Auth::user();
        $tenantId = $tenant?->id;

        if (! $tenantId) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'Unauthorized.',
            ], 401);
        }

        $validated = $request->validate([
            'booking_id' => 'required|integer|exists:bookings,id',
            'property_id' => 'required|integer|exists:properties,id',
        ]);

        $activeBooking = Booking::where('id', $validated['booking_id'])
            ->where('tenant_id', $tenantId)
            ->where('property_id', $validated['property_id'])
            ->whereIn('status', ['confirmed', 'active'])
            ->with('room')
            ->first();

        if (! $activeBooking) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No active booking found to transfer from.',
            ], 422);
        }

        if (! $this->hasTransferEligibleGender($tenant)) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'Please complete your profile gender before requesting a room transfer.',
            ], 422);
        }

        $rooms = Room::where('property_id', $activeBooking->property_id)
            ->where('id', '!=', $activeBooking->room_id)
            ->with('tenants', 'amenities', 'images')
            ->orderBy('room_number')
            ->get()
            ->filter(function (Room $room) use ($tenant) {
                return $room->status === 'available'
                    && $room->available_slots > 0
                    && $this->isRoomGenderCompatible($room, $tenant);
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => RoomResource::collection($rooms)->resolve(),
            'message' => 'Eligible transfer rooms fetched successfully.',
        ]);
    }

    public function store(Request $request)
    {
        $tenant = Auth::user();
        $tenantId = $tenant?->id;

        if (! $tenantId) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $validated = $request->validate([
            'booking_id' => 'required|integer|exists:bookings,id',
            'property_id' => 'required|integer|exists:properties,id',
            'requested_room_id' => 'required|exists:rooms,id',
            'reason' => 'required|string|max:500',
        ]);

        $activeBooking = Booking::where('id', $validated['booking_id'])
            ->where('tenant_id', $tenantId)
            ->where('property_id', $validated['property_id'])
            ->whereIn('status', ['confirmed', 'active'])
            ->with('room')
            ->first();

        if (! $activeBooking) {
            return response()->json(['message' => 'No active booking found for the selected property.'], 422);
        }

        if (! $this->hasTransferEligibleGender($tenant)) {
            return response()->json(['message' => 'Please complete your profile gender before requesting a room transfer.'], 422);
        }

        $requestedRoom = Room::findOrFail($validated['requested_room_id']);

        // Basic validation: must be same property (usually) and available
        if ((int) $requestedRoom->property_id !== (int) $validated['property_id']) {
            return response()->json(['message' => 'Requested room does not belong to the selected property.'], 422);
        }

        if ($requestedRoom->property_id !== $activeBooking->property_id) {
            return response()->json(['message' => 'You can only request transfers within the same property.'], 422);
        }

        if (! $requestedRoom->isAvailable() || $requestedRoom->available_slots <= 0) {
            return response()->json(['message' => 'The requested room is not available.'], 422);
        }

        if (! $this->isRoomGenderCompatible($requestedRoom, $tenant)) {
            return response()->json(['message' => 'The requested room is not compatible with your gender restriction.'], 422);
        }

        // Check for existing pending request
        $exists = TransferRequest::where('tenant_id', $tenantId)
            ->where('status', 'pending')
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'You already have a pending transfer request.'], 422);
        }

        $transferRequest = TransferRequest::create([
            'tenant_id' => $tenantId,
            'landlord_id' => $activeBooking->landlord_id,
            'current_room_id' => $activeBooking->room_id,
            'requested_room_id' => $requestedRoom->id,
            'reason' => $validated['reason'],
            'status' => 'pending',
        ]);

        return response()->json($transferRequest, 201);
    }

    private function hasTransferEligibleGender($tenant): bool
    {
        $gender = $this->normalizeTenantGender($tenant?->gender);

        return in_array($gender, ['male', 'female'], true);
    }

    private function normalizeTenantGender(?string $gender): ?string
    {
        if (! $gender) {
            return null;
        }

        $normalized = strtolower(trim($gender));

        return match ($normalized) {
            'male', 'boy', 'boys' => 'male',
            'female', 'girl', 'girls' => 'female',
            default => null,
        };
    }

    private function isRoomGenderCompatible(Room $room, $tenant): bool
    {
        $tenantGender = $this->normalizeTenantGender($tenant?->gender);
        $roomRestriction = strtolower((string) ($room->gender_restriction ?? 'mixed'));

        if (! $tenantGender) {
            return false;
        }

        if ($roomRestriction === 'mixed') {
            return true;
        }

        return $roomRestriction === $tenantGender;
    }

    public function index()
    {
        $tenantId = Auth::id();
        $requests = TransferRequest::where('tenant_id', $tenantId)
            ->with(['currentRoom', 'requestedRoom.property'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($requests);
    }

    public function cancel($id)
    {
        $tenantId = Auth::id();
        $request = TransferRequest::where('tenant_id', $tenantId)->findOrFail($id);

        if ($request->status !== 'pending') {
            return response()->json(['message' => 'Only pending requests can be cancelled.'], 422);
        }

        $request->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Request cancelled successfully.']);
    }
}
