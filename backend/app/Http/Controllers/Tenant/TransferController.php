<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoomResource;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Room;
use App\Models\TransferRequest;
use App\Services\RefundService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TransferController extends Controller
{
    protected $refundService;

    public function __construct(RefundService $refundService)
    {
        $this->refundService = $refundService;
    }

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

        $hasOverdue = $this->hasBlockingOverdueInvoices($tenantId);

        if ($hasOverdue) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'You cannot request a transfer while you have overdue invoices. Please settle your balance first.',
            ], 422);
        }

        $property = $activeBooking->property;
        if (! $this->hasTransferEligibleSex($tenant, $property)) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'Please complete your profile sex (male/female) before requesting a room transfer for this property type.',
            ], 422);
        }

        $rooms = Room::where('property_id', $activeBooking->property_id)
            ->where('id', '!=', $activeBooking->room_id)
            ->with('tenants', 'amenities', 'images', 'property')
            ->orderBy('room_number')
            ->get()
            ->filter(function (Room $room) use ($tenant) {
                return $room->status === 'available'
                    && $room->available_slots > 0
                    && $this->isRoomSexCompatible($room, $tenant);
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
            'new_end_date' => 'nullable|date|after_or_equal:today',
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

        $hasOverdue = $this->hasBlockingOverdueInvoices($tenantId);

        if ($hasOverdue) {
            return response()->json(['message' => 'You cannot request a transfer while you have overdue invoices. Please settle your balance first.'], 422);
        }

        $property = $activeBooking->property;
        if (! $this->hasTransferEligibleSex($tenant, $property)) {
            return response()->json(['message' => 'Please complete your profile sex (male/female) before requesting a room transfer for this property type.'], 422);
        }

        $requestedRoom = Room::with('property')->findOrFail($validated['requested_room_id']);

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

        if (! $this->isRoomSexCompatible($requestedRoom, $tenant)) {
            return response()->json(['message' => 'The requested room is not compatible with your sex restriction.'], 422);
        }

        // Check for existing pending request for this specific room
        $exists = TransferRequest::where('tenant_id', $tenantId)
            ->where('current_room_id', $activeBooking->room_id)
            ->where('status', 'pending')
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'There is already a pending transfer request for this room/booking.'], 422);
        }

        // Check transfer limit: maximum 2 transfers per tenant per month
        $currentMonth = now()->startOfMonth();
        $monthEndTransfers = TransferRequest::where('tenant_id', $tenantId)
            ->whereIn('status', ['pending', 'approved'])
            ->where('created_at', '>=', $currentMonth)
            ->count();

        if ($monthEndTransfers >= 2) {
            return response()->json(['message' => 'Note: as transferring requires effort in checking and more time preparing, transferring of room is only allowed twice per tenant and will be approved only by the Landlord when all records are cleared and all things are ready.'], 422);
        }

        $transferRequest = TransferRequest::create([
            'tenant_id' => $tenantId,
            'landlord_id' => $activeBooking->landlord_id,
            'booking_id' => $activeBooking->id,
            'current_room_id' => $activeBooking->room_id,
            'requested_room_id' => $requestedRoom->id,
            'new_end_date' => $validated['new_end_date'] ?? null,
            'reason' => $validated['reason'],
            'status' => 'pending',
            'quoted_transfer_fee' => $property->transfer_fee ?? 0,
        ]);

        return response()->json($transferRequest, 201);
    }

    private function hasBlockingOverdueInvoices(int $tenantId): bool
    {
        return Invoice::where('tenant_id', $tenantId)
            ->where(function ($query) {
                $query->where('status', 'overdue')
                    ->orWhere(function ($partialQuery) {
                        $partialQuery->where('status', 'partial')
                            ->whereDate('due_date', '<', now()->toDateString());
                    });
            })
            ->exists();
    }

    private function hasTransferEligibleSex($tenant, \App\Models\Property $property): bool
    {
        $propertyType = $this->normalizePropertyTypeToken($property->property_type ?? '');
        $targetTypes = ['dormitory', 'boardinghouse', 'bedspacer'];

        // If it's an Apartment or not one of the target types, sex profile completion is not mandatory for transfer
        if ($propertyType === 'apartment' || ! in_array($propertyType, $targetTypes, true)) {
            return true;
        }

        // For restricted types, user must have a male/female sex set
        $sex = $this->normalizeTenantGender($tenant?->sex);

        return in_array($sex, ['male', 'female'], true);
    }

    private function normalizeTenantGender(?string $sex): ?string
    {
        if (! $sex) {
            return null;
        }

        $normalized = strtolower(trim($sex));

        return match ($normalized) {
            'male', 'boy', 'boys' => 'male',
            'female', 'girl', 'girls' => 'female',
            default => null,
        };
    }

    private function isRoomSexCompatible(Room $room, $tenant): bool
    {
        $property = $room->property;
        $propertyType = $this->normalizePropertyTypeToken($property->property_type ?? '');

        // 1. Apartment type properties are excluded from sex restrictions
        if ($propertyType === 'apartment') {
            return true;
        }

        // 2. Sex constraints only apply to Dormitory, Boarding house, and bedSpacer
        $targetTypes = ['dormitory', 'boardinghouse', 'bedspacer'];
        if (! in_array($propertyType, $targetTypes, true)) {
            // If it's not one of the target types and not an apartment,
            // we default to allowing it unless explicitly restricted by something else.
            // But based on requirements, only these three have the restriction.
            return true;
        }

        // 3. For target types, check sex compatibility
        $tenantSex = $this->normalizeTenantGender($tenant?->sex);
        $roomRestriction = strtolower((string) ($room->sex_restriction ?? 'mixed'));

        // If room is mixed, anyone can join
        if ($roomRestriction === 'mixed') {
            return true;
        }

        // If room has a specific restriction (male/female), tenant must match
        if (! $tenantSex) {
            return false;
        }

        return $roomRestriction === $tenantSex;
    }

    private function normalizePropertyTypeToken(?string $propertyType): string
    {
        return strtolower(str_replace([' ', '_', '-'], '', (string) $propertyType));
    }

    /**
     * Preview financial impact of a room transfer before submitting.
     * Returns rate comparison, prorated credit, and suggested adjustment.
     * GET /tenant/transfers/preview?booking_id=X&requested_room_id=Y
     */
    public function preview(Request $request)
    {
        $tenant = Auth::user();
        $tenantId = $tenant?->id;

        if (! $tenantId) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 401);
        }

        $validated = $request->validate([
            'booking_id' => 'required|integer|exists:bookings,id',
            'requested_room_id' => 'required|integer|exists:rooms,id',
        ]);

        $activeBooking = Booking::where('id', $validated['booking_id'])
            ->where('tenant_id', $tenantId)
            ->whereIn('status', ['confirmed', 'active'])
            ->with('room')
            ->first();

        if (! $activeBooking) {
            return response()->json(['success' => false, 'message' => 'No active booking found.'], 422);
        }

        $newRoom = Room::find($validated['requested_room_id']);
        if (! $newRoom) {
            return response()->json(['success' => false, 'message' => 'Requested room not found.'], 422);
        }

        $property = $activeBooking->property;
        $transferFee = (float) ($property->transfer_fee ?? 0);

        // Proration credit from current booking
        $creditCalc = $this->refundService->calculateProratedCredit($activeBooking, 0, $transferFee);

        $remainingDays = (int) ($creditCalc['remaining_days'] ?? 0);
        $paidAmount = (float) ($creditCalc['paid_amount'] ?? 0);
        $creditAvailable = (float) ($creditCalc['final_credit'] ?? 0);
        $unusedValue = (float) ($creditCalc['unused_value'] ?? 0);
        $nextBillingDate = $creditCalc['next_billing_date'] ?? null;

        $currentRoomRate = (float) ($activeBooking->monthly_rent ?? 0);
        $newRoomRate = (float) ($newRoom->monthly_rate ?? $newRoom->price ?? 0);

        $newRoomCostCents = (int) round(($newRoomRate * 100 * $remainingDays) / 30);
        $unusedValueCents = (int) round($unusedValue * 100);
        $suggestedAdjustmentCents = $newRoomCostCents - $unusedValueCents;
        $suggestedAdjustment = round($suggestedAdjustmentCents / 100, 2);
        $newRoomCost = round($newRoomCostCents / 100, 2);

        $hasPaymentThisPeriod = $paidAmount > 0;

        return response()->json([
            'success' => true,
            'data' => [
                'current_room_rate' => $currentRoomRate,
                'new_room_rate' => $newRoomRate,
                'remaining_days' => $remainingDays,
                'next_billing_date' => $nextBillingDate,
                'old_room_unused_value' => $unusedValue,
                'paid_amount' => $paidAmount,
                'credit_available' => $creditAvailable,
                'transfer_fee' => $transferFee,
                'new_room_cost' => $newRoomCost,
                'suggested_adjustment' => $suggestedAdjustment,
                'has_payment_this_period' => $hasPaymentThisPeriod,
            ],
        ]);
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
