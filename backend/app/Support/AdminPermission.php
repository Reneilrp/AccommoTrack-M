<?php

namespace App\Support;

use App\Models\User;

class AdminPermission
{
    public const TIER_SUPER_ADMIN = 'super_admin';

    public const TIER_SUPPORT_ADMIN = 'support_admin';

    public static function resolveTier(?User $admin): string
    {
        if (! $admin || ($admin->role ?? null) !== 'admin') {
            return self::TIER_SUPPORT_ADMIN;
        }

        $adminSettings = self::extractAdminSettings($admin);
        $rawTier = strtolower(trim((string) ($adminSettings['tier'] ?? '')));

        return match ($rawTier) {
            'support', 'support_admin' => self::TIER_SUPPORT_ADMIN,
            'super', 'super_admin' => self::TIER_SUPER_ADMIN,
            default => self::TIER_SUPER_ADMIN,
        };
    }

    public static function permissions(?User $admin): array
    {
        $tier = self::resolveTier($admin);

        $permissions = [
            'can_update_user_email' => false,
            'can_reset_user_password' => $tier === self::TIER_SUPER_ADMIN,
            'can_update_inquiry_basic' => true,
            'can_reply_inquiry' => true,
            'can_escalate_inquiry' => $tier === self::TIER_SUPER_ADMIN,
            'can_close_inquiry' => $tier === self::TIER_SUPER_ADMIN,
            'can_archive_inquiry' => $tier === self::TIER_SUPER_ADMIN,
            'can_delete_inquiry' => $tier === self::TIER_SUPER_ADMIN,
        ];

        $adminSettings = self::extractAdminSettings($admin);
        $overrides = $adminSettings['permissions'] ?? [];
        if (! is_array($overrides)) {
            return $permissions;
        }

        foreach ($permissions as $key => $value) {
            if (array_key_exists($key, $overrides)) {
                $permissions[$key] = (bool) $overrides[$key];
            }
        }

        return $permissions;
    }

    public static function can(?User $admin, string $permission): bool
    {
        $permissions = self::permissions($admin);

        return (bool) ($permissions[$permission] ?? false);
    }

    private static function extractAdminSettings(?User $admin): array
    {
        if (! $admin) {
            return [];
        }

        $preferences = is_array($admin->preferences) ? $admin->preferences : [];
        $adminSettings = $preferences['admin'] ?? [];

        if (! is_array($adminSettings)) {
            $adminSettings = [];
        }

        if (! isset($adminSettings['tier']) && isset($preferences['admin_tier'])) {
            $adminSettings['tier'] = $preferences['admin_tier'];
        }

        if (! isset($adminSettings['permissions']) && isset($preferences['admin_permissions']) && is_array($preferences['admin_permissions'])) {
            $adminSettings['permissions'] = $preferences['admin_permissions'];
        }

        return $adminSettings;
    }
}
