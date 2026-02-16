<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Booking;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\TenantProfile;
use App\Models\Room;

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
     * Allow tenant to cancel their own booking.
     * PATCH /api/tenant/bookings/{id}/cancel
     * Body: { cancellation_reason?: string }
     */
    public function cancel(Request $request, $id)
    {
        DB::beginTransaction();
        try {
            $booking = Booking::with(['room', 'tenant.tenantProfile'])
                ->where('tenant_id', Auth::id())
                ->findOrFail($id);

            // Only allow cancellation for non-completed bookings
            if (in_array($booking->status, ['completed', 'partial-completed', 'cancelled'])) {
                return response()->json(['message' => 'Cannot cancel this booking'], 422);
            }

            $booking->status = 'cancelled';
            $booking->cancelled_at = now();
            $booking->cancellation_reason = $request->input('cancellation_reason');

            // If tenant was already assigned to room, remove them
            if ($booking->room) {
                try {
                    $booking->room->removeTenant($booking->tenant_id);
                } catch (\Exception $e) {
                    Log::warning('Failed to remove tenant from room during tenant cancellation', ['err' => $e->getMessage()]);
                }
                // update property availability
                try { $booking->room->property->updateAvailableRooms(); } catch (\Exception $e) {}
            }

            // Update tenant profile if exists
            $tenantProfile = TenantProfile::where('user_id', $booking->tenant_id)
                ->where('booking_id', $booking->id)
                ->first();

            if ($tenantProfile) {
                $tenantProfile->update([
                    'status' => 'inactive',
                    'move_out_date' => now()->format('Y-m-d')
                ]);
            }

            $booking->save();
            DB::commit();

            return response()->json(['message' => 'Booking cancelled', 'booking' => $booking], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Tenant cancel booking failed', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Failed to cancel booking', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get single booking details
     */
    public function show($id)
    {
        try {
            $booking = Booking::with(['property.images', 'landlord', 'room', 'addons', 'maintenanceRequests'])
                ->where('tenant_id', Auth::id())
                ->findOrFail($id);

            // Map property images
            $property = $booking->property;
            $images = [];
            if ($property && $property->images) {
                $images = $property->images->map(function ($image) {
                    return [
                        'id' => $image->id,
                        'image_url' => $image->image_url,
                        'is_primary' => $image->is_primary ?? false,
                    ];
                })->toArray();
            }

            $data = [
                'id' => $booking->id,
                'landlordName' => $booking->landlord->first_name . ' ' . $booking->landlord->last_name,
                'email' => $booking->landlord->email,
                'phone' => $booking->landlord->phone ?? 'N/A',
                'landlord' => [
                    'id' => $booking->landlord->id,
                    'first_name' => $booking->landlord->first_name,
                    'last_name' => $booking->landlord->last_name,
                    'email' => $booking->landlord->email,
                    'phone' => $booking->landlord->phone ?? 'N/A',
                ],
                'roomType' => $booking->room ? $booking->room->type : 'N/A',
                'roomNumber' => $booking->room ? $booking->room->room_number : 'N/A',
                'propertyTitle' => $booking->property->title,
                'property' => [
                    'id' => $property->id,
                    'title' => $property->title,
                    'city' => $property->city,
                    'province' => $property->province,
                    'country' => $property->country,
                    'property_type' => $property->property_type,
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
                'addons' => $booking->addons,
                'maintenance_requests' => $booking->maintenanceRequests
            ];

            return response()->json($data, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Booking not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Tenant: create an invoice for this booking (on-demand)
     * POST /api/tenant/bookings/{id}/invoice
     */
    public function createInvoice(Request $request, $id)
    {
        try {
            $booking = Booking::with(['room', 'property'])
                ->where('tenant_id', Auth::id())
                ->findOrFail($id);

            // Only allow invoice creation for confirmed bookings
            if ($booking->status !== 'confirmed') {
                return response()->json(['message' => 'Invoice can only be created for confirmed bookings'], 422);
            }

            // If an invoice already exists for this booking, return it
            $existing = \App\Models\Invoice::where('booking_id', $booking->id)->first();
            if ($existing) {
                return response()->json(['success' => true, 'data' => $existing], 200);
            }

            // Create an invoice for the current billing cycle.
            // Calculate month start for current billing cycle based on booking start_date.
            $startDate = new \Carbon\Carbon($booking->start_date);
            $today = \Carbon\Carbon::today();

            // Determine how many full months have passed since start_date up to today
            $months = 0;
            $cursor = $startDate->copy();
            while ($cursor->copy()->addMonth()->lessThanOrEqualTo($today)) {
                $months++;
                $cursor->addMonth();
            }

            // cycleStart is the start date for the current billing cycle
            $cycleStart = $startDate->copy()->addMonths($months);

            // Base monthly amount (use booking.monthly_rent for tenant-specific rent)
            $monthlyDue = (float) ($booking->monthly_rent ?? $booking->room->monthly_rate ?? 0);

            // Partial calculation: if tenant has exceeded the cycle start (i.e., today is after cycle start), charge partial extra days
            $daysInMonth = 30; // Hardcoded to 30
            $daysOverdue = 0;
            if ($today->greaterThan($cycleStart)) {
                $daysOverdue = $cycleStart->diffInDays($today);
            }

            $partialCharge = 0.0;
            if ($daysOverdue > 0) {
                $ratePerDay = $booking->room->daily_rate !== null ? (float)$booking->room->daily_rate : ($monthlyDue / max(1, $daysInMonth));
                $partialCharge = round($daysOverdue * $ratePerDay, 2);
            }

            $totalAmount = round($monthlyDue + $partialCharge, 2);

            $amountCents = (int) round($totalAmount * 100);

            $reference = 'INV-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)),0,6));

            $invoice = \App\Models\Invoice::create([
                'reference' => $reference,
                'landlord_id' => $booking->landlord_id,
                'property_id' => $booking->property_id,
                'booking_id' => $booking->id,
                'tenant_id' => $booking->tenant_id,
                'description' => 'Invoice for booking ' . $booking->booking_reference,
                'amount_cents' => $amountCents,
                'currency' => 'PHP',
                'status' => 'pending',
                'issued_at' => now(),
                'metadata' => [
                    'monthly_due' => $monthlyDue,
                    'partial_days' => $daysOverdue,
                    'partial_charge' => $partialCharge,
                    'days_in_month' => $daysInMonth,
                    'cycle_start' => $cycleStart->format('Y-m-d')
                ]
            ]);

            return response()->json(['success' => true, 'data' => $invoice], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Booking not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to create invoice', 'error' => $e->getMessage()], 500);
        }
    }
}