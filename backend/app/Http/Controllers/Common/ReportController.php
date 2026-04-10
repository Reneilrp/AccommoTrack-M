<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Report;
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
            ->whereIn('status', ['active', 'confirmed', 'completed', 'cancelled']) // Allow active/current and historical stays
            ->exists();

        if (! $hasBooking) {
            return response()->json([
                'message' => 'You can only report properties you have booked.',
            ], 403);
        }

        // Check for duplicate pending reports to prevent spam
        $existing = Report::where('reporter_id', $user->id)
            ->where('property_id', $request->property_id)
            ->where('status', 'pending')
            ->exists();

        if ($existing) {
            return response()->json([
                'message' => 'You already have a pending report for this property.',
            ], 429);
        }

        $report = Report::create([
            'reporter_id' => $user->id,
            'property_id' => $request->property_id,
            'reason' => $request->reason,
            'description' => $request->description,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Report submitted successfully. Admins will review it shortly.',
            'report' => $report,
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
            'admin_notes' => 'nullable|string',
            'issue_strike' => 'nullable|boolean',
        ]);

        $report = Report::with('property.landlord')->findOrFail($id);

        $report->update([
            'status' => $request->status,
            'admin_notes' => $request->admin_notes,
        ]);

        $strikeIssued = false;
        $suspended = false;

        // If resolving the report and admin opted to issue a strike against the landlord
        if ($request->status === 'resolved' && $request->issue_strike && $report->property && $report->property->landlord) {
            $landlord = $report->property->landlord;
            $landlord->increment('strikes');
            $strikeIssued = true;

            // Enforce 3-strike rule
            if ($landlord->strikes >= 3) {
                // Suspend for 30 days
                $landlord->update([
                    'suspended_until' => now()->addDays(30),
                ]);
                $suspended = true;

                // Log the suspension
                app(\App\Services\AuditLogService::class)->log('user', 'user.suspended', [
                    'severity' => 'danger',
                    'subject_type' => 'user',
                    'subject_id' => $landlord->id,
                    'summary' => "System automatically suspended landlord {$landlord->email} for 30 days due to accumulating 3 strikes.",
                ]);
            } else {
                app(\App\Services\AuditLogService::class)->log('user', 'user.strike_issued', [
                    'severity' => 'warning',
                    'subject_type' => 'user',
                    'subject_id' => $landlord->id,
                    'summary' => "Admin issued strike {$landlord->strikes}/3 to landlord {$landlord->email} via Report #{$report->id}.",
                ]);
            }
        }

        return response()->json([
            'message' => $suspended ? 'Report resolved. Landlord hit 3 strikes and was auto-suspended for 30 days.' : 'Report updated.',
            'strike_issued' => $strikeIssued,
            'report' => $report,
        ]);
    }
}
