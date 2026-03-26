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

    private function okResponse($data = [], string $message = '', int $status = 200)
    {
        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => $message,
        ], $status);
    }

    private function failResponse(string $message, int $status = 422, $data = [])
    {
        return response()->json([
            'success' => false,
            'data' => $data,
            'message' => $message,
        ], $status);
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
                    return $this->failResponse('Unauthorized access to this property.', 403);
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

        return $this->okResponse($requests, 'Transfer requests fetched successfully.');
    }

    public function handle(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $transferReq = TransferRequest::where('landlord_id', $context['landlord_id'])
            ->with(['currentRoom.property', 'requestedRoom.property', 'tenant'])
            ->findOrFail($id);

        // Ensure transfer rooms remain under this landlord before any side effects.
        $currentRoomLandlordId = $transferReq->currentRoom?->property?->landlord_id;
        $requestedRoomLandlordId = $transferReq->requestedRoom?->property?->landlord_id;
        if (($currentRoomLandlordId && (int) $currentRoomLandlordId !== (int) $context['landlord_id'])
            || ($requestedRoomLandlordId && (int) $requestedRoomLandlordId !== (int) $context['landlord_id'])) {
            return $this->failResponse('Transfer request no longer belongs to your property.', 403);
        }

        if ($context['is_caretaker'] && $context['assignment']) {
            $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
            $requestPropertyId = $transferReq->requestedRoom?->property_id ?? $transferReq->currentRoom?->property_id;
            if ($requestPropertyId && ! in_array((int) $requestPropertyId, array_map('intval', $assignedPropertyIds), true)) {
                return $this->failResponse('Unauthorized access to this property.', 403);
            }
        }

        if ($transferReq->status !== 'pending') {
            return $this->failResponse('Request already handled.', 422);
        }

        $validated = $request->validate([
            'action' => 'required|in:approve,reject',
            'damage_charge' => 'nullable|numeric|min:0',
            'damage_description' => 'nullable|string|max:500',
            'landlord_notes' => 'nullable|string|max:500',
            'prorated_adjustment' => 'nullable|numeric',
        ]);

        $damageCharge = (float) ($validated['damage_charge'] ?? 0);
        if ($damageCharge > 0 && empty(trim((string) ($validated['damage_description'] ?? '')))) {
            return $this->failResponse('Damage description is required when damage charge is greater than zero.', 422);
        }

        if (($validated['action'] ?? null) === 'reject' && empty(trim((string) ($validated['landlord_notes'] ?? '')))) {
            return $this->failResponse('Please provide a rejection reason for this transfer request.', 422);
        }

        if ($validated['action'] === 'reject') {
            $transferReq->update([
                'status' => 'rejected',
                'landlord_notes' => trim((string) ($validated['landlord_notes'] ?? '')),
                'handled_at' => now(),
            ]);

            $tenant = $transferReq->tenant;
            if ($tenant) {
                $tenant->notify(new \App\Notifications\TransferRequestHandledNotification($transferReq, 'rejected'));
            }

            return $this->okResponse([
                'transfer_request' => $transferReq->fresh(['tenant', 'currentRoom', 'requestedRoom.property']),
            ], 'Request rejected successfully.');
        }

        // For Approval, we trigger the actual transfer logic
        try {
            DB::beginTransaction();

            $tenantController = app(\App\Http\Controllers\Landlord\TenantController::class);

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
                $responseBody = json_decode($response->getContent(), true) ?? [];
                DB::rollBack();

                return $this->failResponse(
                    $responseBody['message'] ?? $responseBody['error'] ?? 'Transfer execution failed.',
                    $response->getStatusCode(),
                    $responseBody
                );
            }

            $transferReq->update([
                'status' => 'approved',
                'landlord_notes' => $validated['landlord_notes'] ?? null,
                'handled_at' => now(),
            ]);

            DB::commit();

            return $this->okResponse([
                'transfer_request' => $transferReq->fresh(['tenant', 'currentRoom', 'requestedRoom.property']),
            ], 'Request approved and transfer executed successfully.');

        } catch (\Exception $e) {
            DB::rollBack();

            return $this->failResponse('Approval failed: '.$e->getMessage(), 500);
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
            return $this->okResponse([
                'suggested_adjustment' => 0,
                'remaining_days' => 0,
                'old_room_unused_value' => 0,
                'new_room_cost' => 0,
            ], 'No active booking found for proration calculation.');
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

        return $this->okResponse([
            'suggested_adjustment' => $suggestedAdjustment,
            'remaining_days' => $remainingDays,
            'old_room_unused_value' => round($unusedValueOldRoom, 2),
            'new_room_cost' => round($costOfNewRoomForRemainingDays, 2),
        ], 'Proration calculated successfully.');
    }
}
