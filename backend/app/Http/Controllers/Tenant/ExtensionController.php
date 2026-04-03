<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\ExtensionRequest;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ExtensionController extends Controller
{
    public function store(Request $request, $bookingId)
    {
        $tenantId = Auth::id();
        $booking = Booking::where('id', $bookingId)
            ->where('tenant_id', $tenantId)
            ->whereIn('status', ['confirmed', 'active', 'completed', 'partial-completed'])
            ->firstOrFail();

        if (($booking->contract_mode ?? 'monthly') === 'monthly' && ! $booking->end_date) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Open-ended monthly stays do not need extension requests. Submit move-out notice when you are ready to leave.',
            ], 422);
        }

        if (! $booking->end_date) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Cannot request extension without a current move-out date.',
            ], 422);
        }

        $validated = $request->validate([
            'extension_type' => 'required|in:monthly,daily',
            'requested_end_date' => 'required|date|after:today',
            'notes' => 'nullable|string|max:500',
        ]);

        if (($booking->contract_mode ?? null) === 'daily' && $validated['extension_type'] !== 'daily') {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Daily contracts must use daily extension requests.',
            ], 422);
        }

        $requestedDate = Carbon::parse($validated['requested_end_date']);
        $currentEndDate = Carbon::parse($booking->end_date);

        if ($requestedDate->lessThanOrEqualTo($currentEndDate)) {
            return response()->json(['message' => 'Requested end date must be after current end date.'], 422);
        }

        // Calculate proposed amount based on room pricing
        $room = $booking->room;
        $days = $currentEndDate->diffInDays($requestedDate);

        $priceResult = $room->calculatePriceForDays($days);
        // If bed spacer, multiply by bed count
        $proposedAmount = $priceResult['total'] * ($booking->bed_count ?? 1);

        $extensionRequest = ExtensionRequest::create([
            'booking_id' => $booking->id,
            'tenant_id' => $tenantId,
            'landlord_id' => $booking->landlord_id,
            'current_end_date' => $booking->end_date,
            'requested_end_date' => $validated['requested_end_date'],
            'extension_type' => $validated['extension_type'],
            'proposed_amount' => $proposedAmount,
            'tenant_notes' => $validated['notes'],
            'status' => 'pending',
        ]);

        return response()->json($extensionRequest, 201);
    }

    public function index()
    {
        $tenantId = Auth::id();
        $requests = ExtensionRequest::where('tenant_id', $tenantId)
            ->with(['booking.room'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($requests);
    }
}
