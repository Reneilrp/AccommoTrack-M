<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\TransferRequest;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TransferController extends Controller
{
    public function store(Request $request)
    {
        $tenantId = Auth::id();
        
        // Find active room assignment or confirmed booking
        $activeBooking = Booking::where('tenant_id', $tenantId)
            ->whereIn('status', ['confirmed', 'active'])
            ->with('room')
            ->first();

        if (!$activeBooking) {
            return response()->json(['message' => 'No active booking found to transfer from.'], 422);
        }

        $validated = $request->validate([
            'requested_room_id' => 'required|exists:rooms,id',
            'reason' => 'required|string|max:500'
        ]);

        $requestedRoom = Room::findOrFail($validated['requested_room_id']);

        // Basic validation: must be same property (usually) and available
        if ($requestedRoom->property_id !== $activeBooking->property_id) {
            return response()->json(['message' => 'You can only request transfers within the same property.'], 422);
        }

        if (!$requestedRoom->isAvailable() || $requestedRoom->available_slots <= 0) {
            return response()->json(['message' => 'The requested room is not available.'], 422);
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
            'status' => 'pending'
        ]);

        return response()->json($transferRequest, 201);
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
