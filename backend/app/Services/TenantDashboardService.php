<?php

namespace App\Services;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Models\User;

class TenantDashboardService
{
    public function getStats(int $tenantId): array
    {
        // 1. Optimized Booking Stats (Single Query)
        $bookingStats = Booking::where('tenant_id', $tenantId)
            ->selectRaw("
                COUNT(CASE WHEN status IN ('pending', 'confirmed') THEN 1 END) as active,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
            ")
            ->first();

        // 2. Optimized Invoice Stats & Sums (Single Query)
        $now = now();
        $invoiceStats = Invoice::where('tenant_id', $tenantId)
            ->selectRaw("
                SUM(CASE WHEN status IN ('pending', 'partial', 'overdue') AND MONTH(due_date) = ? AND YEAR(due_date) = ? THEN amount_cents ELSE 0 END) as monthly_due_cents,
                SUM(CASE WHEN status IN ('pending', 'partial', 'overdue') THEN amount_cents ELSE 0 END) as total_due_cents,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as count_pending,
                COUNT(CASE WHEN status = 'partial' THEN 1 END) as count_partial,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as count_overdue,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as count_paid,
                EXISTS(SELECT 1 FROM invoices as sub WHERE sub.tenant_id = ? AND sub.status = 'overdue') as has_overdue
            ", [$now->month, $now->year, $tenantId])
            ->first();

        // 3. Paid Amount Calculation
        $totalPaidCents = PaymentTransaction::where('tenant_id', $tenantId)
            ->where('amount_cents', '>', 0)
            ->whereIn('status', ['succeeded', 'paid', 'partially_refunded', 'refunded'])
            ->selectRaw('SUM(amount_cents - COALESCE(refunded_amount_cents, 0)) as net_cents')
            ->value('net_cents') ?? 0;

        // 4. Latest unpaid invoice
        $latestUnpaidInvoice = Invoice::where('tenant_id', $tenantId)
            ->whereIn('status', ['pending', 'partial', 'overdue'])
            ->orderBy('due_date', 'asc')
            ->first();

        $unreadNotifications = User::find($tenantId)->unreadNotifications()->count();
        $walletBalanceCents = \App\Models\TenantCredit::getBalance($tenantId);

        return [
            'bookings' => [
                'active' => (int)($bookingStats->active ?? 0),
                'confirmed' => (int)($bookingStats->confirmed ?? 0),
                'pending' => (int)($bookingStats->pending ?? 0),
            ],
            'payments' => [
                'monthlyDue' => (float) (($invoiceStats->monthly_due_cents ?? 0) / 100),
                'totalDue' => (float) (($invoiceStats->total_due_cents ?? 0) / 100),
                'totalPaid' => (float) ($totalPaidCents / 100),
                'walletBalance' => (float) ($walletBalanceCents / 100),
                'pendingAmount' => (float) (($invoiceStats->total_due_cents ?? 0) / 100),
                'latestUnpaidInvoiceId' => $latestUnpaidInvoice ? $latestUnpaidInvoice->id : null,
                'hasOverdueInvoices' => (bool) ($invoiceStats->has_overdue ?? false),
                'invoice_breakdown' => [
                    'pending' => (int) ($invoiceStats->count_pending ?? 0),
                    'partial' => (int) ($invoiceStats->count_partial ?? 0),
                    'overdue' => (int) ($invoiceStats->count_overdue ?? 0),
                    'paid' => (int) ($invoiceStats->count_paid ?? 0),
                ],
            ],
            'notifications' => [
                'unread' => $unreadNotifications,
            ],
        ];
    }
    // private function getBookingConfirmed($bookings){
    //     return  $bookings['status'] === 'confirmed';
    // }

    public function getRecentActivities(int $tenantId)
    {
        return Booking::where('tenant_id', $tenantId)
            ->with(['landlord', 'property', 'room'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();
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
            $query->whereIn('status', ['confirmed', 'active', 'completed', 'partial-completed'])
                  // Lease hasn't ended OR it's past end_date but still 'confirmed' (overdue)
                ->where(function ($q) {
                    $q->where('end_date', '>=', now()->startOfDay())
                        ->orWhereIn('status', ['confirmed', 'active']);
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
                    ->orWhereIn('status', ['cancelled', 'rejected', 'completed', 'partial-completed']);
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
                ->whereIn('status', ['confirmed', 'completed', 'partial-completed'])
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
                'price' => 0, // Landlord will set the price upon approval
                'price_type' => $data['price_type'],
                'addon_type' => $data['addon_type'],
                'is_active' => false, // Inactive so it's not visible to all
                'is_custom' => true,
                'request_tenant_id' => $tenantId,
            ]);
        } else {
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
            'price_at_booking' => $addon->price,
            'status' => 'pending',
            'request_note' => trim(($data['note'] ?? '').($suggestedPrice ? ' | Suggested price: ₱'.number_format((float) $suggestedPrice, 2) : '')),
            'created_at' => now(),
            'updated_at' => now(),
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
                    $expectedAmount = (int) round($addonRequest->pivot->price_at_booking * $addonRequest->pivot->quantity * 100);
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
                    });
            })
            ->withCount('occupants')
            ->with($relations)
            ->orderByDesc('start_date')
            ->first();
    }
}
