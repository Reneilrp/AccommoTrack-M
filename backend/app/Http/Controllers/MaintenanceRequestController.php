<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceRequest;
use App\Models\Booking;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;

class MaintenanceRequestController extends Controller
{
    use ResolvesLandlordAccess;

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
                $path = $image->store('maintenance_requests', 'public');
                $imagePaths[] = $path;
            }
        }

        $maintenanceRequest = MaintenanceRequest::create([
            'tenant_id' => Auth::id(),
            'landlord_id' => $booking->landlord_id,
            'property_id' => $booking->property_id,
            'booking_id' => $booking->id,
            'title' => $request->title,
            'description' => $request->description,
            'priority' => $request->priority,
            'status' => 'pending',
            'images' => !empty($imagePaths) ? $imagePaths : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance request submitted successfully',
            'data' => $maintenanceRequest
        ], 201);
    }

    /**
     * Get maintenance requests for the authenticated tenant.
     */
    public function index()
    {
        $requests = MaintenanceRequest::where('tenant_id', Auth::id())
            ->with(['property:id,title', 'booking.room:id,room_number'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $requests
        ]);
    }

    /**
     * Get maintenance requests for the landlord/caretaker.
     */
    public function indexForLandlord(Request $request)
    {
        $context = $this->resolveLandlordContext($request);
        $this->ensureCaretakerCan($context, 'can_view_rooms'); // Re-using rooms permission for now or add new

        $query = MaintenanceRequest::where('landlord_id', $context['landlord_id'])
            ->with(['property:id,title', 'tenant:id,first_name,last_name', 'booking.room:id,room_number']);

        if ($context['is_caretaker'] && $context['assignment']) {
            $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
            $query->whereIn('property_id', $assignedPropertyIds);
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
     * Update maintenance request status (Landlord/Caretaker)
     */
    public function updateStatus(Request $request, $id)
    {
        $context = $this->resolveLandlordContext($request);
        
        $maintenanceRequest = MaintenanceRequest::where('landlord_id', $context['landlord_id'])
            ->findOrFail($id);

        if ($context['is_caretaker'] && $context['assignment']) {
            $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
            if (!in_array($maintenanceRequest->property_id, $assignedPropertyIds)) {
                return response()->json(['message' => 'Unauthorized access to this property'], 403);
            }
        }

        $request->validate([
            'status' => 'required|in:pending,in_progress,completed,cancelled'
        ]);

        $maintenanceRequest->status = $request->status;
        if ($request->status === 'completed') {
            $maintenanceRequest->resolved_at = now();
        }
        $maintenanceRequest->save();

        return response()->json([
            'success' => true,
            'message' => 'Maintenance request status updated',
            'data' => $maintenanceRequest
        ]);
    }
}
