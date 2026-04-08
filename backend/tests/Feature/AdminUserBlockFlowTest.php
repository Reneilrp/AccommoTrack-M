<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserBlockFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_block_after_discussion_requires_summary_when_not_overridden(): void
    {
        $admin = $this->createUser('admin');
        $targetUser = $this->createUser('tenant');

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/users/{$targetUser->id}/block", [
            'block_mode' => 'after_discussion',
            'override_without_discussion' => false,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.discussion_summary.0', 'Discussion summary is required unless the mediation step is explicitly overridden.');

        $this->assertFalse((bool) $targetUser->fresh()->is_blocked);
    }

    public function test_admin_can_block_user_after_discussion_with_notes(): void
    {
        $admin = $this->createUser('admin');
        $targetUser = $this->createUser('tenant');

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/users/{$targetUser->id}/block", [
            'block_mode' => 'after_discussion',
            'discussion_summary' => 'Admin spoke with tenant regarding repeated policy violations.',
            'admin_notes' => 'Second offense this month.',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.id', $targetUser->id)
            ->assertJsonPath('user.is_blocked', true)
            ->assertJsonPath('mediation.mode', 'after_discussion')
            ->assertJsonPath('mediation.override_without_discussion', false);

        $this->assertTrue((bool) $targetUser->fresh()->is_blocked);

        $this->assertDatabaseHas('audit_logs', [
            'domain' => 'user',
            'event' => 'user.blocked',
            'subject_type' => 'user',
            'subject_id' => $targetUser->id,
            'actor_id' => $admin->id,
            'status_after' => 'blocked',
        ]);
    }

    public function test_admin_can_override_discussion_step_and_block_immediately(): void
    {
        $admin = $this->createUser('admin');
        $targetUser = $this->createUser('tenant');

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/users/{$targetUser->id}/block", [
            'block_mode' => 'after_discussion',
            'override_without_discussion' => true,
            'admin_notes' => 'Immediate risk to community safety.',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.is_blocked', true)
            ->assertJsonPath('mediation.override_without_discussion', true);

        $this->assertTrue((bool) $targetUser->fresh()->is_blocked);
    }

    private function createUser(string $role): User
    {
        $suffix = uniqid();

        return User::create([
            'role' => $role,
            'email' => "{$role}-user-block-{$suffix}@example.com",
            'password' => Hash::make('password'),
            'first_name' => ucfirst($role),
            'last_name' => 'Tester',
            'phone' => '09170001234',
            'is_verified' => true,
            'is_active' => true,
        ]);
    }
}
