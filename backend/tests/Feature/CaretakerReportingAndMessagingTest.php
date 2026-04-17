<?php

namespace Tests\Feature;

use App\Models\CaretakerAssignment;
use App\Models\Conversation;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CaretakerReportingAndMessagingTest extends TestCase
{
    use RefreshDatabase;

    public function test_caretaker_can_submit_quick_property_report(): void
    {
        $scenario = $this->createBaseScenario();
        $this->assignCaretaker($scenario['landlord'], $scenario['caretaker'], $scenario['property']);

        Sanctum::actingAs($scenario['caretaker']);

        $response = $this->postJson('/api/landlord/property-reports', [
            'property_id' => $scenario['property']->id,
            'description' => 'Tested hallway light replacement and floor cleaning.',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('success', true);

        $this->assertDatabaseHas('audit_logs', [
            'domain' => 'caretaker_report',
            'property_id' => $scenario['property']->id,
            'summary' => 'Tested hallway light replacement and floor cleaning.',
            'actor_id' => $scenario['caretaker']->id,
        ]);
    }

    public function test_caretaker_report_shows_up_in_landlord_activities(): void
    {
        $scenario = $this->createBaseScenario();
        $this->assignCaretaker($scenario['landlord'], $scenario['caretaker'], $scenario['property']);

        \App\Models\AuditLog::create([
            'domain' => 'caretaker_report',
            'event' => 'property_activity_logged',
            'severity' => 'info',
            'actor_id' => $scenario['caretaker']->id,
            'actor_role' => 'caretaker',
            'property_id' => $scenario['property']->id,
            'landlord_id' => $scenario['landlord']->id,
            'summary' => 'This is a report for the dashboard.',
        ]);

        Sanctum::actingAs($scenario['landlord']);

        $response = $this->getJson('/api/landlord/dashboard/recent-activities');

        $response->assertStatus(200);
        $activities = $response->json();

        $reportActivity = collect($activities)->firstWhere('type', 'report');
        $this->assertNotNull($reportActivity);
        $this->assertEquals('Property Report / Log', $reportActivity['action']);
        $this->assertEquals('This is a report for the dashboard.', $reportActivity['description']);
    }

    public function test_caretaker_cannot_report_for_unassigned_property(): void
    {
        $scenario = $this->createBaseScenario();
        $this->assignCaretaker($scenario['landlord'], $scenario['caretaker'], $scenario['property']);

        $otherLandlord = User::create([
            'role' => 'landlord',
            'email' => 'other@example.com',
            'password' => Hash::make('password'),
            'first_name' => 'Other',
            'last_name' => 'Landlord',
            'phone' => '09170009999',
            'is_verified' => true,
            'is_active' => true,
        ]);

        $otherProperty = Property::create([
            'landlord_id' => $otherLandlord->id,
            'title' => 'Other Property',
            'property_type' => 'apartment',
            'street_address' => 'Addr',
            'city' => 'City',
            'province' => 'Prov',
            'country' => 'Philippines',
        ]);

        Sanctum::actingAs($scenario['caretaker']);

        $response = $this->postJson('/api/landlord/property-reports', [
            'property_id' => $otherProperty->id,
            'description' => 'Illegal report attempt.',
        ]);

        $response->assertStatus(403);
    }

    public function test_caretaker_can_start_direct_chat_with_landlord(): void
    {
        $scenario = $this->createBaseScenario();
        $this->assignCaretaker($scenario['landlord'], $scenario['caretaker'], $scenario['property']);

        Sanctum::actingAs($scenario['caretaker']);

        $response = $this->postJson('/api/messages/start-landlord-chat');

        $response->assertStatus(200);
        $response->assertJsonPath('other_user.id', $scenario['landlord']->id);

        $this->assertDatabaseHas('conversations', [
            'user_one_id' => $scenario['caretaker']->id,
            'user_two_id' => $scenario['landlord']->id,
        ]);
    }

    public function test_landlord_can_assign_caretaker_to_conversation(): void
    {
        $scenario = $this->createBaseScenario();
        $conversation = Conversation::create([
            'user_one_id' => $scenario['landlord']->id,
            'user_two_id' => $scenario['tenant']->id,
        ]);

        $this->assignCaretaker($scenario['landlord'], $scenario['caretaker'], $scenario['property']);

        Sanctum::actingAs($scenario['landlord']);

        $response = $this->patchJson("/api/messages/{$conversation->id}/caretaker", [
            'caretaker_id' => $scenario['caretaker']->id,
        ]);

        $response->assertStatus(200);
        $this->assertEquals($scenario['caretaker']->id, $conversation->fresh()->caretaker_id);
    }

    public function test_caretaker_only_sees_assigned_conversations(): void
    {
        $scenario = $this->createBaseScenario();
        $this->assignCaretaker($scenario['landlord'], $scenario['caretaker'], $scenario['property']);

        // Conversation assigned to this caretaker
        $conv1 = Conversation::create([
            'user_one_id' => $scenario['landlord']->id,
            'user_two_id' => $scenario['tenant']->id,
            'caretaker_id' => $scenario['caretaker']->id,
        ]);

        // Conversation assigned to NO ONE (caretaker should see it by default if they have message permission)
        $conv2 = Conversation::create([
            'user_one_id' => $scenario['landlord']->id,
            'user_two_id' => User::create(['role' => 'tenant', 'email' => 't2@ex.com', 'password' => 'pw', 'first_name' => 'T2', 'last_name' => 'T2', 'phone' => '09170001111'])->id,
            'caretaker_id' => null,
        ]);

        // Conversation assigned to ANOTHER caretaker
        $otherCaretaker = User::create(['role' => 'caretaker', 'email' => 'other-c@ex.com', 'password' => 'pw', 'first_name' => 'Other', 'last_name' => 'C', 'phone' => '09170002222']);
        $conv3 = Conversation::create([
            'user_one_id' => $scenario['landlord']->id,
            'user_two_id' => User::create(['role' => 'tenant', 'email' => 't3@ex.com', 'password' => 'pw', 'first_name' => 'T3', 'last_name' => 'T3', 'phone' => '09170003333'])->id,
            'caretaker_id' => $otherCaretaker->id,
        ]);

        Sanctum::actingAs($scenario['caretaker']);

        $response = $this->getJson('/api/messages/conversations');

        $response->assertStatus(200);
        $convIds = collect($response->json())->pluck('id')->toArray();

        $this->assertContains($conv1->id, $convIds);
        $this->assertContains($conv2->id, $convIds);
        $this->assertNotContains($conv3->id, $convIds);
    }

    private function createBaseScenario(): array
    {
        $suffix = uniqid();

        $landlord = User::create([
            'role' => 'landlord',
            'email' => "landlord-test-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Test',
            'last_name' => 'Landlord',
            'phone' => '0917'.rand(1000000, 9999999),
            'is_verified' => true,
            'is_active' => true,
        ]);

        $caretaker = User::create([
            'role' => 'caretaker',
            'email' => "caretaker-test-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Test',
            'last_name' => 'Caretaker',
            'phone' => '0917'.rand(1000000, 9999999),
            'is_verified' => true,
            'is_active' => true,
        ]);

        $tenant = User::create([
            'role' => 'tenant',
            'email' => "tenant-test-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => 'Test',
            'last_name' => 'Tenant',
            'phone' => '0917'.rand(1000000, 9999999),
            'is_verified' => true,
            'is_active' => true,
        ]);

        $property = Property::create([
            'landlord_id' => $landlord->id,
            'title' => 'Test Property',
            'property_type' => 'apartment',
            'street_address' => 'Test St',
            'city' => 'Test City',
            'province' => 'Test Prov',
            'country' => 'Philippines',
        ]);

        return [
            'landlord' => $landlord,
            'caretaker' => $caretaker,
            'tenant' => $tenant,
            'property' => $property,
        ];
    }

    private function assignCaretaker(User $landlord, User $caretaker, Property $property): void
    {
        $assignment = CaretakerAssignment::create([
            'landlord_id' => $landlord->id,
            'caretaker_id' => $caretaker->id,
            'can_view_messages' => true,
            'can_view_properties' => true,
        ]);

        $assignment->properties()->sync([$property->id]);
    }
}
