<?php

namespace App\Services;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\ExtensionRequest;
use App\Models\Invoice;
use App\Models\MaintenanceRequest;
use App\Models\PaymentTransaction;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TenantDashboardService
{
    public function getStats(int $tenantId): array
    {
        $cacheKey = "tenant_stats_{$tenantId}";

        return \Illuminate\Support\Facades\Cache::remember($cacheKey, 600, function() use ($tenantId) {
            // 1. Optimized Booking Stats (Single Query)
            $bookingStats = Booking::where('tenant_id', $tenantId)
                ->selectRaw("
                    COUNT(CASE WHEN status IN ('pending', 'confirmed') AND status != 'refunded' THEN 1 END) as active,
                    COUNT(CASE WHEN status = 'confirmed' AND status != 'refunded' THEN 1 END) as confirmed,
                    COUNT(CASE WHEN status = 'pending' AND status != 'refunded' THEN 1 END) as pending
                ")
                ->first();

            // 2. Optimized Invoice Stats & Sums
            $now = now();
            $unpaidInvoices = Invoice::with(['transactions' => function ($q) {
                $q->whereIn('status', ['succeeded', 'paid', 'partially_refunded', 'refunded']);
            }])
                ->where('tenant_id', $tenantId)
                ->whereIn('status', ['pending', 'partial', 'overdue', 'pending_verification'])
                ->get();

            $monthlyDueCents = 0;
            $totalDueCents = 0;
            $countPending = 0;
            $countPartial = 0;
            $countOverdue = 0;
            $hasOverdue = false;

            foreach ($unpaidInvoices as $inv) {
                $netPaid = $inv->transactions->sum(fn ($tx) => $tx->amount_cents - ($tx->refunded_amount_cents ?? 0));
                $balance = max(0, ($inv->total_cents ?? $inv->amount_cents) - $netPaid);

                if ($balance > 0) {
                    $totalDueCents += $balance;
                    if ($inv->due_date && $inv->due_date->month == $now->month && $inv->due_date->year == $now->year) {
                        $monthlyDueCents += $balance;
                    }
                }

                if ($inv->status === 'pending' || $inv->status === 'pending_verification') {
                    $countPending++;
                } elseif ($inv->status === 'partial') {
                    $countPartial++;
                } elseif ($inv->status === 'overdue') {
                    $countOverdue++;
                    $hasOverdue = true;
                }
            }

            $countPaid = Invoice::where('tenant_id', $tenantId)->where('status', 'paid')->count();

            // 3. Paid Amount Calculation
            $totalPaidCents = PaymentTransaction::where('tenant_id', $tenantId)
                ->where('amount_cents', '>', 0)
                ->whereIn('status', ['succeeded', 'paid', 'partially_refunded', 'refunded'])
                ->selectRaw('SUM(amount_cents - COALESCE(refunded_amount_cents, 0)) as net_cents')
                ->value('net_cents') ?? 0;

            // 4. Latest unpaid invoice
            $latestUnpaidInvoice = Invoice::where('tenant_id', $tenantId)
                ->whereIn('status', ['pending', 'partial', 'overdue', 'pending_verification'])
                ->orderBy('due_date', 'asc')
                ->first();

            $unreadNotifications = User::find($tenantId)->unreadNotifications()->count();
            $walletBalanceCents = \App\Models\TenantCredit::getBalance($tenantId);

            return [
                'bookings' => [
                    'active' => (int) ($bookingStats->active ?? 0),
                    'confirmed' => (int) ($bookingStats->confirmed ?? 0),
                    'pending' => (int) ($bookingStats->pending ?? 0),
                ],
                'payments' => [
                    'monthlyDue' => (float) ($monthlyDueCents / 100),
                    'totalDue' => (float) ($totalDueCents / 100),
                    'totalPaid' => (float) ($totalPaidCents / 100),
                    'walletBalance' => (float) ($walletBalanceCents / 100),
                    'pendingAmount' => (float) ($totalDueCents / 100),
                    'latestUnpaidInvoiceId' => $latestUnpaidInvoice ? $latestUnpaidInvoice->id : null,
                    'hasOverdueInvoices' => (bool) $hasOverdue,
                    'unpaidInvoices' => $unpaidInvoices->map(fn($inv) => [
                        'id' => $inv->id,
                        'reference' => $inv->reference || $inv->invoice_number,
                        'description' => $inv->description,
                        'amount' => (float) (($inv->total_cents ?? $inv->amount_cents) / 100),
                        'due_date' => $inv->due_date,
                        'status' => $inv->status,
                        'property_id' => $inv->property_id,
                        'booking_id' => $inv->booking_id,
                        'net_paid' => (float) ($inv->transactions->sum(fn($tx) => $tx->amount_cents - ($tx->refunded_amount_cents ?? 0)) / 100),
                    ]),
                    'invoice_breakdown' => [
                        'pending' => (int) $countPending,
                        'partial' => (int) $countPartial,
                        'overdue' => (int) $countOverdue,
                        'paid' => (int) $countPaid,
                    ],
                ],
                'notifications' => [
                    'unread' => $unreadNotifications,
                ],
            ];
        });
    }

    public function getRecentActivities(int $tenantId): Collection
    {
        $redisKey = "tenant_activities_{$tenantId}";
        $cached = [];
        
        if (extension_loaded('redis')) {
            try {
                $cached = \Illuminate\Support\Facades\Redis::lrange($redisKey, 0, 29);
            } catch (\Throwable $e) {
                // Ignore redis connection issues
            }
        }

        if (!empty($cached)) {
            return collect($cached)->map(fn($item) => json_decode($item, true));
        }

        return $this->getRecentActivitiesFallback($tenantId);
    }

    public function getRecentActivitiesFallback(int $tenantId): Collection
    {
        $resolveSortKey = static function ($value): int {
            if ($value instanceof \DateTimeInterface) {
                return (int) $value->getTimestamp();
            }

            if (is_numeric($value)) {
                return (int) $value;
            }

            $parsed = strtotime((string) $value);

            return $parsed !== false ? (int) $parsed : 0;
        };

        $bookingActivities = Booking::where('tenant_id', $tenantId)
            ->with(['landlord', 'property', 'room'])
            ->orderBy('updated_at', 'desc')
            ->limit(15)
            ->get()
            ->map(function ($booking) use ($resolveSortKey) {
                $status = strtolower((string) $booking->status);
                $propertyTitle = $booking->property->title ?? 'your property';
                $roomLabel = $booking->room->room_number ?? 'N/A';
                $eventAt = $booking->updated_at ?? $booking->created_at;

                $action = 'Booking update';
                $color = 'gray';
                if (in_array($status, ['pending', 'pending_reservation', 'reserved'], true)) {
                    $action = 'Booking pending';
                    $color = 'yellow';
                } elseif (in_array($status, ['confirmed', 'active'], true)) {
                    $action = 'Booking confirmed';
                    $color = 'green';
                } elseif (in_array($status, ['cancelled', 'rejected'], true)) {
                    $action = 'Booking cancelled';
                    $color = 'red';
                } elseif ($status === 'transferred') {
                    $action = 'Room transferred';
                    $color = 'blue';
                }

                return [
                    'id' => $booking->id,
                    'type' => 'booking',
                    'action' => $action,
                    'description' => 'Your booking for '.$propertyTitle.' - Room '.$roomLabel.' is '.$status,
                    'status' => $status,
                    'timestamp' => $eventAt,
                    'icon' => 'calendar',
                    'color' => $color,
                    'booking_id' => $booking->id,
                    '_sort_key' => $resolveSortKey($eventAt),
                    '_uid' => 'booking-'.$booking->id.'-'.$status,
                ];
            });

        $moveOutActivities = Booking::where('tenant_id', $tenantId)
            ->whereNotNull('notice_given_at')
            ->with(['property', 'room'])
            ->orderBy('notice_given_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($booking) use ($resolveSortKey) {
                $propertyTitle = $booking->property->title ?? 'your property';
                $roomLabel = $booking->room->room_number ?? 'N/A';
                $eventAt = $booking->notice_given_at;

                return [
                    'id' => $booking->id,
                    'type' => 'move_out',
                    'action' => 'Move-out notice submitted',
                    'description' => 'You submitted a move-out notice for '.$propertyTitle.' - Room '.$roomLabel.'.',
                    'status' => 'notice_submitted',
                    'timestamp' => $eventAt,
                    'icon' => 'log-out-outline',
                    'color' => 'blue',
                    'booking_id' => $booking->id,
                    '_sort_key' => $resolveSortKey($eventAt),
                    '_uid' => 'move-out-'.$booking->id.'-'.$resolveSortKey($eventAt),
                ];
            });

        $invoiceActivities = Invoice::where('tenant_id', $tenantId)
            ->with(['property', 'booking.room'])
            ->orderBy('updated_at', 'desc')
            ->limit(15)
            ->get()
            ->map(function ($invoice) use ($resolveSortKey) {
                $status = strtolower((string) $invoice->status);
                $propertyTitle = $invoice->property->title ?? 'your property';
                $roomLabel = $invoice->booking?->room?->room_number;
                $roomSuffix = $roomLabel ? ' - Room '.$roomLabel : '';
                $eventAt = $invoice->updated_at ?? $invoice->created_at;

                $action = 'Payment update';
                $color = 'blue';
                if ($status === 'overdue') {
                    $action = 'Payment overdue';
                    $color = 'red';
                } elseif ($status === 'pending' || $status === 'partial') {
                    $action = 'Payment reminder';
                    $color = 'yellow';
                } elseif ($status === 'paid') {
                    $action = 'Payment confirmed';
                    $color = 'green';
                } elseif ($status === 'deferred') {
                    $action = 'Payment deferred';
                    $color = 'gray';
                }

                return [
                    'id' => $invoice->id,
                    'type' => 'payment',
                    'action' => $action,
                    'description' => 'Invoice for '.$propertyTitle.$roomSuffix.' is '.$status,
                    'status' => $status,
                    'timestamp' => $eventAt,
                    'icon' => 'credit-card',
                    'color' => $color,
                    'invoice_id' => $invoice->id,
                    'booking_id' => $invoice->booking_id,
                    '_sort_key' => $resolveSortKey($eventAt),
                    '_uid' => 'invoice-'.$invoice->id.'-'.$status,
                ];
            });

        $paymentActivities = PaymentTransaction::where('tenant_id', $tenantId)
            ->with(['invoice.property', 'invoice.booking.room'])
            ->orderBy('created_at', 'desc')
            ->limit(15)
            ->get()
            ->map(function ($tx) use ($resolveSortKey) {
                $status = strtolower((string) $tx->status);
                $invoice = $tx->invoice;
                $propertyTitle = $invoice?->property?->title ?? 'your property';
                $roomLabel = $invoice?->booking?->room?->room_number;
                $roomSuffix = $roomLabel ? ' - Room '.$roomLabel : '';
                $eventAt = $tx->created_at;

                $action = 'Payment update';
                $color = 'blue';
                if (in_array($status, ['paid', 'succeeded', 'partially_refunded', 'refunded'], true)) {
                    $action = 'Payment transaction recorded';
                    $color = 'green';
                } elseif (in_array($status, ['pending', 'pending_offline', 'pending_verification'], true)) {
                    $action = 'Payment submitted';
                    $color = 'yellow';
                } elseif ($status === 'failed' || $status === 'cancelled') {
                    $action = 'Payment attempt failed';
                    $color = 'red';
                }

                return [
                    'id' => $tx->id,
                    'type' => 'payment',
                    'action' => $action,
                    'description' => 'Transaction for '.$propertyTitle.$roomSuffix.' is '.$status,
                    'status' => $status,
                    'timestamp' => $eventAt,
                    'icon' => 'credit-card',
                    'color' => $color,
                    'invoice_id' => $tx->invoice_id,
                    'booking_id' => $invoice?->booking_id,
                    '_sort_key' => $resolveSortKey($eventAt),
                    '_uid' => 'payment-tx-'.$tx->id.'-'.$status,
                ];
            });

        $transferActivities = TransferRequest::where('tenant_id', $tenantId)
            ->with(['booking.property', 'currentRoom', 'requestedRoom'])
            ->orderBy('updated_at', 'desc')
            ->limit(15)
            ->get()
            ->map(function ($transfer) use ($resolveSortKey) {
                $status = strtolower((string) $transfer->status);
                $fromRoom = $transfer->currentRoom?->room_number ?? 'N/A';
                $toRoom = $transfer->requestedRoom?->room_number ?? 'N/A';
                $propertyTitle = $transfer->booking?->property?->title ?? 'your property';
                $eventAt = $transfer->handled_at ?? $transfer->updated_at ?? $transfer->created_at;

                $action = 'Transfer update';
                $color = 'blue';
                if ($status === 'pending') {
                    $action = 'Transfer request submitted';
                    $color = 'yellow';
                } elseif ($status === 'approved') {
                    $action = 'Transfer request approved';
                    $color = 'green';
                } elseif ($status === 'rejected') {
                    $action = 'Transfer request rejected';
                    $color = 'red';
                } elseif ($status === 'cancelled') {
                    $action = 'Transfer request cancelled';
                    $color = 'gray';
                }

                return [
                    'id' => $transfer->id,
                    'type' => 'transfer',
                    'action' => $action,
                    'description' => 'Transfer from Room '.$fromRoom.' to Room '.$toRoom.' at '.$propertyTitle.' is '.$status.'.',
                    'status' => $status,
                    'timestamp' => $eventAt,
                    'icon' => 'swap-horizontal-outline',
                    'color' => $color,
                    'transfer_request_id' => $transfer->id,
                    'booking_id' => $transfer->booking_id,
                    '_sort_key' => $resolveSortKey($eventAt),
                    '_uid' => 'transfer-'.$transfer->id.'-'.$status,
                ];
            });

        $addonActivities = DB::table('booking_addons as ba')
            ->join('bookings as b', 'b.id', '=', 'ba.booking_id')
            ->join('addons as a', 'a.id', '=', 'ba.addon_id')
            ->leftJoin('properties as p', 'p.id', '=', 'b.property_id')
            ->leftJoin('rooms as r', 'r.id', '=', 'b.room_id')
            ->where('b.tenant_id', $tenantId)
            ->orderBy('ba.updated_at', 'desc')
            ->limit(20)
            ->get([
                'ba.id as booking_addon_id',
                'ba.booking_id',
                'ba.addon_id',
                'ba.status as addon_status',
                'ba.created_at',
                'ba.updated_at',
                'ba.cancellation_requested_at',
                'ba.cancellation_effective_at',
                'a.name as addon_name',
                'p.title as property_title',
                'r.room_number',
            ])
            ->map(function ($row) use ($resolveSortKey) {
                $status = strtolower((string) $row->addon_status);
                $propertyTitle = $row->property_title ?: 'your property';
                $roomLabel = $row->room_number ?: 'N/A';
                $eventAt = $row->updated_at ?: $row->created_at;

                $action = 'Add-on update';
                $color = 'blue';
                if ($status === 'pending') {
                    $action = 'Add-on request submitted';
                    $color = 'yellow';
                } elseif ($status === 'approved') {
                    $action = 'Add-on request approved';
                    $color = 'green';
                } elseif ($status === 'active') {
                    $action = 'Add-on activated';
                    $color = 'green';
                } elseif ($status === 'completed') {
                    $action = 'Add-on completed';
                    $color = 'green';
                } elseif ($status === 'rejected') {
                    $action = 'Add-on request rejected';
                    $color = 'red';
                } elseif ($status === 'cancelled') {
                    $action = 'Add-on cancelled';
                    $color = 'gray';
                }

                return [
                    'id' => (int) $row->booking_addon_id,
                    'type' => 'addon',
                    'action' => $action,
                    'description' => ($row->addon_name ?: 'Add-on').' for '.$propertyTitle.' - Room '.$roomLabel.' is '.$status.'.',
                    'status' => $status,
                    'timestamp' => $eventAt,
                    'icon' => 'sparkles-outline',
                    'color' => $color,
                    'booking_id' => (int) $row->booking_id,
                    'addon_id' => (int) $row->addon_id,
                    '_sort_key' => $resolveSortKey($eventAt),
                    '_uid' => 'addon-'.$row->booking_addon_id.'-'.$status,
                ];
            });

        $extensionActivities = ExtensionRequest::where('tenant_id', $tenantId)
            ->with(['booking.property', 'booking.room'])
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($extension) use ($resolveSortKey) {
                $status = strtolower((string) $extension->status);
                $propertyTitle = $extension->booking?->property?->title ?? 'your property';
                $roomLabel = $extension->booking?->room?->room_number ?? 'N/A';
                $targetEnd = optional($extension->requested_end_date)->format('Y-m-d') ?? 'the requested date';
                $eventAt = $extension->handled_at ?? $extension->updated_at ?? $extension->created_at;

                $action = 'Extension request update';
                $color = 'blue';
                if ($status === 'pending') {
                    $action = 'Extension request submitted';
                    $color = 'yellow';
                } elseif ($status === 'approved') {
                    $action = 'Extension request approved';
                    $color = 'green';
                } elseif ($status === 'rejected') {
                    $action = 'Extension request rejected';
                    $color = 'red';
                } elseif ($status === 'cancelled') {
                    $action = 'Extension request cancelled';
                    $color = 'gray';
                }

                return [
                    'id' => $extension->id,
                    'type' => 'extension',
                    'action' => $action,
                    'description' => 'Extension request for '.$propertyTitle.' - Room '.$roomLabel.' until '.$targetEnd.' is '.$status.'.',
                    'status' => $status,
                    'timestamp' => $eventAt,
                    'icon' => 'time-outline',
                    'color' => $color,
                    'booking_id' => $extension->booking_id,
                    'extension_request_id' => $extension->id,
                    '_sort_key' => $resolveSortKey($eventAt),
                    '_uid' => 'extension-'.$extension->id.'-'.$status,
                ];
            });

        $maintenanceActivities = MaintenanceRequest::where('tenant_id', $tenantId)
            ->with(['property', 'booking.room'])
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($request) use ($resolveSortKey) {
                $status = strtolower((string) $request->status);
                $propertyTitle = $request->property?->title ?? 'your property';
                $roomLabel = $request->booking?->room?->room_number;
                $roomSuffix = $roomLabel ? ' - Room '.$roomLabel : '';
                $eventAt = $request->resolved_at ?? $request->updated_at ?? $request->created_at;

                $action = 'Maintenance request update';
                $color = 'blue';
                if (in_array($status, ['pending', 'open'], true)) {
                    $action = 'Maintenance request submitted';
                    $color = 'yellow';
                } elseif (in_array($status, ['in_progress', 'assigned'], true)) {
                    $action = 'Maintenance in progress';
                    $color = 'blue';
                } elseif (in_array($status, ['resolved', 'completed'], true)) {
                    $action = 'Maintenance resolved';
                    $color = 'green';
                } elseif (in_array($status, ['cancelled', 'rejected'], true)) {
                    $action = 'Maintenance closed';
                    $color = 'gray';
                }

                return [
                    'id' => $request->id,
                    'type' => 'maintenance',
                    'action' => $action,
                    'description' => 'Maintenance request "'.($request->title ?: 'Request').'" for '.$propertyTitle.$roomSuffix.' is '.$status.'.',
                    'status' => $status,
                    'timestamp' => $eventAt,
                    'icon' => 'construct-outline',
                    'color' => $color,
                    'booking_id' => $request->booking_id,
                    'maintenance_request_id' => $request->id,
                    '_sort_key' => $resolveSortKey($eventAt),
                    '_uid' => 'maintenance-'.$request->id.'-'.$status,
                ];
            });

        return $bookingActivities
            ->merge($moveOutActivities)
            ->merge($invoiceActivities)
            ->merge($paymentActivities)
            ->merge($transferActivities)
            ->merge($addonActivities)
            ->merge($extensionActivities)
            ->merge($maintenanceActivities)
            ->sortByDesc(fn ($item) => (int) ($item['_sort_key'] ?? 0))
            ->unique(fn ($item) => $item['_uid'] ?? ($item['type'].'-'.$item['id']))
            ->values()
            ->take(30)
            ->map(function ($item) {
                unset($item['_sort_key'], $item['_uid']);

                return $item;
            })
            ->values();
    }

    public function getUpcomingPayments(int $tenantId): array
    {
        $upcomingCheckouts = Booking::where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->whereNotNull('end_date')
            ->whereBetween('end_date', [now(), now()->addDays(30)])
            ->with(['property', 'room'])
            ->orderBy('end_date', 'asc')
            ->get();

        $unpaidBookings = Booking::where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->whereIn('payment_status', ['unpaid', 'partial'])
            ->with(['property', 'room'])
            ->orderBy('start_date', 'asc')
            ->get();

        return ['upcomingCheckouts' => $upcomingCheckouts, 'unpaidBookings' => $unpaidBookings];
    }

    public function getActiveStays(int $tenantId)
    {
        return Booking::where(function ($query) {
            // Bookings that are currently active for dashboard stay context
            $query->where(function ($activeQ) {
                $activeQ->whereIn('status', ['confirmed', 'active', 'completed', 'partial-completed'])
                    ->where('status', '!=', 'refunded')
                    // Lease hasn't ended OR it's past end_date but still 'confirmed' (overdue)
                    ->where(function ($q) {
                        $q->where('end_date', '>=', now()->startOfDay())
                            ->orWhereIn('status', ['confirmed', 'active']);
                    });
            })
            // OR cancelled bookings that are still within their intended stay period and were refunded
            ->orWhere(function ($refundedQ) {
                $refundedQ->where('status', 'cancelled')
                    ->where('payment_status', 'refunded')
                    ->where('end_date', '>=', now()->startOfDay());
            });
        })
            ->where(function ($query) use ($tenantId) {
                // The user is either the primary booker...
                $query->where('tenant_id', $tenantId)
                    // ...or they are a linked occupant in a proxy booking.
                    ->orWhereHas('occupants', function ($occupantQuery) use ($tenantId) {
                        $occupantQuery->where('user_id', $tenantId);
                    });
            })
            ->withCount('occupants')
            ->with([
                'room.images', 'property.landlord', 'property.images', 'landlord', 'review', 'occupants',
                'addons' => fn ($q) => $q->wherePivotIn('status', ['approved', 'active', 'pending']),
                'payments' => fn ($q) => $q->orderBy('payment_date', 'desc'),
                'invoices' => fn ($q) => $q->orderBy('due_date', 'desc')->with('transactions'),
            ])
            ->get();
    }

    public function getCurrentStay(int $tenantId): ?Booking
    {
        return $this->getActiveBooking($tenantId, [
            'room.images', 'property.landlord', 'property.images', 'landlord', 'review',
            'addons' => fn ($q) => $q->wherePivotIn('status', ['approved', 'active', 'pending']),
            'payments' => fn ($q) => $q->orderBy('payment_date', 'desc'),
            'invoices' => fn ($q) => $q->orderBy('due_date', 'desc')->with('transactions'),
        ]);
    }

    public function getUpcomingBooking(int $tenantId): ?Booking
    {
        return Booking::where(function ($query) use ($tenantId) {
            $query->where('tenant_id', $tenantId)
                ->orWhereHas('occupants', function ($occupantQuery) use ($tenantId) {
                    $occupantQuery->where('user_id', $tenantId);
                });
        })
            ->whereIn('status', ['pending', 'pending_reservation', 'reserved', 'confirmed'])
            ->where('status', '!=', 'refunded')
            // Use startOfDay() so that a booking starting today is still shown as "upcoming"
            // until the landlord actually moves the tenant into the room.
            ->where('start_date', '>=', now()->startOfDay())
            ->with(['room', 'property.landlord', 'landlord'])
            ->orderBy('start_date', 'asc')
            ->first();
    }

    public function getPendingCheckInBookings(int $tenantId)
    {
        return Booking::where(function ($query) use ($tenantId) {
            $query->where('tenant_id', $tenantId)
                ->orWhereHas('occupants', function ($occupantQuery) use ($tenantId) {
                    $occupantQuery->where('user_id', $tenantId);
                });
        })
            ->whereIn('status', ['pending', 'pending_reservation', 'reserved', 'confirmed'])
            ->where('status', '!=', 'refunded')
            // Use startOfDay() so bookings whose start_date is today are caught
            ->where('start_date', '<=', now()->endOfDay())
            // Not assigned to room yet
            ->whereDoesntHave('room.tenants', function ($query) use ($tenantId) {
                $query->where('users.id', $tenantId);
            })
            ->with(['room', 'property.landlord', 'landlord'])
            ->get();
    }

    public function getHistory(int $tenantId)
    {
        return Booking::where('tenant_id', $tenantId)
            ->where(function ($query) {
                // Bookings that are strictly in the past
                $query->where('end_date', '<', now())
                      // OR bookings that were cancelled, rejected, or explicitly marked as completed
                    ->orWhereIn('status', ['cancelled', 'rejected', 'completed', 'partial-completed', 'refunded', 'transferred']);
            })
            ->with(['room', 'property', 'landlord', 'addons' => fn ($q) => $q->wherePivotIn('status', ['active', 'completed']), 'payments', 'invoices.transactions', 'review'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);
    }

    public function getAvailableAddonsForActiveBooking(int $tenantId)
    {
        $booking = $this->getActiveBooking($tenantId);
        if (! $booking) {
            return null;
        }

        $requestedAddonIds = $booking->addons->pluck('id')->toArray();

        return Addon::where('property_id', $booking->property_id)
            ->where('is_active', true)
            ->whereNotIn('id', $requestedAddonIds)
            ->get();
    }

    public function getAddonRequestsForActiveBooking(int $tenantId)
    {
        return $this->getActiveBooking($tenantId, ['addons']);
    }

    public function requestAddonForActiveBooking(int $tenantId, array $data): Addon
    {
        $bookingId = $data['booking_id'] ?? null;

        if ($bookingId) {
            $booking = Booking::where('id', $bookingId)
                ->where('tenant_id', $tenantId)
                ->whereIn('status', ['confirmed', 'active', 'completed', 'partial-completed'])
                ->first();
        } else {
            $booking = $this->getActiveBooking($tenantId);
        }

        if (! $booking) {
            throw new \Exception('No active booking found');
        }

        if ($booking->payment_status === 'refunded') {
            throw new \Exception('Add-on requests are disabled until your room payment is re-settled.');
        }

        if ($data['is_custom'] ?? false) {
            // Handle custom request
            $addon = Addon::create([
                'property_id' => $booking->property_id,
                'name' => $data['name'],
                'description' => $data['note'] ?? null,
                'price_cents' => 0, // Landlord will set the price upon approval
                'price_type' => $data['price_type'],
                'addon_type' => $data['addon_type'],
                'is_active' => false, // Inactive so it's not visible to all
                'is_custom' => true,
                'request_tenant_id' => $tenantId,
            ]);
        }
 else {
            $addon = Addon::where('id', $data['addon_id'])
                ->where('property_id', $booking->property_id)
                ->where('is_active', true)
                ->firstOrFail();

            if ($booking->addons()->where('addon_id', $addon->id)->wherePivotNotIn('status', ['rejected', 'cancelled', 'completed'])->exists()) {
                throw new \Exception('You already have an active request for this addon in this room');
            }

            if ($addon->addon_type === 'rental' && ! $addon->hasStock()) {
                throw new \Exception('This addon is currently out of stock');
            }
        }

        $suggestedPrice = $data['suggested_price'] ?? null;
        $booking->addons()->attach($addon->id, [
            'quantity' => $data['quantity'] ?? 1,
            'price_at_booking' => (float) ($addon->price_cents / 100),
            'price_at_booking_cents' => $addon->price_cents,
            'status' => 'pending',
            'request_note' => trim(($data['note'] ?? '').($suggestedPrice ? ' | Suggested price: ₱'.number_format((float) $suggestedPrice, 2) : '')),
        ]);

        return $addon;
    }

    public function cancelAddonRequestForActiveBooking(int $tenantId, int $addonId): array
    {
        $booking = $this->getActiveBooking($tenantId);
        if (! $booking) {
            throw new \Exception('No active booking found');
        }

        // Allow cancelling pending, active, or approved addons
        $addonRequest = $booking->addons()
            ->where('addons.id', $addonId)
            ->wherePivotIn('status', ['pending', 'active', 'approved'])
            ->first();

        if (! $addonRequest) {
            throw new \Exception('No cancellable request found for this addon', 404);
        }

        $pivotStatus = (string) $addonRequest->pivot->status;

        if ($pivotStatus === 'pending') {
            $booking->addons()->updateExistingPivot($addonId, [
                'status' => 'cancelled',
                'cancellation_requested_at' => now(),
                'cancellation_effective_at' => now(),
                'updated_at' => now(),
            ]);

            return [
                'mode' => 'cancelled_now',
                'message' => 'Addon request cancelled successfully.',
            ];
        }

        if ($addonRequest->price_type === 'monthly') {
            // Schedule cancellation for next month's start
            $effectiveAt = now()->copy()->addMonth()->startOfMonth();

            $booking->addons()->updateExistingPivot($addonId, [
                'cancellation_requested_at' => now(),
                'cancellation_effective_at' => $effectiveAt,
                'updated_at' => now(),
            ]);

            return [
                'mode' => 'scheduled_next_month',
                'message' => 'Addon removal is scheduled for next month.',
                'effective_at' => $effectiveAt->toDateString(),
            ];
        }

        if ($addonRequest->pivot->invoice_id) {
            $invoice = \App\Models\Invoice::find($addonRequest->pivot->invoice_id);
            if ($invoice && in_array($invoice->status, ['pending', 'overdue'])) {
                if ($invoice->invoice_type === 'addon' || str_contains($invoice->reference, 'INV-ADD-')) {
                    $invoice->update(['status' => 'cancelled']);
                } else {
                    $expectedAmount = (int) ($addonRequest->pivot->price_at_booking_cents * $addonRequest->pivot->quantity);
                    $invoice->amount_cents = max(0, $invoice->amount_cents - $expectedAmount);
                    $invoice->description .= "\n- Cancelled Addon";
                    $invoice->save();
                }
            }
        }

        $booking->addons()->updateExistingPivot($addonId, [
            'status' => 'cancelled',
            'cancellation_requested_at' => now(),
            'cancellation_effective_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            'mode' => 'cancelled_now',
            'message' => 'Addon cancelled successfully.',
        ];
    }

    private function getActiveBooking(int $tenantId, array $relations = []): ?Booking
    {
        return Booking::where('tenant_id', $tenantId)
            ->where(function ($query) {
                // Currently confirmed and active bookings
                $query->where(function ($q) {
                    $q->whereIn('status', ['confirmed', 'active']);
                    // No end date restriction here for confirmed stays to show overdue ones
                })
                // OR recently completed bookings (last 30 days)
                    ->orWhere(function ($q) {
                        $q->whereIn('status', ['completed', 'partial-completed'])
                            ->where('end_date', '>=', now()->subDays(30));
                    })
                // OR cancelled bookings that are still within their intended stay period and were refunded
                    ->orWhere(function ($q) {
                        $q->where('status', 'cancelled')
                            ->where('payment_status', 'refunded')
                            ->where('end_date', '>=', now()->startOfDay());
                    });
            })
            ->withCount('occupants')
            ->with($relations)
            ->orderByDesc('start_date')
            ->first();
    }
}
