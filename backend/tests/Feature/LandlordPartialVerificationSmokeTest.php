<?php

namespace Tests\Feature;

use App\Models\LandlordVerification;
use App\Models\LandlordVerificationHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LandlordPartialVerificationSmokeTest extends TestCase
{
    use RefreshDatabase;

    public function test_partial_verified_landlord_can_resubmit_and_admin_can_view_previous_and_current_submissions(): void
    {
        $disk = config('filesystems.default', 'local');
        Storage::fake($disk);

        $landlord = User::create([
            'role' => 'landlord',
            'email' => 'partial-landlord@example.com',
            'first_name' => 'Partial',
            'middle_name' => null,
            'last_name' => 'Landlord',
            'password' => Hash::make('Password12!'),
            'date_of_birth' => now()->subYears(25)->toDateString(),
            'is_verified' => false,
            'is_active' => true,
        ]);

        $verification = LandlordVerification::create([
            'user_id' => $landlord->id,
            'first_name' => $landlord->first_name,
            'middle_name' => $landlord->middle_name,
            'last_name' => $landlord->last_name,
            'valid_id_type' => 'Philippine Passport',
            'valid_id_other' => null,
            'valid_id_path' => 'landlord_ids/original-id.jpg',
            'permit_path' => 'landlord_permits/original-permit.pdf',
            'status' => LandlordVerification::STATUS_PARTIAL_VERIFIED,
            'document_due_at' => now()->addDays(7),
        ]);

        Sanctum::actingAs($landlord);

        $resubmitResponse = $this->postJson('/api/landlord/resubmit-verification', [
            'valid_id_type' => 'Philippine Passport',
            'valid_id' => UploadedFile::fake()->image('new-id.jpg'),
            'permit' => UploadedFile::fake()->create('new-permit.pdf', 150, 'application/pdf'),
        ]);

        $resubmitResponse
            ->assertOk()
            ->assertJsonPath('verification.status', LandlordVerification::STATUS_PENDING_DOCUMENTS_REVIEW);

        $verification->refresh();

        $this->assertSame(LandlordVerification::STATUS_PENDING_DOCUMENTS_REVIEW, $verification->status);
        $this->assertNull($verification->document_due_at);
        $this->assertStringContainsString('landlord_ids/', $verification->valid_id_path);
        $this->assertStringContainsString('landlord_permits/', $verification->permit_path);

        Storage::disk($disk)->assertExists($verification->valid_id_path);
        Storage::disk($disk)->assertExists($verification->permit_path);

        $historyEntries = LandlordVerificationHistory::where('landlord_verification_id', $verification->id)
            ->orderBy('id')
            ->get();

        $this->assertCount(1, $historyEntries);
        $this->assertSame(LandlordVerification::STATUS_PARTIAL_VERIFIED, $historyEntries[0]->status);
        $this->assertSame('landlord_ids/original-id.jpg', $historyEntries[0]->valid_id_path);
        $this->assertSame('landlord_permits/original-permit.pdf', $historyEntries[0]->permit_path);

        $admin = User::create([
            'role' => 'admin',
            'email' => 'admin-smoke@example.com',
            'first_name' => 'Admin',
            'middle_name' => null,
            'last_name' => 'Smoke',
            'password' => Hash::make('Password12!'),
            'date_of_birth' => now()->subYears(30)->toDateString(),
            'is_verified' => true,
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $adminResponse = $this->getJson('/api/admin/landlord-verifications');
        $adminResponse->assertOk();

        $record = collect($adminResponse->json())->firstWhere('id', $verification->id);

        $this->assertNotNull($record);
        $this->assertSame(LandlordVerification::STATUS_PENDING_DOCUMENTS_REVIEW, $record['status']);
        $this->assertArrayHasKey('history', $record);
        $this->assertNotEmpty($record['history']);
        $this->assertStringContainsString('/storage/landlord_ids/', (string) $record['valid_id_path']);
        $this->assertStringContainsString('/storage/landlord_permits/', (string) $record['permit_path']);

        $latestHistory = $record['history'][0] ?? null;
        $this->assertNotNull($latestHistory);
        $this->assertSame(LandlordVerification::STATUS_PARTIAL_VERIFIED, $latestHistory['status']);
        $this->assertStringContainsString('original-id', (string) $latestHistory['valid_id_path']);
        $this->assertStringContainsString('original-permit', (string) $latestHistory['permit_path']);
    }
}
