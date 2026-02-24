<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReportController extends Controller
{
    /**
     * Submit a report (Tenant only)
     */
    public function store(Request $request)
    {
        $request->validate([
            'property_id' => 'required|exists:properties,id',
            'reason' => 'required|string|max:255',
            'description' => 'required|string|min:10',
        ]);

        $user = Auth::user();

        // Verify that the user has a booking for this property
        // (Active OR Completed)
        $hasBooking = Booking::where('tenant_id', $user->id)
            ->where('property_id', $request->property_id)
            ->whereIn('status', ['confirmed', 'completed', 'cancelled']) // Allow even cancelled if they had a bad experience
            ->exists();

        if (!$hasBooking) {
            return response()->json([
                'message' => 'You can only report properties you have booked.'
            ], 403);
        }

        // Check for duplicate pending reports to prevent spam
        $existing = Report::where('reporter_id', $user->id)
            ->where('property_id', $request->property_id)
            ->where('status', 'pending')
            ->exists();

        if ($existing) {
            return response()->json([
                'message' => 'You already have a pending report for this property.'
            ], 429);
        }

        $report = Report::create([
            'reporter_id' => $user->id,
            'property_id' => $request->property_id,
            'reason' => $request->reason,
            'description' => $request->description,
            'status' => 'pending'
        ]);

        return response()->json([
            'message' => 'Report submitted successfully. Admins will review it shortly.',
            'report' => $report
        ], 201);
    }

    /**
     * Get all reports (Admin only)
     */
    public function index(Request $request)
    {
        $query = Report::with(['reporter:id,first_name,last_name,email', 'property:id,title']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $reports = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($reports);
    }

    /**
     * Update report status (Admin only)
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,resolved,dismissed',
            'admin_notes' => 'nullable|string'
        ]);

        $report = Report::findOrFail($id);
        
        $report->update([
            'status' => $request->status,
            'admin_notes' => $request->admin_notes
        ]);

        return response()->json([
            'message' => 'Report updated',
            'report' => $report
        ]);
    }
}
