<?php

namespace App\Observers;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Models\MaintenanceRequest;
use App\Models\Room;
use App\Models\Property;
use App\Models\TransferRequest;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class LandlordDashboardObserver
{
    public function saved($model)
    {
        $this->logActivity($model);
    }

    public function created($model)
    {
        $this->logActivity($model);
    }

    protected function logActivity($model)
    {
        try {
            $landlordId = $this->resolveLandlordId($model);
            if (!$landlordId) return;

            $payload = $this->formatPayload($model);
            if (!$payload) return;

            $redisKey = "landlord_activities_{$landlordId}";
            
            // Push to list and trim to keep only latest 100
            if (extension_loaded('redis')) {
                Redis::lpush($redisKey, json_encode($payload));
                Redis::ltrim($redisKey, 0, 99);
            }

            // Invalidate all dashboard bundles for this landlord across all users/caretakers
            \Illuminate\Support\Facades\Cache::tags(["landlord_dashboard_{$landlordId}"])->flush();

            // Also invalidate the stats cache fragment
            \Illuminate\Support\Facades\Cache::forget("landlord_stats_{$landlordId}_landlord");
            \Illuminate\Support\Facades\Cache::forget("landlord_stats_{$landlordId}_caretaker");
            
        } catch (\Throwable $e) {
            Log::error("Failed to log landlord activity: " . $e->getMessage());
        }
    }

    protected function resolveLandlordId($model): ?int
    {
        if (isset($model->landlord_id)) return $model->landlord_id;
        
        if ($model instanceof Room) {
            return $model->property?->landlord_id;
        }

        if ($model instanceof PaymentTransaction) {
            return $model->invoice?->landlord_id;
        }

        return null;
    }

    protected function formatPayload($model): ?array
    {
        $timestamp = now()->toIso8601String();
        
        if ($model instanceof Booking) {
            $status = strtolower((string) $model->status);
            return [
                'id' => $model->id, 'type' => 'booking',
                'action' => $model->wasRecentlyCreated ? 'New booking request' : 'Booking status updated',
                'description' => ($model->tenant->first_name ?? 'Someone') . ' - ' . ($model->property->title ?? 'Property'),
                'by' => ($model->tenant->full_name ?? 'Tenant'),
                'status' => $status,
                'timestamp' => $timestamp,
                'icon' => 'calendar',
                'color' => $this->mapStatusToColor('booking', $status),
            ];
        }

        if ($model instanceof PaymentTransaction) {
            $status = strtolower((string) $model->status);
            $amount = number_format(abs($model->amount_cents) / 100, 2);
            return [
                'id' => $model->id, 'type' => 'payment',
                'action' => 'Payment received',
                'description' => "₱{$amount} received for Room " . ($model->invoice?->booking?->room?->room_number ?? 'N/A'),
                'by' => ($model->tenant->full_name ?? 'Tenant'),
                'status' => $status,
                'timestamp' => $timestamp,
                'icon' => 'cash-outline',
                'color' => 'green',
            ];
        }

        if ($model instanceof MaintenanceRequest) {
            $status = strtolower((string) $model->status);
            return [
                'id' => $model->id, 'type' => 'maintenance',
                'action' => 'Maintenance Request ' . ucfirst($status),
                'description' => $model->title,
                'by' => ($model->tenant->full_name ?? 'Tenant'),
                'status' => $status,
                'timestamp' => $timestamp,
                'icon' => 'wrench',
                'color' => $this->mapStatusToColor('maintenance', $status),
            ];
        }

        return null;
    }

    protected function mapStatusToColor($type, $status): string
    {
        if (in_array($status, ['pending', 'processing'])) return 'yellow';
        if (in_array($status, ['confirmed', 'completed', 'paid', 'approved'])) return 'green';
        if (in_array($status, ['cancelled', 'rejected', 'failed'])) return 'red';
        return 'blue';
    }
}
