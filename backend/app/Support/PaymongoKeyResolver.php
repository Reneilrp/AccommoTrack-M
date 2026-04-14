<?php

namespace App\Support;

class PaymongoKeyResolver
{
    /**
     * Get the appropriate PayMongo secret key based on test mode toggle.
     */
    public static function getSecretKey(): string
    {
        $testModeEnabled = SystemToggle::getBool('paymongo_test_mode_enabled', false);
        
        if ($testModeEnabled) {
            $testKey = config('services.paymongo.test_secret_key');
            if ($testKey && trim($testKey) !== '') {
                return $testKey;
            }
        }
        
        return config('services.paymongo.secret_key');
    }

    /**
     * Get the appropriate PayMongo public key based on test mode toggle.
     */
    public static function getPublicKey(): string
    {
        $testModeEnabled = SystemToggle::getBool('paymongo_test_mode_enabled', false);
        
        if ($testModeEnabled) {
            $testKey = config('services.paymongo.test_public_key');
            if ($testKey && trim($testKey) !== '') {
                return $testKey;
            }
        }
        
        return config('services.paymongo.public_key');
    }

    /**
     * Check if test mode is currently enabled.
     */
    public static function isTestMode(): bool
    {
        return SystemToggle::getBool('paymongo_test_mode_enabled', false);
    }
}
