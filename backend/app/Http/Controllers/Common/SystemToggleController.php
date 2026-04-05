<?php

namespace App\Http\Controllers\Common;

use App\Http\Controllers\Controller;
use App\Support\SystemToggle;

class SystemToggleController extends Controller
{
    /**
     * Public, read-only system toggles used by web/mobile UI.
     */
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'tenant_payments_disabled' => SystemToggle::getBool('tenant_payments_disabled', (bool) config('app.tenant_payments_disabled', false)),
                'reservation_fee_disabled' => SystemToggle::getBool('reservation_fee_disabled', (bool) config('app.reservation_fee_disabled', false)),
            ],
            'message' => '',
        ]);
    }
}
