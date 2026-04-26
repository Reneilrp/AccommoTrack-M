<?php

namespace App\Services;

use App\Events\GlobalCountersUpdated;
use App\Models\Addon;
use App\Models\Booking;
use App\Models\MaintenanceRequest;
use App\Models\Message;
use App\Models\User;
use App\Models\PaymentTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class UserCounterService
{
    /**
     * Get the consolidated counter bundle for a user.
     */
    public function getCounters(User $user): array
    {
        $userId = $user->id;
        $cacheKey = "user_counters_{$userId}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($user, $userId) {
            $role = $user->role;

            // 1. Messages (Universal)
            $messageCount = Message::where('receiver_id', $userId)
                ->where('is_read', false)
                ->count();

            // 2. Notifications (Universal)
            $notificationCount = $user->unreadNotifications()->count();

            $counters = [
                'messages' => $messageCount,
                'notifications' => $notificationCount,
                'maintenance' => 0,
                'addons' => 0,
                'payments' => 0,
            ];

            if ($role === 'tenant') {
                // Tenant Maintenance: Count requests with new updates (simplified to active requests for now)
                $counters['maintenance'] = MaintenanceRequest::where('tenant_id', $userId)
                    ->whereIn('status', ['pending', 'in_progress'])
                    ->count();
            } else {
                // Landlord / Caretaker Scoping
                $landlordId = ($role === 'landlord') ? $userId : $user->caretakerAssignment?->landlord_id;
                
                if (!$landlordId) return $counters;

                $allowedPropertyIds = null;
                if ($role === 'caretaker' && $user->caretakerAssignment) {
                    $allowedPropertyIds = $user->caretakerAssignment->getAssignedPropertyIds();
                    
                    // If caretaker has no assigned properties, they see nothing
                    if (empty($allowedPropertyIds)) {
                        return $counters;
                    }
                }

                // Maintenance (Pending)
                $maintenanceQuery = MaintenanceRequest::where('landlord_id', $landlordId)->where('status', 'pending');
                if ($allowedPropertyIds) $maintenanceQuery->whereIn('property_id', $allowedPropertyIds);
                $counters['maintenance'] = $maintenanceQuery->count();

                // Addons (Pending Requests)
                $addonQuery = DB::table('booking_addons')
                    ->join('addons', 'booking_addons.addon_id', '=', 'addons.id')
                    ->where('addons.landlord_id', $landlordId)
                    ->where('booking_addons.status', 'pending');
                if ($allowedPropertyIds) $addonQuery->whereIn('addons.property_id', $allowedPropertyIds);
                $counters['addons'] = $addonQuery->count();

                // Payments (Awaiting Verification)
                $paymentQuery = PaymentTransaction::where('status', 'pending_offline')
                    ->whereHas('invoice', function($q) use ($landlordId, $allowedPropertyIds) {
                        $q->where('landlord_id', $landlordId);
                        if ($allowedPropertyIds) $q->whereIn('property_id', $allowedPropertyIds);
                    });
                $counters['payments'] = $paymentQuery->count();
            }

            return $counters;
        });
    }

    /**
     * Calculate and broadcast updated counters for a user.
     */
    public function broadcastCounters(int $userId): void
    {
        try {
            $user = User::find($userId);
            if (!$user) return;

            // Invalidate cache before re-calculating and broadcasting
            Cache::forget("user_counters_{$userId}");

            $counters = $this->getCounters($user);
            broadcast(new GlobalCountersUpdated($userId, $counters))->toOthers();
            
            Log::info("Counters broadcasted for user #{$userId}", ['counters' => $counters]);
        } catch (\Throwable $e) {
            Log::error("Failed to broadcast global counters for user #{$userId}", ['error' => $e->getMessage()]);
        }
    }
}
