<?php

namespace App\Support;

class PaymongoKeyResolver
{
    /**
     * Get the appropriate PayMongo secret key based on test mode toggle.
     */
    public static function getSecretKey(): string
    {
        if (self::isTestMode()) {
            $testKey = config('services.paymongo.test_secret_key');
            if ($testKey && trim($testKey) !== '') {
                return $testKey;
            }
        }

        return (string) config('services.paymongo.secret_key', '');
    }

    /**
     * Get the appropriate PayMongo public key based on test mode toggle.
     */
    public static function getPublicKey(): string
    {
        if (self::isTestMode()) {
            $testKey = config('services.paymongo.test_public_key');
            if ($testKey && trim($testKey) !== '') {
                return $testKey;
            }
        }

        return (string) config('services.paymongo.public_key', '');
    }

    /**
     * Get the appropriate PayMongo webhook secret based on test mode toggle.
     */
    public static function getWebhookSecret(): string
    {
        if (self::isTestMode()) {
            $testSecret = config('services.paymongo.test_webhook_secret');
            if ($testSecret && trim($testSecret) !== '') {
                return $testSecret;
            }
        }

        return (string) config('services.paymongo.webhook_secret', '');
    }

    /**
     * Check if test mode is currently enabled.
     */
    public static function isTestMode(): bool
    {
        return SystemToggle::getBool('paymongo_test_mode_enabled', false);
    }
}
