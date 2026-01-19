<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use Illuminate\Http\Request;
use App\Models\Booking;
use App\Models\Room;
use App\Models\TenantProfile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class BookingController extends Controller
{
    use ResolvesLandlordAccess;

    /**
     * Get all bookings for the authenticated landlord
     */
    public function index(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_bookings');

            $query = Booking::with(['property', 'tenant', 'landlord', 'room'])
                ->where('landlord_id', $context['landlord_id']);

            // If caretaker, filter by assigned properties only
            if ($context['is_caretaker'] && $context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
                Log::info('Caretaker booking filter', [
                    'caretaker_id' => $context['user']->id,
                    'assigned_property_ids' => $assignedPropertyIds,
                    'landlord_id' => $context['landlord_id']
                ]);
                $query->whereIn('property_id', $assignedPropertyIds);
            }

            // Filter by status if provided
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $bookings = $query->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($booking) {
                    return [
                        'id' => $booking->id,
                        'guestName' => $booking->tenant->first_name . ' ' . $booking->tenant->last_name,
                        'email' => $booking->tenant->email,
                        'phone' => $booking->tenant->phone ?? 'N/A',
                        'roomType' => $booking->room ? $booking->room->room_type : 'N/A',
                        'roomNumber' => $booking->room ? $booking->room->room_number : 'N/A',
                        'propertyTitle' => $booking->property->title,
                        'checkIn' => $booking->start_date,
                        'checkOut' => $booking->end_date,
                        'duration' => $booking->total_months . ' month' . ($booking->total_months > 1 ? 's' : ''),
                        'amount' => (float) $booking->total_amount,
                        'monthlyRent' => (float) $booking->monthly_rent,
                        'status' => $booking->status,
                        'paymentStatus' => $booking->payment_status,
                        'bookingReference' => $booking->booking_reference,
                        'notes' => $booking->notes,
                        'created_at' => $booking->created_at,
                    ];
                });

            return response()->json($bookings, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch bookings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new booking (tenant books a room)
     */
    public function store(Request $request)
    {
        try {
            Log::info('Booking request received', $request->all());

            $validated = $request->validate([
                'room_id' => 'required|exists:rooms,id',
                'start_date' => 'required|date|after_or_equal:today',
                'end_date' => 'required|date|after:start_date',
                'notes' => 'nullable|string'
            ]);

            // Get room and verify it's available
            $room = Room::with('property')->findOrFail($validated['room_id']);

            Log::info('Room found', [
                'room_id' => $room->id,
                'status' => $room->status,
                'monthly_rate' => $room->monthly_rate
            ]);

            // Check if room has available slots
            if (!$room->isAvailable() || $room->available_slots <= 0) {
                return response()->json([
                    'message' => 'Room is not available for booking',
                    'room_status' => $room->status,
                    'occupied_slots' => $room->occupied,
                    'total_capacity' => $room->capacity,
                    'available_slots' => $room->available_slots
                ], 422);
            }

            // Calculate end date and total amount (use days and prorate logic)
            $startDate = \Carbon\Carbon::parse($validated['start_date']);
            $endDate = \Carbon\Carbon::parse($validated['end_date']);

            // Inclusive days count
            $days = $startDate->diffInDays($endDate) + 1;

            // Enforce minimum stay if configured on the room
            $minStay = isset($room->min_stay_days) ? (int) $room->min_stay_days : null;
            if ($minStay && $days < $minStay) {
                return response()->json([
                    'message' => 'Minimum stay requirement not met',
                    'errors' => ['min_stay_days' => ["Minimum stay is {$minStay} days"]]
                ], 422);
            }

            // Use room pricing logic to calculate prorated amounts and breakdown
            $priceResult = $room->calculatePriceForDays($days);
            $totalAmount = $priceResult['total'];
            // derive total months from breakdown if available
            $totalMonths = isset($priceResult['breakdown']['months']) ? (int) $priceResult['breakdown']['months'] : intdiv($days, ($room->prorate_base ?? 30));

            // Generate unique booking reference
            $bookingReference = 'BK-' . strtoupper(Str::random(8));

            // Create booking
            $booking = Booking::create([
                'property_id' => $room->property_id,
                'tenant_id' => Auth::id(),
                'landlord_id' => $room->property->landlord_id,
                'room_id' => $room->id,
                'booking_reference' => $bookingReference,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'total_months' => $totalMonths,
                'monthly_rent' => $room->monthly_rate,
                'total_amount' => $totalAmount,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'notes' => $validated['notes'] ?? null
            ]);

            Log::info('Booking created successfully', ['booking_id' => $booking->id]);

            return response()->json([
                'message' => 'Booking created successfully',
                'booking' => $booking->load(['property', 'tenant', 'room'])
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed', ['errors' => $e->errors()]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('Room not found', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Room not found',
                'error' => $e->getMessage()
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to create booking', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Failed to create booking',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update booking status (landlord confirms/rejects/completes/cancels)
     * ✅ HANDLES: confirmed, completed, partial-completed, cancelled
     * ✅ UPDATES: Room status + Tenant profile + Refunds
     */
    public function updateStatus(Request $request, $id)
    {
        DB::beginTransaction();

        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_bookings');

            $booking = Booking::with(['tenant.tenantProfile', 'room.property'])
                ->where('landlord_id', $context['landlord_id'])
                ->findOrFail($id);

            $validated = $request->validate([
                'status' => 'required|in:pending,confirmed,cancelled,completed,partial-completed',
                'cancellation_reason' => 'required_if:status,cancelled',
                'refund_amount' => 'nullable|numeric|min:0',
                'should_refund' => 'nullable|boolean'
            ]);

            $oldStatus = $booking->status;
            $newStatus = $validated['status'];
            $booking->status = $newStatus;

            // ========================================
            // 1. CONFIRMED - Assign tenant to room + Activate tenant
            // ========================================
            if ($newStatus === 'confirmed') {
                // Check if room has available slots
                if ($booking->room->available_slots <= 0) {
                    throw new \Exception('Room is fully occupied and cannot accommodate more tenants');
                }

                // Assign tenant to room using the new system
                $booking->room->assignTenant($booking->tenant_id, $booking->start_date);

                // Create or update tenant profile
                $booking->tenant->tenantProfile()->updateOrCreate(
                    ['user_id' => $booking->tenant_id],
                    [
                        'move_in_date' => $booking->start_date,
                        'status' => 'active',
                        'booking_id' => $booking->id
                    ]
                );

                Log::info('Booking confirmed - Tenant assigned to room', [
                    'booking_id' => $booking->id,
                    'tenant_id' => $booking->tenant_id,
                    'room_id' => $booking->room_id,
                    'occupied_slots' => $booking->room->occupied,
                    'available_slots' => $booking->room->available_slots
                ]);

                $booking->room->property->updateAvailableRooms();
            }

            // ========================================
            // 2. COMPLETED or PARTIAL-COMPLETED - Keep room occupied
            // ========================================
            if (in_array($newStatus, ['completed', 'partial-completed'])) {
                // ✅ KEEP the room OCCUPIED (tenant is still there)
                // The room should only become available when tenant moves out
                // or booking is cancelled
                
                Log::info('Booking marked as completed', [
                    'booking_id' => $booking->id,
                    'status' => $newStatus,
                    'room_still_occupied' => true
                ]);

                // Room stays occupied - no changes needed
            }

            // ========================================
            // 3. CANCELLED - Free room + Handle refunds
            // ========================================
            if ($newStatus === 'cancelled') {
                $booking->cancelled_at = now();
                $booking->cancellation_reason = $validated['cancellation_reason'] ?? null;

                // Handle refund if requested
                if ($validated['should_refund'] ?? false) {
                    $booking->refund_amount = $validated['refund_amount'] ?? 0;
                    $booking->refund_processed_at = now();
                    
                    // Auto-update payment status to refunded
                    $booking->payment_status = 'refunded';
                    
                    Log::info('Refund processed for cancelled booking', [
                        'booking_id' => $booking->id,
                        'refund_amount' => $booking->refund_amount
                    ]);
                }

                // Remove tenant from room using the proper method
                $booking->room->removeTenant($booking->tenant_id);

                // Update tenant profile if exists
                $tenantProfile = TenantProfile::where('user_id', $booking->tenant_id)
                    ->where('booking_id', $booking->id)
                    ->first();
                    
                if ($tenantProfile) {
                    $tenantProfile->update([
                        'status' => 'inactive',
                        'move_out_date' => now()->format('Y-m-d')
                    ]);

                    Log::info('Tenant profile deactivated due to cancellation', [
                        'tenant_profile_id' => $tenantProfile->id,
                        'booking_id' => $booking->id
                    ]);
                }

                Log::info('Booking cancelled - Tenant removed from room', [
                    'booking_id' => $booking->id,
                    'tenant_id' => $booking->tenant_id,
                    'room_id' => $booking->room_id
                ]);

                $booking->room->property->updateAvailableRooms();
            }

            $booking->save();

            DB::commit();

            // Load fresh data with tenant name for room card
            $booking->load(['property', 'tenant.tenantProfile', 'room.currentTenant']);

            return response()->json([
                'message' => 'Booking status updated successfully',
                'booking' => $booking,
                'room_updated' => true,
                'tenant_name' => $booking->tenant->first_name . ' ' . $booking->tenant->last_name
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update booking status', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to update booking status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update payment status
     * AUTO-UPGRADE: partial-completed → completed when payment becomes 'paid'
     */
    public function updatePaymentStatus(Request $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_bookings');

            $booking = Booking::where('landlord_id', $context['landlord_id'])->findOrFail($id);

            $validated = $request->validate([
                'payment_status' => 'required|in:unpaid,partial,paid,refunded'
            ]);

            $oldPaymentStatus = $booking->payment_status;
            $oldBookingStatus = $booking->status;
            $booking->payment_status = $validated['payment_status'];
            
            $statusUpgraded = false;

            // AUTO-UPGRADE: If booking is 'partial-completed' and payment becomes 'paid', upgrade to 'completed'
            if ($booking->status === 'partial-completed' && $validated['payment_status'] === 'paid') {
                $booking->status = 'completed';
                $statusUpgraded = true;
                
                Log::info('Booking auto-upgraded from partial-completed to completed', [
                    'booking_id' => $booking->id,
                    'old_status' => $oldBookingStatus,
                    'new_status' => 'completed',
                    'payment_status' => 'paid'
                ]);
            }

            $booking->save();

            return response()->json([
                'message' => $statusUpgraded 
                    ? 'Payment updated and booking upgraded to completed!' 
                    : 'Payment status updated successfully',
                'booking' => $booking,
                'status_upgraded' => $statusUpgraded
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update payment status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get booking statistics
     */
    public function getStats(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_bookings');

            $baseQuery = Booking::where('landlord_id', $context['landlord_id']);
            
            // If caretaker, filter by assigned properties only
            if ($context['is_caretaker'] && $context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
                $baseQuery->whereIn('property_id', $assignedPropertyIds);
            }

            $total = (clone $baseQuery)->count();
            $confirmed = (clone $baseQuery)->where('status', 'confirmed')->count();
            $pending = (clone $baseQuery)->where('status', 'pending')->count();
            $completed = (clone $baseQuery)
                ->whereIn('status', ['completed', 'partial-completed'])
                ->count();

            return response()->json([
                'total' => $total,
                'confirmed' => $confirmed,
                'pending' => $pending,
                'completed' => $completed
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single booking details
     */
    public function show(Request $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_bookings');

            $query = Booking::with(['property', 'tenant.tenantProfile', 'landlord', 'room'])
                ->where('landlord_id', $context['landlord_id']);

            // If caretaker, filter by assigned properties only
            if ($context['is_caretaker'] && $context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
                $query->whereIn('property_id', $assignedPropertyIds);
            }

            $booking = $query->findOrFail($id);

            return response()->json($booking, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Booking not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }
}