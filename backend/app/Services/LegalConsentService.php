<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserLegalConsent;

class LegalConsentService
{
    /**
     * Consent types used for audit/backfill and should not satisfy explicit policy acceptance checks.
     */
    private const IMPLIED_CONSENT_TYPES = [
        'first_login_implied',
    ];

    public function capture(User $user, array $payload = []): UserLegalConsent
    {
        $request = request();

        $platform = $payload['platform']
            ?? $payload['consent_platform']
            ?? $this->resolvePlatformFromRequest();

        return UserLegalConsent::create([
            'user_id' => $user->id,
            'consent_type' => $payload['consent_type'] ?? 'signup',
            'terms_version' => $payload['terms_version'] ?? config('legal.terms_version', 'v1.0'),
            'privacy_version' => $payload['privacy_version'] ?? config('legal.privacy_version', 'v1.0'),
            'platform' => $platform,
            'consented_at' => now(),
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'metadata' => $payload['metadata'] ?? null,
        ]);
    }

    public function hasAnyConsent(User $user): bool
    {
        return UserLegalConsent::query()
            ->where('user_id', $user->id)
            ->exists();
    }

    public function hasAcceptedCurrentVersions(User $user): bool
    {
        $termsVersion = (string) config('legal.terms_version', 'v1.0');
        $privacyVersion = (string) config('legal.privacy_version', 'v1.0');

        return UserLegalConsent::query()
            ->where('user_id', $user->id)
            ->whereNotIn('consent_type', self::IMPLIED_CONSENT_TYPES)
            ->where('terms_version', $termsVersion)
            ->where('privacy_version', $privacyVersion)
            ->exists();
    }

    private function resolvePlatformFromRequest(): string
    {
        $platform = strtolower((string) request()?->header('X-Client-Platform', ''));

        return in_array($platform, ['web', 'mobile'], true) ? $platform : 'unknown';
    }
}
