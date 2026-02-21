<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\Booking;
use App\Models\PaymentTransaction;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TenantPaymentController extends Controller
{
    /**
     * Get all invoices for the authenticated tenant
     */
    public function index(Request $request)
    {
        try {
            $tenantId = Auth::id();

            $query = Invoice::with(['booking.property', 'property', 'booking.room', 'transactions'])
                ->where('tenant_id', $tenantId);

            // Filter by status if provided
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $invoices = $query->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($invoice) {
                    $propertyName = $invoice->property->title ?? ($invoice->booking->property->title ?? 'N/A');
                    $roomNumber = $invoice->booking->room->room_number ?? 'N/A';

                    // Use the latest transaction for method/reference info
                    $lastTx = $invoice->transactions->where('status', 'succeeded')->last();

                    return [
                        'id' => $invoice->id,
                        'propertyName' => $propertyName,
                        'roomNumber' => $roomNumber,
                        'amount' => (float) ($invoice->total_cents ?? $invoice->amount_cents) / 100,
                        'date' => $invoice->issued_at ? $invoice->issued_at->format('M d, Y') : $invoice->created_at->format('M d, Y'),
                        'dueDate' => $invoice->due_date ? $invoice->due_date->format('M d, Y') : '—',
                        'status' => ucfirst($invoice->status),
                        'statusRaw' => $invoice->status,
                        'method' => $lastTx ? ucfirst(str_replace('paymongo_', '', $lastTx->method)) : 'N/A',
                        'referenceNo' => $lastTx->gateway_reference ?? ($invoice->reference ?? 'N/A'),
                        'transactions' => $invoice->transactions->map(function($tx) {
                            return [
                                'id' => $tx->id,
                                'amount' => (float) $tx->amount_cents / 100,
                                'status' => $tx->status,
                                'method' => $tx->method,
                                'date' => $tx->created_at->format('M d, Y H:i')
                            ];
                        })
                    ];
                });

            return response()->json($invoices, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch payment history',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payment statistics for tenant based on Invoices
     */
    public function getStats()
    {
        try {
            $tenantId = Auth::id();

            // Total paid this month (via transactions)
            $totalPaidThisMonthCents = PaymentTransaction::where('tenant_id', $tenantId)
                ->where('status', 'succeeded')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->sum('amount_cents');

            // Count of paid invoices
            $paidCount = Invoice::where('tenant_id', $tenantId)
                ->where('status', 'paid')
                ->whereMonth('updated_at', now()->month)
                ->count();

            // Get next due date from pending invoices
            $nextDueInvoice = Invoice::where('tenant_id', $tenantId)
                ->whereIn('status', ['pending', 'partial'])
                ->whereNotNull('due_date')
                ->orderBy('due_date', 'asc')
                ->first();

            return response()->json([
                'totalPaidThisMonth' => (float) $totalPaidThisMonthCents / 100,
                'paidCount' => $paidCount,
                'nextDueDate' => $nextDueInvoice ? $nextDueInvoice->due_date->format('M d') : 'None'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch payment stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single invoice details
     */
    public function show($id)
    {
        try {
            $invoice = Invoice::with(['booking.property', 'property', 'booking.room', 'transactions'])
                ->where('tenant_id', Auth::id())
                ->findOrFail($id);

            return response()->json($invoice, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Invoice not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }
}

