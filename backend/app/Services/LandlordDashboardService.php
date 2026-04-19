<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Models\Property;
use App\Models\Room;
use Illuminate\Support\Facades\DB;

class LandlordDashboardService
{
    public function getStats(int $landlordId, ?array $assignedPropertyIds, bool $isCaretaker): array
    {
        // 1. Optimized Properties Stats (Single Query)
        $propStats = Property::where('landlord_id', $landlordId)
            ->when($assignedPropertyIds, fn($q) => $q->whereIn('id', $assignedPropertyIds))
            ->selectRaw('COUNT(*) as total, COUNT(CASE WHEN current_status = ? THEN 1 END) as active', [Property::STATUS_ACTIVE])
            ->first();

        // 2. Optimized Rooms Stats (Single Query)
        $roomStats = Room::whereHas('property', function ($query) use ($landlordId, $assignedPropertyIds) {
            $query->where('landlord_id', $landlordId);
            if ($assignedPropertyIds) {
                $query->whereIn('id', $assignedPropertyIds);
            }
        })
        ->selectRaw("
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied,
            COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
            COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance,
            COUNT(DISTINCT CASE WHEN status = 'occupied' THEN current_tenant_id END) as active_tenants
        ")
        ->first();

        $totalRooms = (int)$roomStats->total;
        $occupiedRooms = (int)$roomStats->occupied;
        $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0;

        // 3. Optimized Bookings Stats (Single Query)
        $bookingStats = Booking::where('landlord_id', $landlordId)
            ->when($assignedPropertyIds, fn($q) => $q->whereIn('property_id', $assignedPropertyIds))
            ->selectRaw("
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed
            ")
            ->first();

        // 4. Optimized Maintenance & Addon Stats
        $pendingMaintenance = \App\Models\MaintenanceRequest::where('landlord_id', $landlordId)
            ->when($assignedPropertyIds, fn($q) => $q->whereIn('property_id', $assignedPropertyIds))
            ->where('status', 'pending')
            ->count();

        $pendingAddons = DB::table('booking_addons')
            ->join('addons', 'booking_addons.addon_id', '=', 'addons.id')
            ->join('properties', 'addons.property_id', '=', 'properties.id')
            ->where('properties.landlord_id', $landlordId)
            ->when($assignedPropertyIds, fn($q) => $q->whereIn('addons.property_id', $assignedPropertyIds))
            ->where('booking_addons.status', 'pending')
            ->count();

        $response = [
            'properties' => ['total' => (int)$propStats->total, 'active' => (int)$propStats->active],
            'rooms' => [
                'total' => $totalRooms, 
                'occupied' => $occupiedRooms, 
                'available' => (int)$roomStats->available, 
                'maintenance' => (int)$roomStats->maintenance, 
                'occupancyRate' => $occupancyRate
            ],
            'tenants' => ['active' => (int)$roomStats->active_tenants],
            'bookings' => ['pending' => (int)$bookingStats->pending, 'confirmed' => (int)$bookingStats->confirmed],
            'requests' => ['maintenance' => $pendingMaintenance, 'addons' => $pendingAddons],
        ];

        if (!$isCaretaker) {
            $currentMonthStart = now()->startOfMonth();
            $currentMonthEnd = now()->endOfMonth();

            // Use indexed range queries instead of whereMonth/whereYear
            $monthlyRevenue = Booking::where('landlord_id', $landlordId)
                ->where('status', 'confirmed')
                ->where('payment_status', 'paid')
                ->whereBetween('created_at', [$currentMonthStart, $currentMonthEnd])
                ->sum('monthly_rent');

            // Aggregate total revenue stats in one query if possible
            $revenueTotals = Booking::where('landlord_id', $landlordId)
                ->where('status', 'confirmed')
                ->selectRaw("
                    SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as total,
                    SUM(CASE WHEN payment_status IN ('unpaid', 'partial') THEN total_amount ELSE 0 END) as expected
                ")
                ->first();

            $response['revenue'] = [
                'monthly' => (float)$monthlyRevenue, 
                'total' => (float)$revenueTotals->total, 
                'expected' => (float)$revenueTotals->expected
            ];
        }

        return $response;
    }


    public function getRecentActivities(int $landlordId, ?array $assignedPropertyIds, bool $isCaretaker, ?int $propertyId, ?int $roomId = null): \Illuminate\Support\Collection
    {
        $activities = collect();

        $recentBookingsQuery = Booking::where('landlord_id', $landlordId)->with(['tenant', 'property', 'room'])->orderBy('created_at', 'desc');
        if ($roomId) {
            $recentBookingsQuery->where('room_id', $roomId);
        } elseif ($propertyId) {
            $recentBookingsQuery->where('property_id', $propertyId);
        } elseif ($assignedPropertyIds) {
            $recentBookingsQuery->whereIn('property_id', $assignedPropertyIds);
        }
        $activities = $activities->merge($recentBookingsQuery->limit(20)->get());

        $moveOutNoticesQuery = Booking::where('landlord_id', $landlordId)
            ->whereNotNull('notice_given_at')
            ->with(['tenant', 'property', 'room'])
            ->orderBy('notice_given_at', 'desc');
        if ($roomId) {
            $moveOutNoticesQuery->where('room_id', $roomId);
        } elseif ($propertyId) {
            $moveOutNoticesQuery->where('property_id', $propertyId);
        } elseif ($assignedPropertyIds) {
            $moveOutNoticesQuery->whereIn('property_id', $assignedPropertyIds);
        }

        $moveOutNotices = $moveOutNoticesQuery->limit(10)->get();
        foreach ($moveOutNotices as $noticeBooking) {
            $activities->push([
                'id' => $noticeBooking->id,
                'type' => 'booking',
                'action' => 'Move-out Notice Submitted',
                'description' => ($noticeBooking->tenant->first_name ?? 'Tenant').' submitted a move-out notice for '.($noticeBooking->property->title ?? 'Property').' - Room '.($noticeBooking->room->room_number ?? 'N/A'),
                'status' => 'notified',
                'timestamp' => $noticeBooking->notice_given_at,
                'created_at' => $noticeBooking->notice_given_at,
                'icon' => 'log-out-outline',
                'color' => 'blue',
                'booking_id' => $noticeBooking->id,
            ]);
        }

        $roomsQuery = Room::whereHas('property', function ($query) use ($landlordId, $propertyId, $assignedPropertyIds) {
            $query->where('landlord_id', $landlordId);
            if ($propertyId) {
                $query->where('id', $propertyId);
            } elseif ($assignedPropertyIds) {
                $query->whereIn('id', $assignedPropertyIds);
            }
        });
        if ($roomId) {
            $roomsQuery->where('id', $roomId);
        }

        $activities = $activities->merge((clone $roomsQuery)->where('updated_at', '>=', now()->subDays(10))->with(['property', 'currentTenant'])->orderBy('updated_at', 'desc')->limit(10)->get());
        $activities = $activities->merge((clone $roomsQuery)->where('created_at', '>=', now()->subDays(10))->with(['property'])->orderBy('created_at', 'desc')->limit(10)->get());

        // Add Caretaker Property Reports
        $auditQuery = \App\Models\AuditLog::where('domain', 'caretaker_report')->where('landlord_id', $landlordId)->with('actor')->orderBy('created_at', 'desc');
        if ($propertyId) {
            $auditQuery->where('property_id', $propertyId);
        } elseif ($assignedPropertyIds) {
            $auditQuery->whereIn('property_id', $assignedPropertyIds);
        }
        $activities = $activities->merge($auditQuery->limit(15)->get());

        if (! $isCaretaker) {
            if (! $roomId) {
                $propertyUpdatesQuery = Property::where('landlord_id', $landlordId)->where('updated_at', '>=', now()->subDays(10))->orderBy('updated_at', 'desc');
                if ($propertyId) {
                    $propertyUpdatesQuery->where('id', $propertyId);
                }
                $activities = $activities->merge($propertyUpdatesQuery->limit(5)->get());
            }

            $invoiceQuery = Invoice::where('landlord_id', $landlordId)->where('updated_at', '>=', now()->subDays(10))->with(['property', 'booking.room'])->orderBy('updated_at', 'desc');
            if ($roomId) {
                $invoiceQuery->whereHas('booking', function ($q) use ($roomId) {
                    $q->where('room_id', $roomId);
                });
            } elseif ($propertyId) {
                $invoiceQuery->where('property_id', $propertyId);
            }
            $activities = $activities->merge($invoiceQuery->limit(10)->get());

            $paymentsQuery = \App\Models\PaymentTransaction::whereHas('invoice', function ($q) use ($landlordId, $propertyId, $roomId) {
                $q->where('landlord_id', $landlordId);
                if ($roomId) {
                    $q->whereHas('booking', function ($bq) use ($roomId) {
                        $bq->where('room_id', $roomId);
                    });
                } elseif ($propertyId) {
                    $q->where('property_id', $propertyId);
                }
            })->with(['invoice.booking.room', 'tenant'])->orderBy('created_at', 'desc');
            $activities = $activities->merge($paymentsQuery->limit(15)->get());

            // Add Maintenance Requests
            $maintenanceQuery = \App\Models\MaintenanceRequest::where('landlord_id', $landlordId)->with(['property', 'tenant', 'booking.room'])->orderBy('created_at', 'desc');
            if ($roomId) {
                $maintenanceQuery->whereHas('booking', function ($q) use ($roomId) {
                    $q->where('room_id', $roomId);
                });
            } elseif ($propertyId) {
                $maintenanceQuery->where('property_id', $propertyId);
            }
            $activities = $activities->merge($maintenanceQuery->limit(10)->get());

            // Add Transfer Requests
            $transferQuery = \App\Models\TransferRequest::where('landlord_id', $landlordId)
                ->with(['tenant', 'currentRoom', 'requestedRoom'])
                ->orderBy('created_at', 'desc');
            if ($roomId) {
                $transferQuery->where('current_room_id', $roomId);
            } elseif ($propertyId) {
                $transferQuery->whereHas('currentRoom', function ($q) use ($propertyId) {
                    $q->where('property_id', $propertyId);
                });
            } elseif ($assignedPropertyIds) {
                $transferQuery->whereHas('currentRoom', function ($q) use ($assignedPropertyIds) {
                    $q->whereIn('property_id', $assignedPropertyIds);
                });
            }
            $activities = $activities->merge($transferQuery->limit(10)->get());

            // Add Addon Requests (from booking_addons)
            $addonQuery = DB::table('booking_addons')
                ->join('addons', 'booking_addons.addon_id', '=', 'addons.id')
                ->join('properties', 'addons.property_id', '=', 'properties.id')
                ->join('bookings', 'booking_addons.booking_id', '=', 'bookings.id')
                ->join('users', 'bookings.tenant_id', '=', 'users.id')
                ->where('properties.landlord_id', $landlordId)
                ->select([
                    'booking_addons.*',
                    'addons.name as addon_name',
                    'addons.price as addon_price',
                    'users.first_name',
                    'users.last_name',
                    'bookings.room_id',
                ]);

            if ($roomId) {
                $addonQuery->where('bookings.room_id', $roomId);
            } elseif ($propertyId) {
                $addonQuery->where('addons.property_id', $propertyId);
            } elseif ($assignedPropertyIds) {
                $addonQuery->whereIn('addons.property_id', $assignedPropertyIds);
            }

            $addons = $addonQuery->orderBy('booking_addons.updated_at', 'desc')->limit(10)->get();
            foreach ($addons as $addon) {
                // Extract suggested price from request_note if present
                $requestNote = $addon->request_note ?? '';
                $suggestedPrice = null;
                if (preg_match('/suggested\s+price\s*:\s*₱?\s*([\d,]+(?:\.\d+)?)/i', $requestNote, $matches)) {
                    $suggestedPrice = (float) str_replace(',', '', $matches[1]);
                }

                // Use suggested price if available, otherwise use addon price or price_at_booking
                $displayPrice = $suggestedPrice ?? ($addon->price_at_booking ?? $addon->addon_price ?? null);

                $description = "{$addon->first_name} requested {$addon->addon_name}";
                if ($displayPrice !== null) {
                    $description .= ' (₱'.number_format($displayPrice, 2).')';
                }

                // Use updated_at as timestamp so status changes move activity to top
                $timestamp = $addon->updated_at ?? $addon->created_at;

                $activities->push([
                    'id' => $addon->id,
                    'type' => 'addon',
                    'action' => 'Add-on Request '.ucfirst($addon->status),
                    'description' => $description,
                    'status' => $addon->status,
                    'timestamp' => $timestamp,
                    'created_at' => $timestamp,
                    'icon' => 'sparkles',
                    'color' => $addon->status === 'pending' ? 'yellow' : 'green',
                ]);
            }
        }

        return $activities->sortByDesc('created_at')->values();
    }

    public function getUpcomingPayments(int $landlordId, ?array $assignedPropertyIds, bool $isCaretaker)
    {
        $checkoutsQuery = Booking::where('landlord_id', $landlordId)
            ->where('status', 'confirmed')
            ->whereBetween('end_date', [now(), now()->addDays(30)])
            ->with(['tenant', 'property', 'room'])
            ->orderBy('end_date', 'asc');
        if ($assignedPropertyIds) {
            $checkoutsQuery->whereIn('property_id', $assignedPropertyIds);
        }

        $vacatingSoonQuery = Booking::where('landlord_id', $landlordId)
            ->whereNotNull('notice_given_at')
            ->whereNotNull('end_date')
            ->whereIn('status', ['confirmed', 'partial-completed'])
            ->whereBetween('end_date', [now(), now()->addDays(60)])
            ->with(['tenant', 'property', 'room'])
            ->orderBy('end_date', 'asc');
        if ($assignedPropertyIds) {
            $vacatingSoonQuery->whereIn('property_id', $assignedPropertyIds);
        }

        $dueForBillingQuery = Booking::where('landlord_id', $landlordId)
            ->whereIn('status', ['confirmed', 'partial-completed'])
            ->where('payment_plan', 'monthly')
            ->whereNotNull('next_billing_date')
            ->whereBetween('next_billing_date', [now()->toDateString(), now()->addDays(7)->toDateString()])
            ->with(['tenant', 'property', 'room'])
            ->orderBy('next_billing_date', 'asc');
        if ($assignedPropertyIds) {
            $dueForBillingQuery->whereIn('property_id', $assignedPropertyIds);
        }

        $unpaidBookings = [];
        $overdueInvoices = collect();
        $dueSoonInvoices = collect();
        if (! $isCaretaker) {
            $unpaidBookings = Booking::where('landlord_id', $landlordId)
                ->where('status', 'confirmed')
                ->whereIn('payment_status', ['unpaid', 'partial'])
                ->with(['tenant', 'property', 'room'])
                ->orderBy('start_date', 'asc')->get();

            $overdueInvoicesQuery = Invoice::where('landlord_id', $landlordId)
                ->whereIn('status', ['pending', 'overdue'])
                ->whereNotNull('due_date')
                ->whereDate('due_date', '<', now()->toDateString())
                ->with(['tenant', 'property', 'booking.room'])
                ->orderBy('due_date', 'asc');

            $dueSoonInvoicesQuery = Invoice::where('landlord_id', $landlordId)
                ->whereIn('status', ['pending', 'overdue'])
                ->whereNotNull('due_date')
                ->whereBetween('due_date', [now()->toDateString(), now()->addDays(7)->toDateString()])
                ->with(['tenant', 'property', 'booking.room'])
                ->orderBy('due_date', 'asc');

            if ($assignedPropertyIds) {
                $overdueInvoicesQuery->whereIn('property_id', $assignedPropertyIds);
                $dueSoonInvoicesQuery->whereIn('property_id', $assignedPropertyIds);
            }

            $overdueInvoices = $overdueInvoicesQuery->get();
            $dueSoonInvoices = $dueSoonInvoicesQuery->get();
        }

        $dueForBilling = $dueForBillingQuery->get();
        $vacatingSoon = $vacatingSoonQuery->get();

        return [
            'upcomingCheckouts' => $checkoutsQuery->get(),
            'unpaidBookings' => $unpaidBookings,
            'vacatingSoon' => $vacatingSoon,
            'billingHealth' => [
                'due_for_billing_count' => $dueForBilling->count(),
                'due_for_billing' => $dueForBilling,
                'overdue_invoices_count' => $overdueInvoices->count(),
                'overdue_invoices_amount' => (float) round($overdueInvoices->sum(fn (Invoice $invoice) => $invoice->amount_cents) / 100, 2),
                'due_soon_invoices_count' => $dueSoonInvoices->count(),
                'due_soon_invoices_amount' => (float) round($dueSoonInvoices->sum(fn (Invoice $invoice) => $invoice->amount_cents) / 100, 2),
                'overdue_invoices' => $overdueInvoices,
                'due_soon_invoices' => $dueSoonInvoices,
            ],
        ];
    }

    public function getPropertyPerformance(int $landlordId, ?array $assignedPropertyIds)
    {
        $propertiesQuery = Property::where('landlord_id', $landlordId)->with(['rooms']);
        if ($assignedPropertyIds) {
            $propertiesQuery->whereIn('id', $assignedPropertyIds);
        }

        $properties = $propertiesQuery->get();

        // Aggregate actual collected revenue from the ledger source of truth.
        $revenueByProperty = PaymentTransaction::query()
            ->join('invoices', 'payment_transactions.invoice_id', '=', 'invoices.id')
            ->where('invoices.landlord_id', $landlordId)
            ->whereNotNull('invoices.property_id')
            ->where('payment_transactions.amount_cents', '>', 0)
            ->whereIn('payment_transactions.status', ['succeeded', 'paid', 'partially_refunded', 'refunded'])
            ->when($assignedPropertyIds, function ($query) use ($assignedPropertyIds) {
                $query->whereIn('invoices.property_id', $assignedPropertyIds);
            })
            ->select(
                'invoices.property_id',
                DB::raw('COALESCE(SUM(payment_transactions.amount_cents - payment_transactions.refunded_amount_cents), 0) as total_paid_cents')
            )
            ->groupBy('invoices.property_id')
            ->pluck('total_paid_cents', 'invoices.property_id')
            ->map(fn ($totalPaidCents) => (float) round(((int) $totalPaidCents) / 100, 2));

        return [
            'properties' => $properties,
            'revenueByProperty' => $revenueByProperty,
        ];
    }

    public function getRevenueChart(int $landlordId)
    {
        $startDate = now()->subMonths(5)->startOfMonth();
        
        // Single optimized grouped query instead of a loop
        $results = Booking::where('landlord_id', $landlordId)
            ->where('status', 'confirmed')
            ->where('payment_status', 'paid')
            ->where('created_at', '>=', $startDate)
            ->selectRaw('DATE_FORMAT(created_at, "%b") as month, SUM(monthly_rent) as total')
            ->groupBy('month')
            ->orderBy('created_at', 'asc')
            ->pluck('total', 'month')
            ->toArray();

        // Fill in missing months with zero
        $revenueData = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthName = now()->subMonths($i)->format('M');
            $revenueData[$monthName] = (float)($results[$monthName] ?? 0);
        }

        return $revenueData;
    }

}
