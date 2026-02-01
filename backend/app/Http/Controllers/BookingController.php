<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Http\Requests\Booking\StoreBookingRequest;
use App\Http\Requests\Booking\UpdateStatusRequest;
use App\Http\Requests\Booking\UpdatePaymentStatusRequest;
use App\Http\Resources\BookingResource;
use App\Services\BookingService;
use Illuminate\Http\Request;
use App\Models\Booking;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class BookingController extends Controller
{
    use ResolvesLandlordAccess;

    protected BookingService $bookingService;

    public function __construct(BookingService $bookingService)
    {
        $this->bookingService = $bookingService;
    }

    /**
     * Get all bookings for the authenticated landlord
     */
    public function index(Request $request)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_bookings');

            $query = Booking::with(['property', 'tenant', 'landlord', 'room'])
                ->forLandlord($context['landlord_id']);

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

            $bookings = $query->orderBy('created_at', 'desc')->get();

            return response()->json(
                BookingResource::collection($bookings)->resolve(),
                200
            );
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
    public function store(StoreBookingRequest $request)
    {
        try {
            Log::info('Booking request received', $request->validated());

            $booking = $this->bookingService->createBooking(
                $request->validated(),
                Auth::id()
            );

            return response()->json([
                'message' => 'Booking created successfully',
                'booking' => new BookingResource($booking->load(['property', 'tenant', 'room']))
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
    public function updateStatus(UpdateStatusRequest $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_bookings');

            $booking = Booking::with(['tenant.tenantProfile', 'room.property'])
                ->forLandlord($context['landlord_id'])
                ->findOrFail($id);

            $result = $this->bookingService->updateStatus(
                $booking,
                $request->validated()
            );

            return response()->json([
                'message' => 'Booking status updated successfully',
                'booking' => new BookingResource($result['booking']),
                'room_updated' => $result['room_updated'],
                'tenant_name' => $result['tenant_name']
            ], 200);
        } catch (\Exception $e) {
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
    public function updatePaymentStatus(UpdatePaymentStatusRequest $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_bookings');

            $booking = Booking::forLandlord($context['landlord_id'])->findOrFail($id);

            $result = $this->bookingService->updatePaymentStatus(
                $booking,
                $request->validated()['payment_status']
            );

            return response()->json([
                'message' => $result['status_upgraded'] 
                    ? 'Payment updated and booking upgraded to completed!' 
                    : 'Payment status updated successfully',
                'booking' => new BookingResource($result['booking']),
                'status_upgraded' => $result['status_upgraded']
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

            $assignedPropertyIds = null;
            if ($context['is_caretaker'] && $context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
            }

            $stats = $this->bookingService->getStats(
                $context['landlord_id'],
                $assignedPropertyIds
            );

            return response()->json($stats, 200);
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
                ->forLandlord($context['landlord_id']);

            // If caretaker, filter by assigned properties only
            if ($context['is_caretaker'] && $context['assignment']) {
                $assignedPropertyIds = $context['assignment']->getAssignedPropertyIds();
                $query->whereIn('property_id', $assignedPropertyIds);
            }

            $booking = $query->findOrFail($id);

            return response()->json(new BookingResource($booking), 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Booking not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }
}