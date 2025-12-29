<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Payment;
use App\Models\Booking;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TenantPaymentController extends Controller
{
    /**
     * Get all payments for the authenticated tenant
     */
    public function index(Request $request)
    {
        try {
            $tenantId = Auth::id();

            $query = Payment::with(['booking.property', 'booking', 'room'])
                ->where('tenant_id', $tenantId);

            // Filter by status if provided
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $payments = $query->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($payment) {
                    $propertyName = 'N/A';
                    if ($payment->booking && $payment->booking->property) {
                        $propertyName = $payment->booking->property->title;
                    } elseif ($payment->room && $payment->room->property) {
                        $propertyName = $payment->room->property->title;
                    }

                    // Map payment status to display format
                    $statusMap = [
                        'paid' => 'Paid',
                        'pending' => 'Pending',
                        'overdue' => 'Overdue',
                        'cancelled' => 'Cancelled'
                    ];

                    // Map payment method to display format
                    $methodMap = [
                        'cash' => 'Cash',
                        'bank_transfer' => 'Bank Transfer',
                        'gcash' => 'GCash',
                        'paymaya' => 'PayMaya',
                        'card' => 'Card'
                    ];

                    // Get booking payment status if booking exists
                    $bookingPaymentStatus = null;
                    $bookingPaymentStatusDisplay = null;
                    if ($payment->booking) {
                        $bookingPaymentStatus = $payment->booking->payment_status;
                        $bookingPaymentStatusMap = [
                            'unpaid' => 'Unpaid',
                            'partial' => 'Partial Paid',
                            'paid' => 'Paid',
                            'refunded' => 'Refunded'
                        ];
                        $bookingPaymentStatusDisplay = $bookingPaymentStatusMap[$bookingPaymentStatus] ?? ucfirst($bookingPaymentStatus);
                    }

                    return [
                        'id' => $payment->id,
                        'propertyName' => $propertyName,
                        'amount' => (float) $payment->amount,
                        'date' => $payment->payment_date ? $payment->payment_date->format('M d, Y') : ($payment->created_at->format('M d, Y')),
                        'dueDate' => $payment->due_date ? $payment->due_date->format('M d, Y') : null,
                        'status' => $statusMap[$payment->status] ?? ucfirst($payment->status),
                        'statusRaw' => $payment->status,
                        'paymentStatus' => $bookingPaymentStatusDisplay, // Booking payment status (Partial Paid, Paid, Refunded)
                        'paymentStatusRaw' => $bookingPaymentStatus,
                        'method' => $methodMap[$payment->payment_method] ?? ucfirst($payment->payment_method ?? 'N/A'),
                        'methodRaw' => $payment->payment_method,
                        'referenceNo' => $payment->reference_number ?? 'N/A',
                        'notes' => $payment->notes,
                        'bookingId' => $payment->booking_id,
                        'roomId' => $payment->room_id,
                        'created_at' => $payment->created_at,
                    ];
                });

            return response()->json($payments, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch payments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payment statistics for tenant
     */
    public function getStats()
    {
        try {
            $tenantId = Auth::id();

            // Total paid this month
            $totalPaidThisMonth = Payment::where('tenant_id', $tenantId)
                ->where('status', 'paid')
                ->whereMonth('payment_date', now()->month)
                ->whereYear('payment_date', now()->year)
                ->sum('amount');

            // Count of paid payments
            $paidCount = Payment::where('tenant_id', $tenantId)
                ->where('status', 'paid')
                ->whereMonth('payment_date', now()->month)
                ->whereYear('payment_date', now()->year)
                ->count();

            // Get next due date from bookings
            $nextDueBooking = Booking::where('tenant_id', $tenantId)
                ->where('status', 'confirmed')
                ->whereIn('payment_status', ['unpaid', 'partial'])
                ->orderBy('start_date', 'asc')
                ->first();

            $nextDueDate = $nextDueBooking ? $nextDueBooking->start_date->format('M d') : null;

            return response()->json([
                'totalPaidThisMonth' => (float) $totalPaidThisMonth,
                'paidCount' => $paidCount,
                'nextDueDate' => $nextDueDate
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch payment stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single payment details
     */
    public function show($id)
    {
        try {
            $payment = Payment::with(['booking.property', 'room'])
                ->where('tenant_id', Auth::id())
                ->findOrFail($id);

            return response()->json($payment, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Payment not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }
}

