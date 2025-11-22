<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Booking;
use Illuminate\Support\Facades\Auth;

class TenantBookingController extends Controller
{
    /**
     * Get all bookings for the authenticated tenant (MyBookings)
     */
    public function index(Request $request)
    {
        try {
            $query = Booking::with(['property.images', 'landlord', 'room'])
                ->where('tenant_id', Auth::id());

            // Filter by status if provided
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $bookings = $query->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($booking) {
                    // Get property images
                    $property = $booking->property;
                    $images = [];
                    if ($property && $property->images) {
                        $images = $property->images->map(function ($image) {
                            return [
                                'id' => $image->id,
                                'image_url' => $image->image_url,
                                'is_primary' => $image->is_primary ?? false,
                                'display_order' => $image->display_order ?? 0
                            ];
                        })->toArray();
                    }

                    return [
                        'id' => $booking->id,
                        'landlordName' => $booking->landlord->first_name . ' ' . $booking->landlord->last_name,
                        'email' => $booking->landlord->email,
                        'phone' => $booking->landlord->phone ?? 'N/A',
                        'roomType' => $booking->room ? $booking->room->type : 'N/A',
                        'roomNumber' => $booking->room ? $booking->room->room_number : 'N/A',
                        'propertyTitle' => $booking->property->title,
                        'property' => [
                            'id' => $property->id,
                            'title' => $property->title,
                            'city' => $property->city,
                            'province' => $property->province,
                            'country' => $property->country,
                            'images' => $images
                        ],
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
     * Get single booking details
     */
    public function show($id)
    {
        try {
            $booking = Booking::with(['property', 'landlord', 'room'])
                ->where('tenant_id', Auth::id())
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