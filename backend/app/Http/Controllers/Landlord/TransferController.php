<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\TransferRequest;
use App\Services\RefundService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransferController extends Controller
{
    use ResolvesLandlordAccess;

    protected $refundService;

    public function __construct(RefundService $refundService)
    {
        $this->refundService = $refundService;
    }

    public function index(Request $request)
    {
        $context = $this->resolveLandlordContext($request);
        $query = TransferRequest::where('landlord_id', $context['landlord_id'])
            ->with(['tenant', 'currentRoom', 'requestedRoom.property'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('property_id') && $request->property_id !== 'all') {
            // Authorization check for caretakers
            if ($context['is_caretaker'] && $context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
                if (!in_array($request->property_id, $assignedPropertyIds)) {
                    return response()->json(['message' => 'Unauthorized access to this property'], 403);
                }
            }

            $query->where(function ($q) use ($request) {
                $q->whereHas('requestedRoom', function ($roomQuery) use ($request) {
                    $roomQuery->where('property_id', $request->property_id);
                })->orWhereHas('currentRoom', function ($roomQuery) use ($request) {
                    $roomQuery->where('property_id', $request->property_id);
                });
            });
        } elseif ($context['is_caretaker'] && $context['assignment']) {
            // If no specific property is requested, limit caretaker to their assigned properties
            $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
            $query->where(function ($q) use ($assignedPropertyIds) {
                $q->whereHas('requestedRoom', function ($roomQuery) use ($assignedPropertyIds) {
                    $roomQuery->whereIn('property_id', $assignedPropertyIds);
                })->orWhereHas('currentRoom', function ($roomQuery) use ($assignedPropertyIds) {
                    $roomQuery->whereIn('property_id', $assignedPropertyIds);
                });
            });
        }
    
        $requests = $query->get();
    
        return response()->json($requests);
    }

    public function handle(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $transferReq = TransferRequest::where('landlord_id', $context['landlord_id'])->findOrFail($id);

        if ($transferReq->status !== 'pending') {
            return response()->json(['message' => 'Request already handled'], 422);
        }

        $validated = $request->validate([
            'action' => 'required|in:approve,reject',
            'damage_charge' => 'nullable|numeric|min:0',
            'damage_description' => 'nullable|string|required_if:damage_charge,>0',
            'landlord_notes' => 'nullable|string|max:500',
            'prorated_adjustment' => 'nullable|numeric',
        ]);

        if ($validated['action'] === 'reject') {
            $transferReq->update([
                'status' => 'rejected',
                'landlord_notes' => $validated['landlord_notes'] ?? null,
                'handled_at' => now(),
            ]);

            $tenant = $transferReq->tenant;
            if ($tenant) {
                $tenant->notify(new \App\Notifications\TransferRequestHandledNotification($transferReq, 'rejected'));
            }

            return response()->json(['message' => 'Request rejected']);
        }

        // For Approval, we trigger the actual transfer logic
        try {
            DB::beginTransaction();

            $tenantController = app(\App\Http\Controllers\Landlord\TenantController::class);

            // Calculate credit before transfer
            $activeBooking = null;
            if ($transferReq->booking_id) {
                $activeBooking = \App\Models\Booking::find($transferReq->booking_id);
            }
            
            $creditCalculation = null;
            $creditAmount = 0;
            if ($activeBooking) {
                $damageCharge = $validated['damage_charge'] ?? 0;
                $creditCalculation = $this->refundService->calculateProratedCredit($activeBooking, $damageCharge);
                $creditAmount = $creditCalculation['final_credit'];
            }

            // Create a fake request to pass to transferRoom
            $fakeRequest = new Request([
                'booking_id' => $transferReq->booking_id,
                'new_room_id' => $transferReq->requested_room_id,
                'reason' => $transferReq->reason,
                'damage_charge' => $validated['damage_charge'] ?? 0,
                'damage_description' => $validated['damage_description'] ?? null,
                'new_end_date' => $transferReq->new_end_date ? $transferReq->new_end_date : null,
                'prorated_adjustment' => $validated['prorated_adjustment'] ?? 0,
            ]);

            // Set the authenticated user resolver on the fake request so ResolvesLandlordAccess works
            $fakeRequest->setUserResolver(function () use ($request) {
                return $request->user();
            });

            // Call the existing verified transferRoom method
            $response = $tenantController->transferRoom($fakeRequest, $transferReq->tenant_id);

            if ($response->getStatusCode() !== 200) {
                throw new \Exception('Transfer execution failed: '.$response->getContent());
            }

            $transferReq->update([
                'status' => 'approved',
                'landlord_notes' => $validated['landlord_notes'] ?? null,
                'handled_at' => now(),
                'credit_amount' => $creditAmount,
                'credit_calculation' => $creditCalculation,
            ]);

            DB::commit();

            return $response;

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['error' => 'Approval failed', 'message' => $e->getMessage()], 500);
        }
    }

    public function calculateProration(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $transferReq = TransferRequest::where('landlord_id', $context['landlord_id'])->with('requestedRoom')->findOrFail($id);

        $activeBooking = null;
        if ($transferReq->booking_id) {
            $activeBooking = \App\Models\Booking::find($transferReq->booking_id);
        }

        if (!$activeBooking) {
            $activeBooking = \App\Models\Booking::where('tenant_id', $transferReq->tenant_id)
                ->where('room_id', $transferReq->current_room_id)
                ->whereIn('status', ['confirmed', 'active'])
                ->first();
        }

        if (!$activeBooking) {
            return response()->json([
                'suggested_adjustment' => 0,
                'remaining_days' => 0,
                'old_room_unused_value' => 0,
                'new_room_cost' => 0,
                'credit_available' => 0,
            ]);
        }

        // Calculate prorated credit using RefundService
        $damageCharge = $request->input('damage_charge', 0);
        $creditCalculation = $this->refundService->calculateProratedCredit($activeBooking, $damageCharge);
        
        // Calculate new room cost for remaining days
        $newRoom = $transferReq->requestedRoom;
        $remainingDays = (int) ($creditCalculation['remaining_days'] ?? 0);
        $newMonthlyRentCents = (int) round(((float) ($newRoom->monthly_rate ?? $newRoom->price ?? 0)) * 100);
        $costOfNewRoomForRemainingDaysCents = (int) round(($newMonthlyRentCents * $remainingDays) / 30);
        $oldRoomUnusedValueCents = (int) ($creditCalculation['unused_value_cents']
            ?? round(((float) ($creditCalculation['unused_value'] ?? 0)) * 100));

        // Positive means tenant needs to pay more, negative means tenant gets extra credit.
        $suggestedAdjustmentCents = $costOfNewRoomForRemainingDaysCents - $oldRoomUnusedValueCents;
        $suggestedAdjustment = round($suggestedAdjustmentCents / 100, 2);

        return response()->json([
            'suggested_adjustment' => $suggestedAdjustment,
            'remaining_days' => $remainingDays,
            'old_room_unused_value' => round($oldRoomUnusedValueCents / 100, 2),
            'new_room_cost' => round($costOfNewRoomForRemainingDaysCents / 100, 2),
            'credit_available' => $creditCalculation['final_credit'],
            'paid_amount' => $creditCalculation['paid_amount'],
            'damage_charge' => $creditCalculation['damage_charge'],
            'penalty' => $creditCalculation['penalty'],
        ]);
    }
}
