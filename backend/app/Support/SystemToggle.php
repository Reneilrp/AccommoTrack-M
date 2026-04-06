<?php

namespace App\Support;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;

class SystemToggle
{
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

        $cacheKey = "system_setting_bool:{$key}";

        return Cache::remember($cacheKey, now()->addMinutes(5), function () use ($key, $default) {
            try {
                $setting = SystemSetting::query()->where('key', $key)->first();
                if (! $setting) {
                    return $default;
                }

                return self::normalizeBool($setting->value, $default);
            } catch (\Throwable $e) {
                return $default;
            }
        });
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

        Cache::forget("system_setting_bool:{$key}");
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
