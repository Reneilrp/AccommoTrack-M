<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;

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

                    $totalCents = $invoice->total_cents ?? $invoice->amount_cents;
                    $paidCents = $invoice->transactions
                        ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
                        ->sum(function($tx) {
                            return $tx->amount_cents - ($tx->refunded_amount_cents ?? 0);
                        });
                    $remainingCents = max(0, $totalCents - $paidCents);

                    return [
                        'id' => $invoice->id,
                        'propertyName' => $propertyName,
                        'roomNumber' => $roomNumber,
                        'amount' => (float) $totalCents / 100,
                        'remainingBalance' => (float) $remainingCents / 100,
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

            // Total paid this month (via transactions), subtracting any refunds
            // We only sum positive transactions to avoid double-counting the negative refund records
            $totalPaidThisMonthCents = PaymentTransaction::where('tenant_id', $tenantId)
                ->where('amount_cents', '>', 0)
                ->whereIn('status', ['succeeded', 'paid', 'partially_refunded', 'refunded'])
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->selectRaw('SUM(amount_cents - refunded_amount_cents) as net_cents')
                ->value('net_cents') ?? 0;

            // Count of active paid/partial invoices this month
            $paidCount = Invoice::where('tenant_id', $tenantId)
                ->whereIn('status', ['paid', 'partial'])
                ->whereMonth('updated_at', now()->month)
                ->whereYear('updated_at', now()->year)
                ->count();

            // Get next due date from pending invoices
            $nextDueInvoice = Invoice::where('tenant_id', $tenantId)
                ->whereIn('status', ['pending', 'partial'])
                ->whereNotNull('due_date')
                ->orderBy('due_date', 'asc')
                ->first();

            // Total outstanding balance - calculate by summing (amount_cents - successful transactions' sum)
            $pendingInvoices = Invoice::with('transactions')
                ->where('tenant_id', $tenantId)
                ->whereIn('status', ['pending', 'partial', 'unpaid', 'overdue'])
                ->get();

            $pendingAmountCents = 0;
            foreach ($pendingInvoices as $inv) {
                $totalPaid = $inv->transactions()
                    ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
                    ->selectRaw('SUM(amount_cents - refunded_amount_cents) as net_cents')
                    ->value('net_cents') ?? 0;
                $pendingAmountCents += max(0, ($inv->total_cents ?? $inv->amount_cents) - $totalPaid);
            }

            return response()->json([
                'totalPaidThisMonth' => (float) $totalPaidThisMonthCents / 100,
                'paidCount' => $paidCount,
                'nextDueDate' => $nextDueInvoice ? $nextDueInvoice->due_date->format('M d') : 'None',
                'pendingAmount' => (float) $pendingAmountCents / 100
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
            $invoice = Invoice::with(['booking.property.landlord', 'property.landlord', 'booking.room', 'transactions'])
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

