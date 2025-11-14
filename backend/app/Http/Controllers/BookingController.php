<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Booking;
use App\Models\Room;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class BookingController extends Controller
{
    /**
     * Get all bookings for the authenticated landlord
     */
    public function index(Request $request)
    {
        try {
            $query = Booking::with(['property', 'tenant', 'landlord', 'room'])
                ->where('landlord_id', Auth::id());

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
                        'roomType' => $booking->room ? $booking->room->type : 'N/A',
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
            $validated = $request->validate([
                'room_id' => 'required|exists:rooms,id',
                'start_date' => 'required|date|after_or_equal:today',
                'total_months' => 'required|integer|min:1',
                'notes' => 'nullable|string'
            ]);

            // Get room and verify it's available
            $room = Room::with('property')->findOrFail($validated['room_id']);
            
            if ($room->status !== 'available') {
                return response()->json([
                    'message' => 'Room is not available for booking'
                ], 422);
            }

            // Calculate end date and total amount
            $startDate = \Carbon\Carbon::parse($validated['start_date']);
            $endDate = $startDate->copy()->addMonths($validated['total_months']);
            $totalAmount = $room->monthly_rate * $validated['total_months'];

            // Generate unique booking reference
            $bookingReference = 'BK-' . strtoupper(Str::random(8));

            // Create booking
            $booking = Booking::create([
                'property_id' => $room->property_id,
                'tenant_id' => Auth::id(),
                'landlord_id' => $room->property->landlord_id,
                'room_id' => $room->id,
                'booking_reference' => $bookingReference,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'total_months' => $validated['total_months'],
                'monthly_rent' => $room->monthly_rate,
                'total_amount' => $totalAmount,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'notes' => $validated['notes'] ?? null
            ]);

            return response()->json([
                'message' => 'Booking created successfully',
                'booking' => $booking->load(['property', 'tenant', 'room'])
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create booking',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update booking status (landlord confirms/rejects)
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $booking = Booking::where('landlord_id', Auth::id())->findOrFail($id);

            $validated = $request->validate([
                'status' => 'required|in:pending,confirmed,cancelled,completed,rejected',
                'cancellation_reason' => 'required_if:status,cancelled,rejected'
            ]);

            $booking->status = $validated['status'];

            // If confirmed, mark room as occupied
            if ($validated['status'] === 'confirmed') {
                $booking->room->update([
                    'status' => 'occupied',
                    'current_tenant_id' => $booking->tenant_id
                ]);
                $booking->room->property->updateAvailableRooms();
            }

            // If cancelled or rejected
            if (in_array($validated['status'], ['cancelled', 'rejected'])) {
                $booking->cancelled_at = now();
                $booking->cancellation_reason = $validated['cancellation_reason'] ?? null;
                
                // Make room available again
                $booking->room->update([
                    'status' => 'available',
                    'current_tenant_id' => null
                ]);
                $booking->room->property->updateAvailableRooms();
            }

            // If completed, make room available
            if ($validated['status'] === 'completed') {
                $booking->room->update([
                    'status' => 'available',
                    'current_tenant_id' => null
                ]);
                $booking->room->property->updateAvailableRooms();
            }

            $booking->save();

            return response()->json([
                'message' => 'Booking status updated successfully',
                'booking' => $booking->load(['property', 'tenant', 'room'])
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update booking status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update payment status
     */
    public function updatePaymentStatus(Request $request, $id)
    {
        try {
            $booking = Booking::where('landlord_id', Auth::id())->findOrFail($id);

            $validated = $request->validate([
                'payment_status' => 'required|in:unpaid,partial,paid,refunded'
            ]);

            $booking->payment_status = $validated['payment_status'];
            $booking->save();

            return response()->json([
                'message' => 'Payment status updated successfully',
                'booking' => $booking
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
    public function getStats()
    {
        try {
            $total = Booking::where('landlord_id', Auth::id())->count();
            $confirmed = Booking::where('landlord_id', Auth::id())->where('status', 'confirmed')->count();
            $pending = Booking::where('landlord_id', Auth::id())->where('status', 'pending')->count();
            $completed = Booking::where('landlord_id', Auth::id())->where('status', 'completed')->count();

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
    public function show($id)
    {
        try {
            $booking = Booking::with(['property', 'tenant', 'landlord', 'room'])
                ->where('landlord_id', Auth::id())
                ->findOrFail($id);

            return response()->json($booking, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Booking not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }
}