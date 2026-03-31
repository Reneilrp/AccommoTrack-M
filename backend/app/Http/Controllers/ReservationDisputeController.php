<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Booking;
use App\Models\ReservationDispute;
use Illuminate\Support\Facades\Auth;

class ReservationDisputeController extends Controller
{
    /**
     * Store a newly created dispute/report.
     */
    public function store(Request $request)
    {
        $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'reason' => 'required|string|max:1000',
            'report_type' => 'required|in:fake_receipt,landlord_scam,other',
        ]);

        $user = Auth::user();
        $booking = Booking::findOrFail($request->booking_id);

        // Ensure the reporting user is either the tenant or the landlord of the booking
        if ($user->id !== $booking->tenant_id && $user->id !== $booking->landlord_id) {
            return response()->json(['message' => 'Unauthorized to dispute this booking.'], 403);
        }

        $dispute = ReservationDispute::create([
            'booking_id' => $booking->id,
            'tenant_id' => $booking->tenant_id,
            'landlord_id' => $booking->landlord_id,
            'reason' => "Reported by User ({$user->id}): " . $request->reason,
            'status' => 'open',
        ]);

        // Optionally, flag the booking
        if ($request->report_type === 'fake_receipt') {
            $booking->status = 'disputed';
            $booking->save();
        }

        return response()->json([
            'message' => 'Report submitted successfully. Our admin team will review it.',
            'dispute' => $dispute,
        ], 201);
    }
}
