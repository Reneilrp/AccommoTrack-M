<?php

namespace App\Support;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;

class SystemToggle
{
    protected static $cachedSettings = null;

    /**
     * Efficiently load all system settings from cache or DB once per request.
     */
    protected static function loadSettings(): array
    {
        if (self::$cachedSettings !== null) {
            return self::$cachedSettings;
        }

        // We use a single cache key for ALL system settings to minimize hits/DB queries
        self::$cachedSettings = Cache::remember('all_system_settings_array', now()->addMinutes(5), function () {
            try {
                return SystemSetting::all()->pluck('value', 'key')->toArray();
            } catch (\Throwable $e) {
                return [];
            }
        });

        return self::$cachedSettings;
    }

    public static function getBool(string $key, bool $default = false): bool
    {
        if (app()->runningUnitTests()) {
            try {
                $setting = SystemSetting::query()->where('key', $key)->first();
                if (! $setting) {
                    return $default;
                }

                return self::normalizeBool($setting->value, $default);
            } catch (\Throwable $e) {
                return $default;
            }
        }

        $settings = self::loadSettings();

        if (! isset($settings[$key])) {
            return $default;
        }

        return self::normalizeBool($settings[$key], $default);
    }

    public static function setBool(string $key, bool $value, ?int $updatedBy = null): void
    {
        SystemSetting::query()->updateOrCreate(
            ['key' => $key],
            [
                'value' => $value ? '1' : '0',
                'updated_by' => $updatedBy,
            ]
        );

        Cache::forget('all_system_settings_array');
        self::$cachedSettings = null; // Reset local cache too
    }

    public static function getString(string $key, string $default = ''): string
    {
        if (app()->runningUnitTests()) {
            try {
                $setting = SystemSetting::query()->where('key', $key)->first();

                return $setting ? (string) $setting->value : $default;
            } catch (\Throwable $e) {
                return $default;
            }
        }

        $settings = self::loadSettings();

        return isset($settings[$key]) ? (string) $settings[$key] : $default;
    }

    public static function setString(string $key, string $value, ?int $updatedBy = null): void
    {
        SystemSetting::query()->updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'updated_by' => $updatedBy,
            ]
        );

        Cache::forget('all_system_settings_array');
        self::$cachedSettings = null; // Reset local cache too
    }

    public static function normalizeBool(mixed $value, bool $fallback = false): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return ((int) $value) === 1;
        }

        if (is_string($value)) {
            $normalized = strtolower(trim($value));
            if (in_array($normalized, ['1', 'true', 'yes', 'on'], true)) {
                return true;
            }
            if (in_array($normalized, ['0', 'false', 'no', 'off', ''], true)) {
                return false;
            }
        }

        return $fallback;
    }
}
