<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AuthRefreshTokenFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_access_and_refresh_tokens_with_expiry_metadata(): void
    {
        config()->set('sanctum.access_token_ttl_minutes', 15);
        config()->set('sanctum.refresh_token_ttl_days', 30);

        $user = $this->createVerifiedTenant();

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'Password@11',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('auth_mode', 'token')
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonStructure([
                'user' => ['id'],
                'token',
                'access_token',
                'refresh_token',
                'expires_in',
                'expires_at',
                'refresh_expires_in',
                'refresh_expires_at',
            ]);

        $payload = $response->json();

        $this->assertIsString($payload['token']);
        $this->assertIsString($payload['access_token']);
        $this->assertIsString($payload['refresh_token']);
        $this->assertNotSame($payload['access_token'], $payload['refresh_token']);
        $this->assertGreaterThan(0, (int) $payload['expires_in']);
        $this->assertGreaterThan(0, (int) $payload['refresh_expires_in']);

        $accessToken = PersonalAccessToken::findToken($payload['access_token']);
        $refreshToken = PersonalAccessToken::findToken($payload['refresh_token']);

        $this->assertNotNull($accessToken);
        $this->assertNotNull($refreshToken);
        $this->assertSame('access_token', $accessToken->name);
        $this->assertSame('refresh_token', $refreshToken->name);
        $this->assertNotNull($accessToken->expires_at);
        $this->assertNotNull($refreshToken->expires_at);
    }

    public function test_refresh_token_endpoint_rotates_refresh_token_and_returns_new_pair(): void
    {
        $user = $this->createVerifiedTenant();

        $login = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'Password@11',
        ])->assertOk()->json();

        $oldRefreshToken = $login['refresh_token'];
        $oldRefreshTokenModel = PersonalAccessToken::findToken($oldRefreshToken);

        $this->assertNotNull($oldRefreshTokenModel);

        $refreshResponse = $this->postJson('/api/refresh-token', [
            'refresh_token' => $oldRefreshToken,
        ]);

        $refreshResponse
            ->assertOk()
            ->assertJsonPath('auth_mode', 'token')
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonStructure([
                'user' => ['id'],
                'token',
                'access_token',
                'refresh_token',
                'expires_in',
                'expires_at',
                'refresh_expires_in',
                'refresh_expires_at',
            ]);

        $refreshPayload = $refreshResponse->json();
        $this->assertNotSame($oldRefreshToken, $refreshPayload['refresh_token']);

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $oldRefreshTokenModel->id,
        ]);

        $this->assertNotNull(PersonalAccessToken::findToken($refreshPayload['access_token']));
        $this->assertNotNull(PersonalAccessToken::findToken($refreshPayload['refresh_token']));

        $this->postJson('/api/refresh-token', [
            'refresh_token' => $oldRefreshToken,
        ])->assertStatus(401)->assertJsonPath('message', 'Invalid refresh token.');
    }

    public function test_refresh_token_endpoint_rejects_expired_refresh_tokens(): void
    {
        $user = $this->createVerifiedTenant();

        $expiredRefresh = $user->createToken('refresh_token', ['token:refresh'], now()->subMinute());
        $expiredRefreshId = $expiredRefresh->accessToken->id;

        $this->postJson('/api/refresh-token', [
            'refresh_token' => $expiredRefresh->plainTextToken,
        ])->assertStatus(401)->assertJsonPath('message', 'Refresh token has expired.');

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $expiredRefreshId,
        ]);
    }

    public function test_refresh_token_endpoint_rejects_access_tokens(): void
    {
        $user = $this->createVerifiedTenant();

        $login = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'Password@11',
        ])->assertOk()->json();

        $this->postJson('/api/refresh-token', [
            'refresh_token' => $login['access_token'],
        ])->assertStatus(401)->assertJsonPath('message', 'Invalid refresh token.');
    }

    public function test_logout_revokes_current_access_and_provided_refresh_tokens(): void
    {
        $user = $this->createVerifiedTenant();

        $login = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'Password@11',
        ])->assertOk()->json();

        $accessTokenId = PersonalAccessToken::findToken($login['access_token'])?->id;
        $refreshTokenId = PersonalAccessToken::findToken($login['refresh_token'])?->id;

        $this->assertNotNull($accessTokenId);
        $this->assertNotNull($refreshTokenId);

        $this
            ->withHeader('Authorization', 'Bearer '.$login['access_token'])
            ->postJson('/api/logout', [
                'refresh_token' => $login['refresh_token'],
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Logged out successfully');

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $accessTokenId,
        ]);

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $refreshTokenId,
        ]);
    }

    private function createVerifiedTenant(): User
    {
        $suffix = uniqid();

        return User::create([
            'role' => 'tenant',
            'email' => "refresh-flow-{$suffix}@example.com",
            'password' => Hash::make('Password@11'),
            'first_name' => 'Refresh',
            'last_name' => 'Tester',
            'phone' => '09170001234',
            'is_verified' => true,
            'is_blocked' => false,
            'is_active' => true,
        ]);
    }
}
