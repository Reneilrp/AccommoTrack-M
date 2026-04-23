<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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

            if ($request->query('archive_filter') === 'archived') {
                $query->where('is_archived', true);
            } elseif ($request->query('archive_filter') === 'active') {
                $query->where('is_archived', false)
                    ->whereNotIn('status', ['cancelled', 'voided']);
            }

            $invoices = $query->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($invoice) {
                    $propertyName = $invoice->property->title ?? ($invoice->booking->property->title ?? 'N/A');
                    $roomNumber = $invoice->booking->room->room_number ?? 'N/A';

                    // Use the latest transaction for method/reference info
                    $lastTx = $invoice->transactions->where('status', 'succeeded')->last();

                    $totalAmount = $invoice->total_cents ?? $invoice->amount_cents;
                    $paidAmount = $invoice->transactions
                        ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
                        ->sum(function ($tx) {
                            return $tx->amount_cents - ($tx->refunded_amount_cents ?? 0);
                        });
                    $remainingBalance = max(0, $totalAmount - $paidAmount);

                    return [
                        'id' => $invoice->id,
                        'invoiceId' => $invoice->id,
                        'invoice_id' => $invoice->id,
                        'invoiceNo' => $invoice->invoice_number,
                        'invoiceNumber' => $invoice->invoice_number,
                        'bookingId' => $invoice->booking_id,
                        'booking_id' => $invoice->booking_id,
                        'propertyName' => $propertyName,
                        'roomNumber' => $roomNumber,
                        'amount' => (float) $totalAmount,
                        'remainingBalance' => (float) $remainingBalance,
                        'date' => $invoice->issued_at ?: $invoice->created_at,
                        'due_date' => $invoice->due_date,
                        'dueDate' => $invoice->due_date,
                        'status' => match ($invoice->status) {
                            'pending_verification' => 'Awaiting Verification',
                            'paid' => 'Paid',
                            'partial' => 'Partially Paid',
                            'overdue' => 'Overdue',
                            'cancelled' => 'Cancelled',
                            'refunded' => 'Refunded',
                            default => ucfirst($invoice->status)
                        },
                        'statusRaw' => $invoice->status,
                        'is_archived' => (bool) $invoice->is_archived,
                        'method' => $lastTx ? ucfirst(str_replace('paymongo_', '', $lastTx->method)) : 'N/A',
                        'referenceNo' => $lastTx->gateway_reference ?? ($invoice->reference ?? 'N/A'),
                        'transactions' => $invoice->transactions->map(function ($tx) {
                            return [
                                'id' => $tx->id,
                                'amount' => (float) $tx->amount_cents,
                                'status' => $tx->status,
                                'method' => $tx->method,
                                'date' => $tx->created_at,
                            ];
                        }),
                    ];
                });

            return response()->json($invoices, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch payment history',
                'error' => $e->getMessage(),
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
            // SQL SUM returns cents, convert to decimal
            $totalPaidThisMonth = (PaymentTransaction::where('tenant_id', $tenantId)
                ->where('amount_cents', '>', 0)
                ->whereIn('status', ['succeeded', 'paid', 'partially_refunded', 'refunded'])
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->selectRaw('SUM(amount_cents - COALESCE(refunded_amount_cents, 0)) as net_cents')
                ->value('net_cents') ?? 0) / 100;

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
                ->where('is_archived', false)
                ->get();

            $pendingAmount = 0;
            foreach ($pendingInvoices as $inv) {
                $totalPaid = $inv->transactions
                    ->filter(fn($tx) => in_array($tx->status, ['succeeded', 'paid', 'partially_refunded', 'pending_offline']))
                    ->sum(fn($tx) => $tx->amount_cents - ($tx->refunded_amount_cents ?? 0));
                $pendingAmount += max(0, ($inv->total_cents ?? $inv->amount_cents) - $totalPaid);
            }

            $totalCredits = \App\Models\TenantCredit::getBalance($tenantId);

            return response()->json([
                'totalPaidThisMonth' => (float) $totalPaidThisMonth,
                'paidCount' => $paidCount,
                'nextDueDate' => $nextDueInvoice ? $nextDueInvoice->due_date->toIso8601String() : null,
                'pendingAmount' => (float) $pendingAmount,
                'totalCredits' => (float) $totalCredits,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch payment stats',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single invoice details
     */
    public function show($id)
    {
        try {
            $invoice = Invoice::with(['booking.property.landlord', 'property.landlord', 'booking.room', 'booking.addons', 'transactions'])
                ->where('tenant_id', Auth::id())
                ->findOrFail($id);

            return response()->json($invoice, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Invoice not found',
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Get payment schedule grouped by month with per-booking room totals.
     */
    public function getBreakdown(Request $request)
    {
        try {
            $tenantId = Auth::id();
            $months = max(1, min((int) $request->query('months', 6), 12));
            $windowEnd = now()->copy()->addMonthsNoOverflow($months)->endOfMonth();

            $invoices = Invoice::with(['booking.room', 'transactions'])
                ->where('tenant_id', $tenantId)
                ->whereNotIn('status', ['cancelled', 'voided'])
                ->where('is_archived', false)
                ->whereNotNull('due_date')
                ->whereDate('due_date', '<=', $windowEnd)
                ->orderBy('due_date', 'asc')
                ->get();

            $monthly = $invoices
                ->groupBy(fn ($invoice) => optional($invoice->due_date)->format('Y-m'))
                ->map(function ($monthInvoices) {
                    $monthTotal = 0;

                    $bookings = $monthInvoices
                        ->groupBy('booking_id')
                        ->map(function ($bookingInvoices) use (&$monthTotal) {
                            $invoice = $bookingInvoices->first();
                            $room = optional($invoice->booking)->room;

                            $totalAmount = $bookingInvoices->sum(function ($item) {
                                return $item->total_cents ?? $item->amount_cents ?? 0;
                            });

                            $paidAmount = $bookingInvoices->sum(function ($item) {
                                return $item->transactions
                                    ->whereIn('status', ['succeeded', 'paid', 'partially_refunded'])
                                    ->sum(function ($tx) {
                                        return $tx->amount_cents - ($tx->refunded_amount_cents ?? 0);
                                    });
                            });

                            $remainingBalance = max(0, $totalAmount - $paidAmount);
                            $monthTotal += $remainingBalance;

                            return [
                                'booking_id' => $invoice->booking_id,
                                'room_number' => $room->room_number ?? 'N/A',
                                'rent' => (float) $totalAmount,
                                'addons' => 0.0,
                                'total' => (float) $remainingBalance,
                                'status' => (string) $invoice->status,
                            ];
                        })
                        ->values();

                    $firstDue = $monthInvoices->sortBy('due_date')->first();

                    return [
                        'month' => optional($firstDue->due_date)->format('F Y'),
                        'due_date' => optional($firstDue->due_date)->format('Y-m-d'),
                        'bookings' => $bookings,
                        'month_total' => (float) $monthTotal,
                    ];
                })
                ->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'upcoming_months' => $monthly,
                ],
                'message' => '',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'data' => [
                    'upcoming_months' => [],
                ],
                'message' => 'Failed to fetch payment breakdown',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get wallet credit transaction history for tenant
     */
    public function getWalletLogs(Request $request)
    {
        try {
            $tenantId = Auth::id();

            $logs = \App\Models\TenantCredit::with([
                'property' => function ($q) {
                    $q->select('id', 'title');
                },
                'room' => function ($q) {
                    $q->select('id', 'room_number');
                },
                'invoice' => function ($q) {
                    $q->select('id', 'invoice_number', 'reference');
                }
            ])
                ->where('tenant_id', $tenantId)
                ->orderBy('created_at', 'desc')
                ->paginate(20);

            return response()->json($logs, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch wallet logs',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get property-scoped wallet credit balance for tenant
     */
    public function getPropertyCreditBalance(Request $request)
    {
        try {
            $propertyId = $request->query('property_id');
            if (!$propertyId) {
                return response()->json(['message' => 'Property ID is required'], 400);
            }

            $balance = \App\Models\TenantCredit::getBalance(Auth::id(), $propertyId);

            return response()->json([
                'success' => true,
                'balance' => (float) $balance
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch property credits',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Archive/Unarchive a single invoice for the tenant
     */
    public function archive($id)
    {
        try {
            $invoice = Invoice::where('tenant_id', Auth::id())->findOrFail($id);
            $invoice->is_archived = !$invoice->is_archived;
            $invoice->save();

            return response()->json([
                'success' => true,
                'is_archived' => $invoice->is_archived,
                'message' => $invoice->is_archived ? 'Invoice archived successfully' : 'Invoice restored to active list'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update invoice archive status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
