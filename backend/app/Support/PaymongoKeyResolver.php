<?php

namespace App\Support;

class PaymongoKeyResolver
{
    /**
     * Get the appropriate PayMongo secret key based on test mode toggle.
     */
    public static function getSecretKey(bool $forceLive = false): string
    {
        if (! $forceLive && self::isTestMode()) {
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
    public static function getPublicKey(bool $forceLive = false): string
    {
        if (! $forceLive && self::isTestMode()) {
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
    public static function getWebhookSecret(bool $forceLive = false): string
    {
        if (! $forceLive && self::isTestMode()) {
            $testSecret = config('services.paymongo.test_webhook_secret');
            if ($testSecret && trim($testSecret) !== '') {
                return $testSecret;
            }
        }

        return (string) config('services.paymongo.webhook_secret', '');
    }

    /**
     * Resolve the webhook secret based on the payload's livemode.
     * Use this when mixed mode (test/live) is possible.
     */
    public static function getWebhookSecretForPayload(array $payload): string
    {
        $livemode = (bool) ($payload['data']['attributes']['livemode'] ?? true);

        return self::getWebhookSecret(! $livemode === false);
    }

    /**
     * Check if test mode is currently enabled.
     */
    public static function isTestMode(): bool
    {
        return SystemToggle::getBool('paymongo_test_mode_enabled', false);
    }
}
