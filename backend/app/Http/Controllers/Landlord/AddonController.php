<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;

use Illuminate\Http\Request;
use App\Models\Addon;
use App\Models\Booking;
use App\Models\Property;
use App\Http\Resources\AddonResource;
use App\Services\AddonService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AddonController extends Controller
{
    protected AddonService $addonService;

    public function __construct(AddonService $addonService)
    {
        $this->addonService = $addonService;
    }

    /**
     * Get all addons for a property (Landlord/Caretaker)
     */
    public function index(Request $request, $propertyId)
    {
        try {
            $user = Auth::user();
            
            // Verify ownership or caretaker access
            $property = Property::where('id', $propertyId)
                ->where(function ($query) use ($user) {
                    $query->where('landlord_id', $user->id);
                })
                ->first();

            if (!$property) {
                return response()->json([
                    'message' => 'Property not found or access denied'
                ], 404);
            }

            $addons = Addon::where('property_id', $propertyId)
                ->orderBy('name')
                ->get();

            return response()->json([
                'addons' => AddonResource::collection($addons)->resolve()
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch addons',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new addon for a property (Landlord/Caretaker)
     */
    public function store(Request $request, $propertyId)
    {
        try {
            $user = Auth::user();

            // Verify ownership
            $property = Property::where('id', $propertyId)
                ->where('landlord_id', $user->id)
                ->first();

            if (!$property) {
                return response()->json([
                    'message' => 'Property not found or access denied'
                ], 404);
            }

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string|max:1000',
                'price' => 'required|numeric|min:0',
                'price_type' => 'required|in:one_time,monthly',
                'addon_type' => 'required|in:rental,fee',
                'stock' => 'nullable|integer|min:0',
                'is_active' => 'boolean'
            ]);

            $addon = $this->addonService->createAddon($propertyId, $validated);

            return response()->json([
                'message' => 'Addon created successfully',
                'addon' => (new AddonResource($addon))->resolve()
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create addon',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update an addon (Landlord/Caretaker)
     */
    public function update(Request $request, $propertyId, $addonId)
    {
        try {
            $user = Auth::user();

            // Verify ownership
            $property = Property::where('id', $propertyId)
                ->where('landlord_id', $user->id)
                ->first();

            if (!$property) {
                return response()->json([
                    'message' => 'Property not found or access denied'
                ], 404);
            }

            $addon = Addon::where('id', $addonId)
                ->where('property_id', $propertyId)
                ->firstOrFail();

            $validated = $request->validate([
                'name' => 'string|max:255',
                'description' => 'nullable|string|max:1000',
                'price' => 'numeric|min:0',
                'price_type' => 'in:one_time,monthly',
                'addon_type' => 'in:rental,fee',
                'stock' => 'nullable|integer|min:0',
                'is_active' => 'boolean'
            ]);

            $addon = $this->addonService->updateAddon($addon, $validated);

            return response()->json([
                'message' => 'Addon updated successfully',
                'addon' => (new AddonResource($addon))->resolve()
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update addon',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete an addon (Landlord/Caretaker)
     */
    public function destroy($propertyId, $addonId)
    {
        try {
            $user = Auth::user();

            // Verify ownership
            $property = Property::where('id', $propertyId)
                ->where('landlord_id', $user->id)
                ->first();

            if (!$property) {
                return response()->json([
                    'message' => 'Property not found or access denied'
                ], 404);
            }

            $addon = Addon::where('id', $addonId)
                ->where('property_id', $propertyId)
                ->firstOrFail();

            $this->addonService->deleteAddon($addon);

            return response()->json([
                'message' => 'Addon deleted successfully'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete addon',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get pending addon requests for a property (Landlord/Caretaker)
     */
    public function getPendingRequests($propertyId)
    {
        try {
            $user = Auth::user();

            // Verify ownership
            $property = Property::where('id', $propertyId)
                ->where('landlord_id', $user->id)
                ->first();

            if (!$property) {
                return response()->json([
                    'message' => 'Property not found or access denied'
                ], 404);
            }

            $pendingRequests = DB::table('booking_addons')
                ->join('addons', 'booking_addons.addon_id', '=', 'addons.id')
                ->join('bookings', 'booking_addons.booking_id', '=', 'bookings.id')
                ->join('users', 'bookings.tenant_id', '=', 'users.id')
                ->join('rooms', 'bookings.room_id', '=', 'rooms.id')
                ->where('addons.property_id', $propertyId)
                ->where('booking_addons.status', 'pending')
                ->select([
                    'booking_addons.id as request_id',
                    'booking_addons.booking_id',
                    'booking_addons.addon_id',
                    'booking_addons.quantity',
                    'booking_addons.price_at_booking',
                    'booking_addons.request_note',
                    'booking_addons.created_at as requested_at',
                    'addons.name as addon_name',
                    'addons.price_type',
                    'addons.addon_type',
                    'addons.stock',
                    'users.first_name as tenant_first_name',
                    'users.last_name as tenant_last_name',
                    'users.email as tenant_email',
                    'rooms.room_number'
                ])
                ->orderBy('booking_addons.created_at', 'asc')
                ->get();

            return response()->json([
                'pendingRequests' => $pendingRequests->map(function ($request) {
                    return [
                        'requestId' => $request->request_id,
                        'bookingId' => $request->booking_id,
                        'addonId' => $request->addon_id,
                        'addonName' => $request->addon_name,
                        'quantity' => $request->quantity,
                        'price' => (float) $request->price_at_booking,
                        'priceType' => $request->price_type,
                        'addonType' => $request->addon_type,
                        'stock' => $request->stock,
                        'requestNote' => $request->request_note,
                        'requestedAt' => $request->requested_at,
                        'tenant' => [
                            'name' => $request->tenant_first_name . ' ' . $request->tenant_last_name,
                            'email' => $request->tenant_email
                        ],
                        'roomNumber' => $request->room_number
                    ];
                })
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch pending requests',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve or reject an addon request (Landlord/Caretaker)
     */
    public function handleRequest(Request $request, $bookingId, $addonId)
    {
        try {
            $user = Auth::user();

            $validated = $request->validate([
                'action' => 'required|in:approve,reject',
                'note' => 'nullable|string|max:500'
            ]);

            // Get booking and verify access
            $booking = Booking::where('id', $bookingId)
                ->whereHas('property', function ($query) use ($user) {
                    $query->where('landlord_id', $user->id);
                })
                ->firstOrFail();

            $result = $this->addonService->handleRequest($booking, $addonId, $validated['action'], $validated['note'] ?? null, $user->id);

            return response()->json($result, 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to handle addon request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all active addons across all bookings for a property (Landlord overview)
     */
    public function getActiveAddons($propertyId)
    {
        try {
            $user = Auth::user();

            // Verify ownership
            $property = Property::where('id', $propertyId)
                ->where('landlord_id', $user->id)
                ->first();

            if (!$property) {
                return response()->json([
                    'message' => 'Property not found or access denied'
                ], 404);
            }

            $activeAddons = DB::table('booking_addons')
                ->join('addons', 'booking_addons.addon_id', '=', 'addons.id')
                ->join('bookings', 'booking_addons.booking_id', '=', 'bookings.id')
                ->join('users', 'bookings.tenant_id', '=', 'users.id')
                ->join('rooms', 'bookings.room_id', '=', 'rooms.id')
                ->where('addons.property_id', $propertyId)
                ->whereIn('booking_addons.status', ['active', 'approved'])
                ->where('bookings.status', 'confirmed')
                ->select([
                    'booking_addons.id as request_id',
                    'booking_addons.booking_id',
                    'booking_addons.quantity',
                    'booking_addons.price_at_booking',
                    'booking_addons.status',
                    'booking_addons.approved_at',
                    'addons.name as addon_name',
                    'addons.price_type',
                    'addons.addon_type',
                    'users.name as tenant_name',
                    'rooms.room_number'
                ])
                ->orderBy('booking_addons.approved_at', 'desc')
                ->get();

            // Calculate monthly revenue from addons
            $monthlyRevenue = $activeAddons
                ->where('price_type', 'monthly')
                ->sum(function ($item) {
                    return $item->price_at_booking * $item->quantity;
                });

            return response()->json([
                'activeAddons' => $activeAddons->map(function ($item) {
                    return [
                        'requestId' => $item->request_id,
                        'bookingId' => $item->booking_id,
                        'addonName' => $item->addon_name,
                        'quantity' => $item->quantity,
                        'price' => (float) $item->price_at_booking,
                        'priceType' => $item->price_type,
                        'addonType' => $item->addon_type,
                        'status' => $item->status,
                        'approvedAt' => $item->approved_at,
                        'tenantName' => $item->tenant_name,
                        'roomNumber' => $item->room_number
                    ];
                }),
                'summary' => [
                    'totalActive' => $activeAddons->count(),
                    'monthlyRevenue' => (float) $monthlyRevenue
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch active addons',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
