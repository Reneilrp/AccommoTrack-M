<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
use App\Mail\InquiryReply;
use App\Models\Inquiry;
use App\Services\AuditLogService;
use App\Support\AdminPermission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class InquiryController extends Controller
{
    public function __construct(protected AuditLogService $auditLogService) {}

    /**
     * Store a new inquiry from a guest.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'message' => 'required|string|max:2000',
            'property_id' => 'nullable|exists:properties,id',
        ]);

        $inquiry = Inquiry::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'message' => $request->message,
            'property_id' => $request->property_id,
            'status' => 'new',
            'source' => 'web_help',
        ]);

        return response()->json([
            'message' => 'Inquiry submitted successfully. We will contact you via email.',
            'inquiry' => $inquiry,
        ], 201);
    }

    /**
     * Get all inquiries (Admin).
     */
    public function index(Request $request)
    {
        $inquiries = Inquiry::with('property')->orderBy('created_at', 'desc')->paginate(20);
        $admin = $request->user();

        return response()->json([
            'data' => $inquiries->items(),
            'current_page' => $inquiries->currentPage(),
            'last_page' => $inquiries->lastPage(),
            'per_page' => $inquiries->perPage(),
            'total' => $inquiries->total(),
            'permissions' => AdminPermission::permissions($admin),
            'admin_tier' => AdminPermission::resolveTier($admin),
        ]);
    }

    /**
     * Update inquiry status (Admin).
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:new,contacted,responded,converted,escalated,closed,archived',
        ]);

        $inquiry = Inquiry::findOrFail($id);
        $admin = $request->user();
        $nextStatus = strtolower((string) $request->status);

        if ($nextStatus === 'escalated' && ! AdminPermission::can($admin, 'can_escalate_inquiry')) {
            return response()->json(['message' => 'Escalation is restricted to super admins.'], 403);
        }

        if ($nextStatus === 'closed' && ! AdminPermission::can($admin, 'can_close_inquiry')) {
            return response()->json(['message' => 'Closing inquiries is restricted to super admins.'], 403);
        }

        if ($nextStatus === 'archived' && ! AdminPermission::can($admin, 'can_archive_inquiry')) {
            return response()->json(['message' => 'Archiving inquiries is restricted to super admins.'], 403);
        }

        $statusBefore = (string) $inquiry->status;
        $inquiry->update([
            'status' => $nextStatus,
            'responded_at' => in_array($nextStatus, ['contacted', 'responded', 'converted', 'escalated', 'closed', 'archived'], true) ? now() : $inquiry->responded_at,
        ]);

        $this->auditLogService->log('support', 'inquiry.status_updated', [
            'severity' => 'info',
            'subject_type' => 'inquiry',
            'subject_id' => $inquiry->id,
            'status_before' => $statusBefore,
            'status_after' => $inquiry->status,
            'summary' => sprintf('Admin changed inquiry #%d status from %s to %s.', $inquiry->id, $statusBefore, $inquiry->status),
            'metadata' => [
                'source' => $inquiry->source,
                'inquiry_email' => $inquiry->email,
            ],
        ]);

        return response()->json(['message' => 'Inquiry status updated', 'inquiry' => $inquiry]);
    }

    /**
     * Delete inquiry (Admin).
     */
    public function destroy(Request $request, $id)
    {
        if (! AdminPermission::can($request->user(), 'can_delete_inquiry')) {
            return response()->json(['message' => 'Deleting inquiries is restricted to super admins.'], 403);
        }

        $inquiry = Inquiry::findOrFail($id);
        $summary = sprintf('Admin deleted inquiry #%d from %s.', $inquiry->id, $inquiry->email);
        $inquiry->delete();

        $this->auditLogService->log('support', 'inquiry.deleted', [
            'severity' => 'warning',
            'subject_type' => 'inquiry',
            'subject_id' => $inquiry->id,
            'status_before' => $inquiry->status,
            'status_after' => 'deleted',
            'summary' => $summary,
            'metadata' => [
                'source' => $inquiry->source,
                'inquiry_email' => $inquiry->email,
            ],
        ]);

        return response()->json(['message' => 'Inquiry deleted']);
    }

    /**
     * Reply to an inquiry via email.
     */
    public function reply(Request $request, $id)
    {
        if (! AdminPermission::can($request->user(), 'can_reply_inquiry')) {
            return response()->json(['message' => 'You do not have permission to reply to inquiries.'], 403);
        }

        $request->validate(['message' => 'required|string|max:5000']);

        $inquiry = Inquiry::findOrFail($id);
        $statusBefore = (string) $inquiry->status;

        try {
            Mail::to($inquiry->email)->send(new InquiryReply($inquiry, $request->message));

            $inquiry->update([
                'status' => 'responded',
                'responded_at' => now(),
            ]);

            $this->auditLogService->log('support', 'inquiry.replied', [
                'severity' => 'info',
                'subject_type' => 'inquiry',
                'subject_id' => $inquiry->id,
                'status_before' => $statusBefore,
                'status_after' => 'responded',
                'summary' => sprintf('Admin replied to inquiry #%d via email.', $inquiry->id),
                'metadata' => [
                    'source' => $inquiry->source,
                    'inquiry_email' => $inquiry->email,
                ],
            ]);

            return response()->json([
                'message' => 'Reply sent successfully!',
                'inquiry' => $inquiry,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error sending email: '.$e->getMessage(),
            ], 500);
        }
    }
}
