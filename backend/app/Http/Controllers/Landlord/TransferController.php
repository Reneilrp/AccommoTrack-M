<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\TransferRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransferController extends Controller
{
    use ResolvesLandlordAccess;

    public function index(Request $request)
    {
        $context = $this->resolveLandlordContext($request);
        $requests = TransferRequest::where('landlord_id', $context['landlord_id'])
            ->with(['tenant', 'currentRoom', 'requestedRoom.property'])
            ->orderBy('created_at', 'desc')
            ->get();

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

            return response()->json(['message' => 'Request rejected']);
        }

        // For Approval, we trigger the actual transfer logic
        try {
            DB::beginTransaction();

            $tenantController = app(\App\Http\Controllers\Landlord\TenantController::class);

            // Create a fake request to pass to transferRoom
            $fakeRequest = new Request([
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

        $activeBooking = \App\Models\Booking::where('tenant_id', $transferReq->tenant_id)
            ->where('room_id', $transferReq->current_room_id)
            ->whereIn('status', ['confirmed', 'active'])
            ->first();

        if (!$activeBooking) {
            return response()->json([
                'suggested_adjustment' => 0,
                'remaining_days' => 0,
                'old_room_unused_value' => 0,
                'new_room_cost' => 0,
            ]);
        }

        $startDate = \Carbon\Carbon::parse($activeBooking->start_date);
        $today = now();
        
        $nextBillingDate = $startDate->copy();
        while ($nextBillingDate->lte($today)) {
            $nextBillingDate->addMonth();
        }
        
        $remainingDays = $today->diffInDays($nextBillingDate);
        $monthlyRent = $activeBooking->monthly_rent ?? 0;
        
        $oldRoomDailyRate = $monthlyRent / 30;
        $unusedValueOldRoom = $oldRoomDailyRate * $remainingDays;
        
        $newRoom = $transferReq->requestedRoom;
        $newMonthlyRent = $newRoom->monthly_rate ?? $newRoom->price ?? 0;
        $newRoomDailyRate = $newMonthlyRent / 30;
        $costOfNewRoomForRemainingDays = $newRoomDailyRate * $remainingDays;
        
        $suggestedAdjustment = round($costOfNewRoomForRemainingDays - $unusedValueOldRoom, 2);

        return response()->json([
            'suggested_adjustment' => $suggestedAdjustment,
            'remaining_days' => $remainingDays,
            'old_room_unused_value' => round($unusedValueOldRoom, 2),
            'new_room_cost' => round($costOfNewRoomForRemainingDays, 2),
        ]);
    }
}
