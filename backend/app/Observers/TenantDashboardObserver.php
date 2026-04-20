<?php

namespace App\Observers;

use App\Models\Booking;
use App\Models\Invoice;
use App\Models\PaymentTransaction;
use App\Events\DashboardUpdated;
use Illuminate\Support\Facades\Cache;

class TenantDashboardObserver
{
    public function saved($model)
    {
        $this->invalidate($model);
    }

    public function deleted($model)
    {
        $this->invalidate($model);
    }

    protected function invalidate($model)
    {
        $tenantId = null;

        if ($model instanceof Booking) {
            $tenantId = $model->tenant_id;
        } elseif ($model instanceof Invoice) {
            $tenantId = $model->tenant_id;
        } elseif ($model instanceof PaymentTransaction) {
            $tenantId = $model->tenant_id;
        }

        if ($tenantId) {
            Cache::forget("tenant_dashboard_{$tenantId}");
            
            try {
                broadcast(new DashboardUpdated((int) $tenantId));
            } catch (\Exception $e) {
                \Log::error('Dashboard broadcast failed: '.$e->getMessage());
            }
        }
    }
}
