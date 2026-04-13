<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemBroadcast;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminBroadcastController extends Controller
{
    public function __construct(protected AuditLogService $auditLogService)
    {
    }

    /**
     * List all broadcasts (most recent first).
     */
    public function index(Request $request)
    {
        $broadcasts = SystemBroadcast::with('creator:id,first_name,last_name')
            ->latest()
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $broadcasts,
            'message' => '',
        ]);
    }

    /**
     * Create a new system broadcast.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:120',
            'message' => 'required|string|max:1000',
            'target_audience' => 'required|in:all,tenants,landlords',
            'type' => 'required|in:info,warning,critical,maintenance',
            'expires_at' => 'nullable|date|after:now',
        ]);

        $broadcast = SystemBroadcast::create([
            ...$validated,
            'created_by' => Auth::id(),
            'is_active' => true,
        ]);

        $this->auditLogService->log('broadcast', 'broadcast.created', [
            'severity' => 'info',
            'summary' => "Admin created broadcast: {$broadcast->title}",
            'metadata' => [
                'broadcast_id' => $broadcast->id,
                'target_audience' => $broadcast->target_audience,
                'type' => $broadcast->type,
            ],
        ]);

        return response()->json([
            'success' => true,
            'data' => $broadcast->load('creator:id,first_name,last_name'),
            'message' => 'Broadcast sent successfully.',
        ], 201);
    }

    /**
     * Toggle active/inactive status of a broadcast.
     */
    public function toggle(Request $request, $id)
    {
        $broadcast = SystemBroadcast::findOrFail($id);
        $broadcast->update(['is_active' => !$broadcast->is_active]);

        return response()->json([
            'success' => true,
            'data' => $broadcast->fresh(),
            'message' => $broadcast->is_active ? 'Broadcast activated.' : 'Broadcast deactivated.',
        ]);
    }

    /**
     * Delete a broadcast.
     */
    public function destroy($id)
    {
        $broadcast = SystemBroadcast::findOrFail($id);
        $broadcast->delete();

        return response()->json([
            'success' => true,
            'message' => 'Broadcast deleted.',
        ]);
    }

    /**
     * Public endpoint: fetch active broadcasts for a given user role.
     * Used by tenant/landlord frontends to show system banners.
     */
    public function active(Request $request)
    {
        $role = $request->query('role', 'all'); // 'tenant', 'landlord', or 'all'

        $broadcasts = SystemBroadcast::active()
            ->where(function ($q) use ($role) {
                $q->where('target_audience', 'all');
                if ($role === 'tenant') {
                    $q->orWhere('target_audience', 'tenants');
                } elseif ($role === 'landlord') {
                    $q->orWhere('target_audience', 'landlords');
                }
            })
            ->latest()
            ->get(['id', 'title', 'message', 'type', 'target_audience', 'expires_at', 'created_at']);

        return response()->json([
            'success' => true,
            'data' => $broadcasts,
            'message' => '',
        ]);
    }
}
