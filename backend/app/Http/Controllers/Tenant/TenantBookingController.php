<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\RequestMoveOutNoticeRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\Room;
use App\Models\TenantProfile;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TenantBookingController extends Controller
{
    /**
     * Get all bookings for the authenticated tenant (MyBookings)
     */
    public function index(Request $request)
    {
        try {
            $query = Booking::with(['property.images', 'landlord', 'room', 'review'])
                ->where('tenant_id', Auth::id());

            // Filter by status if provided
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $bookings = $query->orderBy('created_at', 'desc')->get();

            return response()->json(\App\Http\Resources\BookingResource::collection($bookings)->resolve(), 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch bookings',
                'error' => $e->getMessage(),
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
                try {
                    $booking->room->property->updateAvailableRooms();
                } catch (\Exception $e) {
                }
            }

            // Update tenant profile if exists
            $tenantProfile = TenantProfile::where('user_id', $booking->tenant_id)
                ->where('booking_id', $booking->id)
                ->first();

            if ($tenantProfile) {
                $tenantProfile->update([
                    'status' => 'inactive',
                    'move_out_date' => now()->format('Y-m-d'),
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
            $booking = Booking::with(['property.images', 'landlord', 'room.images', 'room.amenities', 'addons', 'maintenanceRequests'])
                ->where('tenant_id', Auth::id())
                ->findOrFail($id);

            return response()->json((new \App\Http\Resources\BookingResource($booking))->resolve(), 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Booking not found',
                'error' => $e->getMessage(),
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

            // If a rent invoice already exists for this booking, return it.
            // Explicitly exclude reservation fee invoices so we don't confuse them with the rent invoice.
            $existing = \App\Models\Invoice::where('booking_id', $booking->id)
                ->where('description', 'not like', 'Reservation Fee%')
                ->first();
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
            $cycleStart = $startDate->copy()->addMonths($months)->startOfDay();

            // Base monthly amount (use booking.monthly_rent for tenant-specific rent)
            $monthlyDue = (float) ($booking->monthly_rent ?? $booking->room->monthly_rate ?? 0);

            // Partial calculation: if tenant has exceeded the cycle start (i.e., today is after cycle start), charge partial extra days
            $daysInMonth = 30; // Hardcoded to 30
            $daysOverdue = 0;
            if ($today->greaterThan($cycleStart)) {
                $daysOverdue = max(0, (int) $cycleStart->diffInDays($today, false));
            }

            $partialCharge = 0.0;
            if ($daysOverdue > 0) {
                $ratePerDay = $booking->room->daily_rate !== null ? (float) $booking->room->daily_rate : ($monthlyDue / max(1, $daysInMonth));
                $partialCharge = round($daysOverdue * $ratePerDay, 2);
            }

            $totalAmount = round($monthlyDue + $partialCharge, 2);

            $amountCents = (int) round($totalAmount * 100);

            $reference = 'INV-'.date('Ymd').'-'.strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));

            $invoice = \App\Models\Invoice::create([
                'reference' => $reference,
                'landlord_id' => $booking->landlord_id,
                'property_id' => $booking->property_id,
                'booking_id' => $booking->id,
                'tenant_id' => $booking->tenant_id,
                'description' => 'Invoice for booking '.$booking->booking_reference,
                'amount_cents' => $amountCents,
                'currency' => 'PHP',
                'status' => 'pending',
                'issued_at' => now(),
                'metadata' => [
                    'monthly_due' => $monthlyDue,
                    'partial_days' => $daysOverdue,
                    'partial_charge' => $partialCharge,
                    'days_in_month' => $daysInMonth,
                    'cycle_start' => $cycleStart->format('Y-m-d'),
                ],
            ]);

            return response()->json(['success' => true, 'data' => $invoice], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Booking not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to create invoice', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Tenant requests move-out and sets an agreed departure date.
     * PATCH /api/tenant/bookings/{id}/request-move-out
     */
    public function requestMoveOutNotice(RequestMoveOutNoticeRequest $request, $id)
    {
        DB::beginTransaction();
        try {
            $booking = Booking::with(['property', 'room', 'landlord'])
                ->where('tenant_id', Auth::id())
                ->findOrFail($id);

            if (in_array($booking->status, ['cancelled', 'completed', 'partial-completed'], true)) {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'Move-out notice is only allowed for active stays.',
                ], 422);
            }

            if (! in_array($booking->status, ['confirmed', 'active'], true)) {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'Booking must be confirmed before requesting move-out.',
                ], 422);
            }

            $moveOutDate = Carbon::parse($request->validated()['move_out_date'])->startOfDay();
            if ($booking->start_date && $moveOutDate->lt(Carbon::parse($booking->start_date)->startOfDay())) {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'Move-out date cannot be earlier than your check-in date.',
                ], 422);
            }

            $booking->notice_given_at = now();
            $booking->end_date = $moveOutDate->toDateString();

            // If recurring billing is already queued after move-out date, stop future generations.
            if ($booking->next_billing_date && Carbon::parse($booking->next_billing_date)->gt($moveOutDate)) {
                $booking->next_billing_date = null;
            }

            $notes = trim((string) ($booking->notes ?? ''));
            $reason = trim((string) ($request->validated()['reason'] ?? ''));
            if ($reason !== '') {
                $noticeLine = 'Move-out notice: '.$reason;
                $booking->notes = $notes === '' ? $noticeLine : ($notes."\n".$noticeLine);
            }

            $booking->save();
            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'booking' => (new BookingResource($booking))->resolve(),
                    'notice' => [
                        'notice_given_at' => optional($booking->notice_given_at)->toISOString(),
                        'move_out_date' => optional($booking->end_date)->format('Y-m-d'),
                    ],
                ],
                'message' => 'Move-out request submitted successfully.',
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Booking not found.',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Tenant move-out notice request failed', [
                'booking_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Failed to submit move-out request.',
            ], 500);
        }
    }
}
