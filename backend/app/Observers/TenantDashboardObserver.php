<?php

namespace App\Observers;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Events\DashboardUpdated;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class TenantDashboardObserver
{
    public function saved($model)
    {
        $this->logActivity($model);
        $this->invalidate($model);
    }

    public function created($model)
    {
        $this->logActivity($model);
        $this->invalidate($model);
    }

    public function deleted($model)
    {
        $this->invalidate($model);
    }

    protected function logActivity($model)
    {
        try {
            $tenantId = $this->resolveTenantId($model);
            if (!$tenantId) return;

            $payload = $this->formatPayload($model);
            if (!$payload) return;

            $redisKey = "tenant_activities_{$tenantId}";
            Redis::lpush($redisKey, json_encode($payload));
            Redis::ltrim($redisKey, 0, 49); // Keep only last 50
        } catch (\Exception $e) {
            Log::error("Failed to log tenant activity: " . $e->getMessage());
        }
    }

    protected function resolveTenantId($model): ?int
    {
        return $model->tenant_id ?? null;
    }

    protected function formatPayload($model): ?array
    {
        $timestamp = now()->toIso8601String();
        
        if ($model instanceof Booking) {
            return [
                'type' => 'event',
                'action' => 'Booking Status Updated',
                'description' => "Your booking for " . ($model->property->title ?? 'Property') . " is now " . $model->status,
                'status' => $model->status,
                'timestamp' => $timestamp,
            ];
        }

        if ($model instanceof PaymentTransaction && $model->status === 'succeeded') {
            return [
                'type' => 'payment',
                'action' => 'Payment Successful',
                'description' => "Paid ₱" . number_format($model->amount_cents, 2) . " via " . $model->method,
                'status' => 'paid',
                'timestamp' => $timestamp,
            ];
        }

        return null;
    }

    protected function invalidate($model)
    {
        $tenantId = $this->resolveTenantId($model);

        if ($tenantId) {
            Cache::forget("tenant_dashboard_{$tenantId}");
            Cache::forget("tenant_stay_details_{$tenantId}");
            Cache::forget("tenant_payment_breakdown_{$tenantId}");
            
            try {
                broadcast(new DashboardUpdated((int) $tenantId));
            } catch (\Exception $e) {
                // Silent fail
            }
        }
    }
}
