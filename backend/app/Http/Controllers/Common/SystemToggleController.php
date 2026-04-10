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
                'mobile_latest_version' => SystemToggle::getString('mobile_latest_version', '1.0.0'),
                'mobile_download_url' => SystemToggle::getString('mobile_download_url', 'https://accommotrack.me/downloads/AccommoTrack.apk'),
                'mobile_force_update' => SystemToggle::getBool('mobile_force_update', true),
            ],
            'message' => '',
        ]);
    }
}
