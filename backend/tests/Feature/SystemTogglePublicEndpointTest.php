<?php

namespace Tests\Feature;

use App\Support\SystemToggle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SystemTogglePublicEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_system_toggles_endpoint_reflects_current_values(): void
    {
        SystemToggle::setBool('tenant_payments_disabled', true, null);
        SystemToggle::setBool('invoice_paymongo_disabled', true, null);
        SystemToggle::setBool('reservation_fee_disabled', false, null);

        $response = $this->getJson('/api/system/toggles');

        $response
            ->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'tenant_payments_disabled' => true,
                    'invoice_paymongo_disabled' => true,
                    'reservation_fee_disabled' => false,
                ],
            ]);
    }
}
