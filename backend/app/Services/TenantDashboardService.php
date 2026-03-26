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
        $activeBookings = Booking::where('tenant_id', $tenantId)->whereIn('status', ['pending', 'confirmed'])->count();
        $confirmedBookings = Booking::where('tenant_id', $tenantId)->where('status', 'confirmed')->count();
        $pendingBookings = Booking::where('tenant_id', $tenantId)->where('status', 'pending')->count();

        // $bookingStats = Booking::where('tenant_id', $tenantId)
        //     ->whereIn('status', ['pending', 'confirmed'])
        //     ->selectRaw("status, count(*) as count")
        //     ->groupBy('status')
        //     ->pluck('count', 'status');

        // $pendingBookings = $bookingStats['pending'] ?? 0;
        // $confirmedBookings = $this->getBookingConfirmed($bookingStats) ? $bookingStats['confirmed'] ?? 0 : 0;
        // $activeBookings = $pendingBookings + $confirmedBookings;

        $monthlyDueCents = Invoice::where('tenant_id', $tenantId)->whereIn('status', ['pending', 'partial', 'overdue'])->whereMonth('due_date', now()->month)->whereYear('due_date', now()->year)->sum('amount_cents');
        $totalDueCents = Invoice::where('tenant_id', $tenantId)->whereIn('status', ['pending', 'partial', 'overdue'])->sum('amount_cents');

        // Calculate net total paid (Amount - Refunded) from all successful transactions
        // We only sum positive transactions to avoid double-counting the negative refund records
        $totalPaidCents = PaymentTransaction::where('tenant_id', $tenantId)
            ->where('amount_cents', '>', 0)
            ->whereIn('status', ['succeeded', 'paid', 'partially_refunded', 'refunded'])
            ->selectRaw('SUM(amount_cents - refunded_amount_cents) as net_cents')
            ->value('net_cents') ?? 0;

        $latestUnpaidInvoice = Invoice::where('tenant_id', $tenantId)
            ->whereIn('status', ['pending', 'partial', 'overdue'])
            ->orderBy('due_date', 'asc')
            ->first();

        $hasOverdueInvoices = Invoice::where('tenant_id', $tenantId)->where('status', 'overdue')->exists();

        $unreadNotifications = User::find($tenantId)->unreadNotifications()->count();

        $bookings = [
            'active' => $activeBookings,
            'confirmed' => $confirmedBookings,
            'pending' => $pendingBookings,
        ];
        $payments = [
            'monthlyDue' => (float) ($monthlyDueCents / 100),
            'totalDue' => (float) ($totalDueCents / 100),
            'totalPaid' => (float) ($totalPaidCents / 100),
            'pendingAmount' => (float) ($totalDueCents / 100),
            'latestUnpaidInvoiceId' => $latestUnpaidInvoice ? $latestUnpaidInvoice->id : null,
            'hasOverdueInvoices' => $hasOverdueInvoices,
            'invoice_breakdown' => [
                'pending' => Invoice::where('tenant_id', $tenantId)->where('status', 'pending')->count(),
                'partial' => Invoice::where('tenant_id', $tenantId)->where('status', 'partial')->count(),
                'overdue' => Invoice::where('tenant_id', $tenantId)->where('status', 'overdue')->count(),
                'paid' => Invoice::where('tenant_id', $tenantId)->where('status', 'paid')->count(),
            ],
        ];
        $notifications = [
            'unread' => $unreadNotifications,
        ];

        return compact('bookings', 'payments', 'notifications');
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
        return Booking::where('tenant_id', $tenantId)
            ->where(function ($query) {
                // Bookings that are confirmed, completed, or partial-completed
                $query->whereIn('status', ['confirmed', 'completed', 'partial-completed'])
                      // Lease hasn't ended OR it's past end_date but still 'confirmed' (overdue)
                    ->where(function($q) {
                        $q->where('end_date', '>=', now()->startOfDay())
                          ->orWhere('status', 'confirmed');
                    });
            })
            // Only bookings where the tenant is actually still actively assigned to the room!
            ->whereHas('room.tenants', function ($query) use ($tenantId) {
                $query->where('users.id', $tenantId);
            })
            ->with([
                'room.images', 'property.landlord', 'property.images', 'landlord', 'review',
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
        return Booking::where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->where('start_date', '>', now())
            ->with(['room', 'property.landlord', 'landlord'])
            ->orderBy('start_date', 'asc')
            ->first();
    }

    public function getPendingCheckInBookings(int $tenantId)
    {
        return Booking::where('tenant_id', $tenantId)
            ->whereIn('status', ['pending', 'confirmed'])
            ->where('start_date', '<=', now())
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
            'request_note' => trim(($data['note'] ?? '') . ($suggestedPrice ? ' | Suggested price: ₱' . number_format((float) $suggestedPrice, 2) : '')),
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
            ->where('addon_id', $addonId)
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
            $effectiveAt = now()->copy()->addMonthNoOverflow()->startOfMonth();

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
                    $q->where('status', 'confirmed');
                        // No end date restriction here for confirmed stays to show overdue ones
                })
                // OR recently completed bookings (last 30 days)
                    ->orWhere(function ($q) {
                        $q->whereIn('status', ['completed', 'partial-completed'])
                            ->where('end_date', '>=', now()->subDays(30));
                    });
            })
            ->with($relations)
            ->orderByDesc('start_date')
            ->first();
    }
}
