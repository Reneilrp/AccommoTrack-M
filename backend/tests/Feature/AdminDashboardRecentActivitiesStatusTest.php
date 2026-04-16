<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminDashboardRecentActivitiesStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_recent_activities_classify_property_statuses_without_mislabeling_drafts(): void
    {
        $admin = $this->createUser('admin', 'admin-dashboard-activity');
        $landlord = $this->createUser('landlord', 'landlord-dashboard-activity');

        $draftProperty = $this->createProperty($landlord, 'Draft Activity Property', Property::STATUS_DRAFT);
        $inactiveProperty = $this->createProperty($landlord, 'Inactive Activity Property', Property::STATUS_INACTIVE);
        $maintenanceProperty = $this->createProperty($landlord, 'Maintenance Activity Property', Property::STATUS_MAINTENANCE);
        $pendingProperty = $this->createProperty($landlord, 'Pending Activity Property', Property::STATUS_PENDING);
        $activeProperty = $this->createProperty($landlord, 'Active Activity Property', Property::STATUS_ACTIVE);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/dashboard/recent-activities');
        $response->assertOk();

        $activities = collect($response->json());

        $draftActivity = $this->findActivityByPropertyTitle($activities, $draftProperty->title);
        $this->assertNotNull($draftActivity);
        $this->assertSame('property', $draftActivity['type'] ?? null);
        $this->assertSame('Property Saved as Draft', $draftActivity['title'] ?? null);
        $this->assertSame('Draft', $draftActivity['badge'] ?? null);

        $inactiveActivity = $this->findActivityByPropertyTitle($activities, $inactiveProperty->title);
        $this->assertNotNull($inactiveActivity);
        $this->assertSame('rejection', $inactiveActivity['type'] ?? null);
        $this->assertSame('Property Rejected', $inactiveActivity['title'] ?? null);
        $this->assertSame('Rejected', $inactiveActivity['badge'] ?? null);

        $maintenanceActivity = $this->findActivityByPropertyTitle($activities, $maintenanceProperty->title);
        $this->assertNotNull($maintenanceActivity);
        $this->assertSame('property', $maintenanceActivity['type'] ?? null);
        $this->assertSame('Property Put Under Maintenance', $maintenanceActivity['title'] ?? null);
        $this->assertSame('Maintenance', $maintenanceActivity['badge'] ?? null);

        $pendingActivity = $this->findActivityByPropertyTitle($activities, $pendingProperty->title);
        $this->assertNotNull($pendingActivity);
        $this->assertSame('Property Submitted', $pendingActivity['title'] ?? null);
        $this->assertSame('Pending', $pendingActivity['badge'] ?? null);

        $activeActivity = $this->findActivityByPropertyTitle($activities, $activeProperty->title);
        $this->assertNotNull($activeActivity);
        $this->assertSame('Property Approved', $activeActivity['title'] ?? null);
        $this->assertSame('Approved', $activeActivity['badge'] ?? null);
    }

    private function findActivityByPropertyTitle($activities, string $title): ?array
    {
        return $activities->first(function ($activity) use ($title) {
            return str_contains((string) ($activity['description'] ?? ''), $title);
        });
    }

    private function createUser(string $role, string $prefix): User
    {
        return User::create([
            'role' => $role,
            'email' => $prefix.'@example.com',
            'password' => Hash::make('password'),
            'first_name' => ucfirst($role),
            'last_name' => 'Tester',
            'phone' => '09170001234',
            'is_verified' => true,
            'is_active' => true,
        ]);
    }

    private function createProperty(User $landlord, string $title, string $status): Property
    {
        return Property::create([
            'landlord_id' => $landlord->id,
            'title' => $title,
            'description' => 'Property activity test',
            'property_type' => 'dormitory',
            'sex_restriction' => 'mixed',
            'current_status' => $status,
            'street_address' => '123 Activity Street',
            'city' => 'Zamboanga City',
            'province' => 'Zamboanga del Sur',
        ]);
    }
}
