<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReservationDispute;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminDisputeController extends Controller
{
    public function __construct(protected AuditLogService $auditLogService) {}

    /**
     * List all disputes with eager-loaded relations.
     */
    public function index(Request $request)
    {
        $query = ReservationDispute::with([
            'booking',
            'tenant:id,first_name,last_name,email',
            'landlord:id,first_name,last_name,email',
            'resolvedBy:id,first_name,last_name',
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $disputes = $query->latest()->paginate(25);

        return response()->json([
            'success' => true,
            'data' => $disputes,
            'message' => '',
        ]);
    }

    /**
     * Admin resolves a dispute: force_refund | release_to_landlord | dismissed
     */
    public function resolve(Request $request, $id)
    {
        $request->validate([
            'resolution' => 'required|in:force_refund,release_to_landlord,dismissed',
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        $dispute = ReservationDispute::with('booking')->findOrFail($id);

        if ($dispute->status !== 'open') {
            return response()->json([
                'success' => false,
                'message' => 'This dispute has already been resolved.',
            ], 422);
        }

        $resolution = $request->resolution;
        $admin = Auth::user();

        // Update dispute record
        $dispute->update([
            'status' => $resolution === 'dismissed' ? 'dismissed' : 'resolved',
            'resolution' => $resolution,
            'admin_notes' => $request->admin_notes ?? $dispute->admin_notes,
            'resolved_by' => $admin->id,
            'resolved_at' => now(),
        ]);

        // Update the associated booking status if not just dismissed
        if ($dispute->booking) {
            if ($resolution === 'force_refund') {
                $dispute->booking->update(['status' => 'refunded']);
            } elseif ($resolution === 'release_to_landlord') {
                $dispute->booking->update(['status' => 'completed']);
            }
        }

        // Audit log
        $this->auditLogService->log('dispute', "dispute.{$resolution}", [
            'severity' => 'warning',
            'summary' => "Admin resolved dispute #{$dispute->id} with action: {$resolution}",
            'metadata' => [
                'dispute_id' => $dispute->id,
                'booking_id' => $dispute->booking_id,
                'resolution' => $resolution,
                'admin_id' => $admin->id,
            ],
        ]);

        return response()->json([
            'success' => true,
            'data' => $dispute->fresh(['tenant:id,first_name,last_name,email', 'landlord:id,first_name,last_name,email', 'resolvedBy:id,first_name,last_name']),
            'message' => 'Dispute resolved successfully.',
        ]);
    }

    /**
     * Admin updates internal notes on a dispute without resolving.
     */
    public function updateNotes(Request $request, $id)
    {
        $request->validate([
            'admin_notes' => 'required|string|max:2000',
        ]);

        $dispute = ReservationDispute::findOrFail($id);
        $dispute->update(['admin_notes' => $request->admin_notes]);

        return response()->json([
            'success' => true,
            'data' => $dispute->fresh(),
            'message' => 'Notes updated.',
        ]);
    }
}
