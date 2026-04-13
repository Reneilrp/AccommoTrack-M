<?php

namespace Tests\Feature;

use App\Models\LandlordVerification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AnalyticsExportCsvTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_landlord_can_export_analytics_csv_with_expected_headers_and_core_rows(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-05 10:00:00'));

        $landlord = $this->createApprovedLandlord();
        Sanctum::actingAs($landlord);

        $response = $this->get('/api/landlord/analytics/export-csv?time_range=month&start_date=2026-03-01&end_date=2026-03-31');

        $response
            ->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8')
            ->assertHeader('Content-Disposition', 'attachment; filename="AccommoTrack_Analytics_month_2026-04-05.csv"');

        $content = $response->getContent();

        $this->assertTrue(str_starts_with($content, "\xEF\xBB\xBF"));

        $csv = substr($content, 3);
        $this->assertStringContainsString('"AccommoTrack Analytics Report"', $csv);
        $this->assertStringContainsString('"Time Range",MONTH', $csv);
        $this->assertStringContainsString('"Start Date",2026-03-01', $csv);
        $this->assertStringContainsString('"End Date",2026-03-31', $csv);
        $this->assertStringContainsString('Section,Metric,Value', $csv);
    }

    public function test_landlord_export_csv_rejects_invalid_custom_date_window(): void
    {
        $landlord = $this->createApprovedLandlord();
        Sanctum::actingAs($landlord);

        $response = $this->getJson('/api/landlord/analytics/export-csv?time_range=month&start_date=2026-03-31&end_date=2026-03-01');

        $response
            ->assertStatus(422)
            ->assertJsonPath('message', 'Invalid export window. end_date must be greater than or equal to start_date.');
    }

    private function createApprovedLandlord(): User
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-analytics-export-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Analytics',
            'last_name' => 'Owner',
            'phone' => '09170003333',
            'is_verified' => true,
            'is_active' => true,
        ]);

        LandlordVerification::create([
            'user_id' => $landlord->id,
            'first_name' => 'Analytics',
            'middle_name' => null,
            'last_name' => 'Owner',
            'valid_id_type' => 'passport',
            'valid_id_path' => 'verifications/test-valid-id.jpg',
            'permit_path' => 'verifications/test-permit.jpg',
            'status' => 'approved',
            'reviewed_at' => now(),
        ]);

        return $landlord;
    }
}