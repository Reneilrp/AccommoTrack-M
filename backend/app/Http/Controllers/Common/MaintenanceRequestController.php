<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Models\Booking;
use App\Models\MaintenanceRequest;
use App\Models\MaintenanceUpdate;
use App\Events\MaintenanceStatusChanged;
use App\Services\UserCounterService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class MaintenanceRequestController extends Controller
{
    use ResolvesLandlordAccess;

    protected UserCounterService $counterService;

    public function __construct(UserCounterService $counterService)
    {
        $this->counterService = $counterService;
    }

    /**
     * Store a new maintenance request from a tenant.
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'priority' => 'required|in:low,medium,high,urgent',
            'booking_id' => 'required|exists:bookings,id',
            'images.*' => 'nullable|image|max:5120', // Max 5MB
        ]);

        $booking = Booking::where('id', $request->booking_id)
            ->where('tenant_id', Auth::id())
            ->firstOrFail();

        $imagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('maintenance_requests');
                $imagePaths[] = $path;
            }
        }

        DB::beginTransaction();
        try {
            $maintenanceRequest = MaintenanceRequest::create([
                'tenant_id' => Auth::id(),
                'landlord_id' => $booking->landlord_id,
                'property_id' => $booking->property_id,
                'booking_id' => $booking->id,
                'title' => $request->title,
                'description' => $request->description,
                'priority' => $request->priority,
                'status' => 'pending',
                'images' => ! empty($imagePaths) ? $imagePaths : null,
            ]);

            $update = $this->logUpdate($maintenanceRequest, 'status_change', 'Maintenance request submitted', null, 'pending');
            broadcast(new MaintenanceStatusChanged($maintenanceRequest, $update));

            // BROADCAST COUNTERS to Landlord/Caretakers
            $this->counterService->broadcastCounters((int) $booking->landlord_id);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Maintenance request submitted successfully',
                'data' => $maintenanceRequest,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Failed to submit request'], 500);
        }
    }

    /**
     * Get maintenance requests for the authenticated tenant.
     */
    public function index()
    {
        $requests = MaintenanceRequest::where('tenant_id', Auth::id())
            ->with(['property:id,title', 'booking.room:id,room_number', 'assignedTo:id,first_name,last_name'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $requests,
        ]);
    }

    /**
     * Get single maintenance request with history (Timeline)
     */
    public function show($id)
    {
        $request = MaintenanceRequest::where('tenant_id', Auth::id())
            ->with([
                'property:id,title,address', 
                'booking.room:id,room_number,floor', 
                'assignedTo:id,first_name,last_name,profile_image',
                'updates.user:id,first_name,last_name,profile_image,role'
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $request,
        ]);
    }

    /**
     * Get maintenance requests for the landlord/caretaker.
     */
    public function indexForLandlord(Request $request)
    {
        $context = $this->resolveLandlordContext($request);
        
        $hasGlobalPermission = $context['is_caretaker'] 
            ? (bool) ($context['assignment']->can_manage_maintenance ?? false)
            : true;

        $hasAssignments = (bool) \App\Models\MaintenanceRequest::where('assigned_to', $context['user']->id)->exists();

        if (! $hasGlobalPermission && ! $hasAssignments) {
            return response()->json(['message' => 'Unauthorized access to maintenance module.'], 403);
        }

        $query = MaintenanceRequest::where('landlord_id', $context['landlord_id'])
            ->with(['property:id,title', 'tenant:id,first_name,last_name', 'booking.room:id,room_number', 'assignedTo:id,first_name,last_name']);

        if ($context['is_caretaker']) {
            if (! $hasGlobalPermission) {
                // Strictly filter to ONLY assigned tasks if no global permission
                $query->where('assigned_to', $context['user']->id);
            } else if ($context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
                $query->whereIn('property_id', $assignedPropertyIds);
            }
        }

        if ($request->has('property_id')) {
            $query->where('property_id', $request->property_id);
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($requests);
    }

    /**
     * Get maintenance summary for the dashboard.
     */
    public function summary(Request $request)
    {
        $context = $this->resolveLandlordContext($request);
        
        $hasGlobalPermission = $context['is_caretaker'] 
            ? (bool) ($context['assignment']->can_manage_maintenance ?? false)
            : true;

        $baseQuery = MaintenanceRequest::where('landlord_id', $context['landlord_id']);

        if ($context['is_caretaker']) {
            if (! $hasGlobalPermission) {
                // Only see stats for their own assignments
                $baseQuery->where('assigned_to', $context['user']->id);
            } else if ($context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
                $baseQuery->whereIn('property_id', $assignedPropertyIds);
            }
        }

        if ($request->has('property_id')) {
            $baseQuery->where('property_id', $request->property_id);
        }

        // OPTIMIZATION: Combine all counts into one query
        $statsRaw = (clone $baseQuery)
            ->selectRaw("
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN status = 'completed' AND DATE(resolved_at) = CURRENT_DATE THEN 1 END) as completed_today
            ")
            ->first();

        $assignedToMe = MaintenanceRequest::where('assigned_to', $context['user']->id)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => (int) $statsRaw->total,
                'pending' => (int) $statsRaw->pending,
                'in_progress' => (int) $statsRaw->in_progress,
                'completed_today' => (int) $statsRaw->completed_today,
                'assigned_to_me' => $assignedToMe,
            ],
        ]);
    }

    /**
     * Update maintenance request status (Landlord/Caretaker)
     */
    public function updateStatus(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        
        $maintenanceRequest = MaintenanceRequest::where('landlord_id', $context['landlord_id'])
            ->findOrFail($id);

        $hasGlobalPermission = $context['is_caretaker'] 
            ? (bool) ($context['assignment']->can_manage_maintenance ?? false)
            : true;

        if ($context['is_caretaker']) {
            if (! $hasGlobalPermission) {
                // If no global permission, user CAN ONLY update if it's assigned to them
                if ($maintenanceRequest->assigned_to !== $context['user']->id) {
                    return response()->json(['message' => 'You can only update tasks assigned to you.'], 403);
                }
            } else if ($context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
                if (! in_array($maintenanceRequest->property_id, $assignedPropertyIds)) {
                    return response()->json(['message' => 'Unauthorized access to this property'], 403);
                }
            }
        }

        $request->validate([
            'status' => 'required|in:pending,in_progress,completed,cancelled',
            'notes' => 'nullable|string',
        ]);

        $oldStatus = $maintenanceRequest->status;
        $maintenanceRequest->status = $request->status;
        if ($request->status === 'completed') {
            $maintenanceRequest->resolved_at = now();
        }
        $maintenanceRequest->save();

        $updateContent = "Status changed from " . ucfirst($oldStatus) . " to " . ucfirst($request->status);
        if ($request->status === 'completed') $updateContent = "Maintenance task resolved";
        if ($request->status === 'cancelled') $updateContent = "Maintenance task cancelled";

        $update = $this->logUpdate($maintenanceRequest, 'status_change', $updateContent, $request->notes, $oldStatus, $request->status);
        broadcast(new MaintenanceStatusChanged($maintenanceRequest, $update));

        // BROADCAST COUNTERS
        $this->counterService->broadcastCounters((int) $context['landlord_id']);
        if ($maintenanceRequest->tenant_id) {
            $this->counterService->broadcastCounters((int) $maintenanceRequest->tenant_id);
        }

        return response()->json([
            'success' => true,
            'message' => 'Maintenance request status updated',
            'data' => $maintenanceRequest->load('assignedTo:id,first_name,last_name'),
        ]);
    }

    /**
     * Assign a maintenance request to a worker (Landlord/Caretaker)
     */
    public function assign(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_manage_maintenance');

        $maintenanceRequest = MaintenanceRequest::where('landlord_id', $context['landlord_id'])
            ->findOrFail($id);

        $request->validate([
            'worker_id' => 'required|exists:users,id',
        ]);

        // Verify worker is assigned to this property and has maintenance permission
        $workerAssignment = \App\Models\CaretakerAssignment::where('caretaker_id', $request->worker_id)
            ->where('landlord_id', $context['landlord_id'])
            ->where('can_manage_maintenance', true)
            ->whereHas('properties', function ($q) use ($maintenanceRequest) {
                $q->where('properties.id', $maintenanceRequest->property_id);
            })
            ->first();

        if (! $workerAssignment && $request->worker_id != $context['landlord_id']) {
            return response()->json([
                'success' => false,
                'message' => 'The selected worker is not authorized to handle maintenance for this property.',
            ], 403);
        }

        $oldStatus = $maintenanceRequest->status;
        $maintenanceRequest->assigned_to = $request->worker_id;
        $maintenanceRequest->assigned_at = now();

        if ($maintenanceRequest->status === 'pending') {
            $maintenanceRequest->status = 'in_progress';
        }

        $maintenanceRequest->save();

        $worker = \App\Models\User::find($request->worker_id);
        $updateContent = "Assigned to " . $worker->full_name;
        
        $update = $this->logUpdate($maintenanceRequest, 'assignment', $updateContent, null, $oldStatus, $maintenanceRequest->status);
        broadcast(new MaintenanceStatusChanged($maintenanceRequest, $update));

        // BROADCAST COUNTERS
        $this->counterService->broadcastCounters((int) $context['landlord_id']);
        $this->counterService->broadcastCounters((int) $request->worker_id);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance request assigned successfully',
            'data' => $maintenanceRequest->load('assignedTo:id,first_name,last_name'),
        ]);
    }

    /**
     * Mark a maintenance request as completed (Landlord/Caretaker)
     */
    public function complete(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        
        $maintenanceRequest = MaintenanceRequest::where('landlord_id', $context['landlord_id'])
            ->findOrFail($id);

        $hasGlobalPermission = $context['is_caretaker'] 
            ? (bool) ($context['assignment']->can_manage_maintenance ?? false)
            : true;

        // Security check for caretakers
        if ($context['is_caretaker']) {
            if (! $hasGlobalPermission && $maintenanceRequest->assigned_to !== $context['user']->id) {
                return response()->json(['message' => 'You are not assigned to this request.'], 403);
            }
            
            if ($hasGlobalPermission && $context['assignment']) {
                 $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
                 if (! in_array($maintenanceRequest->property_id, $assignedPropertyIds)) {
                     return response()->json(['message' => 'Unauthorized access to this property'], 403);
                 }
            }
        }

        $oldStatus = $maintenanceRequest->status;
        $maintenanceRequest->status = 'completed';
        $maintenanceRequest->resolved_at = now();
        $maintenanceRequest->save();

        $update = $this->logUpdate($maintenanceRequest, 'status_change', 'Maintenance task completed', $request->notes, $oldStatus, 'completed');
        broadcast(new MaintenanceStatusChanged($maintenanceRequest, $update));

        // BROADCAST COUNTERS
        $this->counterService->broadcastCounters((int) $context['landlord_id']);
        if ($maintenanceRequest->tenant_id) {
            $this->counterService->broadcastCounters((int) $maintenanceRequest->tenant_id);
        }

        return response()->json([
            'success' => true,
            'message' => 'Maintenance request marked as completed',
            'data' => $maintenanceRequest->load('assignedTo:id,first_name,last_name'),
        ]);
    }

    /**
     * Helper to log maintenance updates
     */
    private function logUpdate($request, $type, $content, $notes = null, $from = null, $to = null)
    {
        return MaintenanceUpdate::create([
            'maintenance_request_id' => $request->id,
            'user_id' => Auth::id(),
            'update_type' => $type,
            'content' => $content,
            'notes' => $notes,
            'status_from' => $from,
            'status_to' => $to,
        ]);
    }
}
