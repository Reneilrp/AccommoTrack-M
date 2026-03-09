<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\User;
use App\Models\Addon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Invoice;

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
        $totalPaidCents = Invoice::where('tenant_id', $tenantId)->where('status', 'paid')->sum('amount_cents');
        
        $unreadNotifications = User::find($tenantId)->unreadNotifications()->count();

        $bookings = [
            'active' => $activeBookings, 
            'confirmed' => $confirmedBookings, 
            'pending' => $pendingBookings
        ];
        $payments = [
            'monthlyDue' => (float)($monthlyDueCents/100), 
            'totalDue' => (float)($totalDueCents/100), 
            'totalPaid' => (float)($totalPaidCents/100)
        ];
        $notifications = [
            'unread' => $unreadNotifications
        ];

        return [
            compact('bookings', 'payments', 'notifications')
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

    public function getCurrentStay(int $tenantId): ?Booking
    {
        return Booking::where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->with([
                'room.images', 'property.landlord', 'property.images', 'landlord', 'review',
                'addons' => fn ($q) => $q->wherePivotIn('status', ['approved', 'active', 'pending']),
                'payments' => fn ($q) => $q->orderBy('payment_date', 'desc'),
                'invoices' => fn ($q) => $q->orderBy('due_date', 'desc')->with('transactions'),
            ])
            ->first();
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
    
    public function getHistory(int $tenantId)
    {
        return Booking::where('tenant_id', $tenantId)
            ->where(function ($query) {
                $query->where('end_date', '<', now())
                      ->orWhereIn('status', ['pending', 'confirmed', 'cancelled', 'completed', 'partial-completed']);
            })
            ->with(['room', 'property', 'landlord', 'addons' => fn($q) => $q->wherePivotIn('status', ['active', 'completed']), 'payments', 'invoices.transactions', 'review'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);
    }
    
    public function getAvailableAddonsForActiveBooking(int $tenantId)
    {
        $booking = $this->getActiveBooking($tenantId);
        if (!$booking) return null;

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
        $booking = $this->getActiveBooking($tenantId);
        if (!$booking) {
            throw new \Exception('No active booking found');
        }

        $addon = Addon::where('id', $data['addon_id'])
            ->where('property_id', $booking->property_id)
            ->where('is_active', true)
            ->firstOrFail();

        if ($booking->addons()->where('addon_id', $addon->id)->wherePivotNotIn('status', ['rejected', 'cancelled', 'completed'])->exists()) {
            throw new \Exception('You already have an active request for this addon');
        }

        if ($addon->addon_type === 'rental' && !$addon->hasStock()) {
            throw new \Exception('This addon is currently out of stock');
        }

        $booking->addons()->attach($addon->id, [
            'quantity' => $data['quantity'] ?? 1,
            'price_at_booking' => $addon->price,
            'status' => 'pending',
            'request_note' => $data['note'] ?? null,
            'created_at' => now(),
            'updated_at' => now()
        ]);
        
        return $addon;
    }

    public function cancelAddonRequestForActiveBooking(int $tenantId, int $addonId): void
    {
        $booking = $this->getActiveBooking($tenantId);
        if (!$booking) {
            throw new \Exception('No active booking found');
        }

        $addonRequest = $booking->addons()->where('addon_id', $addonId)->wherePivot('status', 'pending')->first();
        if (!$addonRequest) {
            throw new \Exception('No pending request found for this addon');
        }

        $booking->addons()->updateExistingPivot($addonId, ['status' => 'cancelled', 'updated_at' => now()]);
    }
    
    private function getActiveBooking(int $tenantId, array $relations = []): ?Booking
    {
        return Booking::where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->with($relations)
            ->first();
    }
}
