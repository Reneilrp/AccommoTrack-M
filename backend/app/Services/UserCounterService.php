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
            $landlordId = $user->effectiveLandlordId();

            // Default values
            $counters = [
                'messages' => 0,
                'notifications' => $user->unreadNotifications()->count(),
                'maintenance' => 0,
                'addons' => 0,
                'payments' => 0,
            ];

            if ($role === 'tenant') {
                // 1. Messages (Tenant)
                $counters['messages'] = Message::where('receiver_id', $userId)
                    ->where('is_read', false)
                    ->count();

                // 2. Maintenance (Tenant)
                $counters['maintenance'] = MaintenanceRequest::where('tenant_id', $userId)
                    ->whereIn('status', ['pending', 'in_progress'])
                    ->count();
            } else {
                // Landlord / Caretaker Scoping
                if (!$landlordId) {
                    return $counters;
                }

                $allowedPropertyIds = null;
                if ($role === 'caretaker') {
                    if (!$user->caretakerAssignment) {
                        return $counters;
                    }
                    $allowedPropertyIds = $user->caretakerAssignment->getAssignedPropertyIds();
                    
                    // If caretaker has no assigned properties, they see nothing
                    if (empty($allowedPropertyIds)) {
                        return $counters;
                    }
                }

                // 1. Messages (Landlord / Caretaker)
                $messageQuery = Message::where('receiver_id', $landlordId)
                    ->where('is_read', false);

                if ($role === 'caretaker') {
                    $messageQuery->whereHas('conversation', function ($q) use ($userId, $allowedPropertyIds) {
                        $q->where(function ($q2) use ($userId) {
                            $q2->whereNull('caretaker_id')
                                ->orWhere('caretaker_id', $userId);
                        });
                        if ($allowedPropertyIds) {
                            $q->whereIn('property_id', $allowedPropertyIds);
                        }
                    });
                }
                $counters['messages'] = $messageQuery->count();

                // 2. Maintenance (Pending)
                $maintenanceQuery = MaintenanceRequest::where('landlord_id', $landlordId)->where('status', 'pending');
                if ($allowedPropertyIds) {
                    $maintenanceQuery->whereIn('property_id', $allowedPropertyIds);
                }
                $counters['maintenance'] = $maintenanceQuery->count();

                // 3. Addons (Pending Requests)
                $addonQuery = DB::table('booking_addons')
                    ->join('addons', 'booking_addons.addon_id', '=', 'addons.id')
                    ->where('addons.landlord_id', $landlordId)
                    ->where('booking_addons.status', 'pending');
                if ($allowedPropertyIds) {
                    $addonQuery->whereIn('addons.property_id', $allowedPropertyIds);
                }
                $counters['addons'] = $addonQuery->count();

                // 4. Payments (Awaiting Verification)
                $paymentQuery = PaymentTransaction::where('status', 'pending_offline')
                    ->whereHas('invoice', function ($q) use ($landlordId, $allowedPropertyIds) {
                        $q->where('landlord_id', $landlordId);
                        if ($allowedPropertyIds) {
                            $q->whereIn('property_id', $allowedPropertyIds);
                        }
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
