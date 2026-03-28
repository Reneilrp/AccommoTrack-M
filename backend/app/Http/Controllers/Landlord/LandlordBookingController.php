<?php

namespace App\Http\Controllers\Landlord;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Permission\ResolvesLandlordAccess;
use App\Http\Requests\Booking\SettleDepositRequest;
use App\Http\Requests\Booking\StoreBookingRequest;
use App\Http\Requests\Booking\UpdatePaymentStatusRequest;
use App\Http\Requests\Booking\UpdateStatusRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\BookingDepositSettlement;
use App\Services\BookingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LandlordBookingController extends Controller
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
                    'landlord_id' => $context['landlord_id'],
                ]);
                $query->whereIn('property_id', $assignedPropertyIds);
            }

            // Filter by property_id if provided
            if ($request->has('property_id') && $request->property_id !== 'all') {
                $query->where('property_id', $request->property_id);
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
                'error' => $e->getMessage(),
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

            $user = $request->user();
            $tenantId = $request->input('tenant_id');

            // If a tenant is logged in and creating a booking, use their ID
            if (! $tenantId && $user && $user->role === 'tenant') {
                $tenantId = $user->id;
            }

            $booking = $this->bookingService->createBooking(
                $request->validated(),
                $tenantId
            );

            // Fetch the reservation invoice if one was generated
            $reservationInvoice = \App\Models\Invoice::where('booking_id', $booking->id)
                ->where('description', 'like', 'Reservation Fee%')
                ->where('status', 'pending')
                ->first();

            return response()->json([
                'message' => 'Booking created successfully',
                'booking' => (new BookingResource($booking->load(['property', 'tenant', 'room'])))->resolve(),
                'reservation_invoice' => $reservationInvoice,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed', ['errors' => $e->errors()]);

            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('Room not found', ['error' => $e->getMessage()]);

            return response()->json([
                'message' => 'Room not found',
                'error' => $e->getMessage(),
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to create booking', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to create booking',
                'error' => $e->getMessage(),
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

            $this->checkPropertyAccess($context, $booking->property_id);

            $result = $this->bookingService->updateStatus(
                $booking,
                $request->validated()
            );

            return response()->json([
                'message' => 'Booking status updated successfully',
                'booking' => (new BookingResource($result['booking']))->resolve(),
                'room_updated' => $result['room_updated'],
                'tenant_name' => $result['tenant_name'],
            ], 200);
        } catch (\DomainException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to update booking status', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to update booking status',
                'error' => $e->getMessage(),
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
            $this->checkPropertyAccess($context, $booking->property_id);

            $result = $this->bookingService->updatePaymentStatus(
                $booking,
                $request->validated()['payment_status']
            );

            return response()->json([
                'message' => $result['completion_blocked']
                    ? 'Payment updated, but booking cannot be completed until deposit is fully settled.'
                    : ($result['status_upgraded']
                    ? 'Payment updated and booking upgraded to completed!'
                    : 'Payment status updated successfully'),
                'booking' => (new BookingResource($result['booking']))->resolve(),
                'status_upgraded' => $result['status_upgraded'],
                'completion_blocked' => $result['completion_blocked'],
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update payment status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Apply deposit settlement (deductions/refund) to a booking.
     */
    public function settleDeposit(SettleDepositRequest $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_bookings');

            $booking = Booking::with(['tenant', 'property', 'room'])
                ->forLandlord($context['landlord_id'])
                ->findOrFail($id);

            $this->checkPropertyAccess($context, $booking->property_id);

            $payload = $request->validated();

            $settlement = DB::transaction(function () use ($booking, $payload, $context) {
                $startingBalance = (float) ($booking->deposit_balance ?? 0);
                $damageFee = round((float) ($payload['damage_fee'] ?? 0), 2);
                $cleaningFee = round((float) ($payload['cleaning_fee'] ?? 0), 2);
                $otherFee = round((float) ($payload['other_fee'] ?? 0), 2);
                $totalDeductions = round($damageFee + $cleaningFee + $otherFee, 2);
                $markRefunded = (bool) ($payload['mark_refunded'] ?? false);

                $appliedDeductions = min($startingBalance, $totalDeductions);
                $excessCharges = max(0, round($totalDeductions - $startingBalance, 2));
                $refundDue = max(0, round($startingBalance - $appliedDeductions, 2));
                $refundPaid = $markRefunded ? $refundDue : 0.0;
                $endingBalance = $markRefunded ? 0.0 : $refundDue;

                $record = BookingDepositSettlement::create([
                    'booking_id' => $booking->id,
                    'settled_by' => $context['user']->id,
                    'starting_balance' => $startingBalance,
                    'damage_fee' => $damageFee,
                    'cleaning_fee' => $cleaningFee,
                    'other_fee' => $otherFee,
                    'total_deductions' => round($appliedDeductions, 2),
                    'excess_charges' => $excessCharges,
                    'refund_due' => $refundDue,
                    'refund_paid' => $refundPaid,
                    'ending_balance' => $endingBalance,
                    'mark_refunded' => $markRefunded,
                    'refund_method' => $markRefunded ? ($payload['refund_method'] ?? null) : null,
                    'refund_reference' => $markRefunded ? ($payload['refund_reference'] ?? null) : null,
                    'note' => $payload['note'] ?? null,
                ]);

                $booking->deposit_balance = $endingBalance;
                $booking->save();

                return $record;
            });

            $booking->refresh();

            return response()->json([
                'success' => true,
                'data' => [
                    'booking_id' => $booking->id,
                    'deposit_balance' => (float) $booking->deposit_balance,
                    'settlement' => [
                        'id' => $settlement->id,
                        'starting_balance' => (float) $settlement->starting_balance,
                        'damage_fee' => (float) $settlement->damage_fee,
                        'cleaning_fee' => (float) $settlement->cleaning_fee,
                        'other_fee' => (float) $settlement->other_fee,
                        'total_deductions' => (float) $settlement->total_deductions,
                        'excess_charges' => (float) $settlement->excess_charges,
                        'refund_due' => (float) $settlement->refund_due,
                        'refund_paid' => (float) $settlement->refund_paid,
                        'ending_balance' => (float) $settlement->ending_balance,
                        'mark_refunded' => (bool) $settlement->mark_refunded,
                        'refund_method' => $settlement->refund_method,
                        'refund_reference' => $settlement->refund_reference,
                        'note' => $settlement->note,
                        'created_at' => optional($settlement->created_at)->toISOString(),
                    ],
                ],
                'message' => 'Deposit settlement recorded successfully.',
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Booking not found.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Failed to settle booking deposit', [
                'booking_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Failed to settle booking deposit.',
            ], 500);
        }
    }

    /**
     * List historical deposit settlements for a booking.
     */
    public function getDepositSettlements(Request $request, $id)
    {
        try {
            $context = $this->resolveLandlordContext($request);
            $this->ensureCaretakerCan($context, 'can_view_bookings');

            $booking = Booking::forLandlord($context['landlord_id'])->findOrFail($id);
            $this->checkPropertyAccess($context, $booking->property_id);

            $history = BookingDepositSettlement::query()
                ->where('booking_id', $booking->id)
                ->orderByDesc('created_at')
                ->get()
                ->map(function (BookingDepositSettlement $record) {
                    return [
                        'id' => $record->id,
                        'starting_balance' => (float) $record->starting_balance,
                        'damage_fee' => (float) $record->damage_fee,
                        'cleaning_fee' => (float) $record->cleaning_fee,
                        'other_fee' => (float) $record->other_fee,
                        'total_deductions' => (float) $record->total_deductions,
                        'excess_charges' => (float) $record->excess_charges,
                        'refund_due' => (float) $record->refund_due,
                        'refund_paid' => (float) $record->refund_paid,
                        'ending_balance' => (float) $record->ending_balance,
                        'mark_refunded' => (bool) $record->mark_refunded,
                        'refund_method' => $record->refund_method,
                        'refund_reference' => $record->refund_reference,
                        'note' => $record->note,
                        'created_at' => optional($record->created_at)->toISOString(),
                    ];
                })
                ->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'booking_id' => $booking->id,
                    'deposit_balance' => (float) ($booking->deposit_balance ?? 0),
                    'settlements' => $history,
                ],
                'message' => 'Deposit settlements fetched successfully.',
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Booking not found.',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Failed to fetch deposit settlements.',
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
                'error' => $e->getMessage(),
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

            return response()->json((new BookingResource($booking))->resolve(), 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Booking not found',
                'error' => $e->getMessage(),
            ], 404);
        }
    }
}
