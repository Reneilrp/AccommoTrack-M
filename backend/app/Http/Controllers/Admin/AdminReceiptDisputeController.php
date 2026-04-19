<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReceiptDispute;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminReceiptDisputeController extends Controller
{
    public function __construct(protected AuditLogService $auditLogService) {}

    /**
     * List all receipt disputes.
     */
    public function index(Request $request)
    {
        $query = ReceiptDispute::with([
            'invoice.tenant',
            'invoice.property',
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
     * Admin resolves a receipt dispute.
     */
    public function resolve(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:resolved,dismissed',
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        $dispute = ReceiptDispute::findOrFail($id);

        $admin = Auth::user();

        $dispute->update([
            'status' => $request->status,
            'admin_notes' => $request->admin_notes ?? $dispute->admin_notes,
            // Track who resolved it in metadata if needed, but for now we just mark status
        ]);

        // Audit log
        $this->auditLogService->log('receipt_dispute', "receipt_dispute.{$request->status}", [
            'severity' => 'warning',
            'summary' => "Admin resolved receipt dispute #{$dispute->id} as {$request->status}",
            'metadata' => [
                'dispute_id' => $dispute->id,
                'receipt_reference' => $dispute->receipt_reference,
                'admin_id' => $admin->id,
            ],
        ]);

        return response()->json([
            'success' => true,
            'data' => $dispute->fresh(['invoice.tenant', 'invoice.property']),
            'message' => 'Receipt dispute resolved successfully.',
        ]);
    }
}
