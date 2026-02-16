<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceRequest;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class MaintenanceRequestController extends Controller
{
    /**
     * Store a new maintenance request from a tenant.
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'priority' => 'required|in:low,normal,high',
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
            'images' => !empty($imagePaths) ? json_encode($imagePaths) : null,
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
            ->with(['property:id,title'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $requests
        ]);
    }
}
