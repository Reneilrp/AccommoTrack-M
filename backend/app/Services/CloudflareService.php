<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CloudflareService
{
    /**
     * Purge the entire Cloudflare cache for the zone.
     * This is the safest way to ensure all dynamic parameters (pagination, filters)
     * are cleared without requiring an Enterprise plan for Tag purging.
     */
    public function purgeEverything(): bool
    {
        $zoneId = config('services.cloudflare.zone_id');
        $token = config('services.cloudflare.api_token');

        if (! $zoneId || ! $token) {
            Log::warning('Cloudflare Service: Missing CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN in .env. Purge aborted.');

            return false;
        }

        try {
            $response = Http::withToken($token)
                ->post("https://api.cloudflare.com/client/v4/zones/{$zoneId}/purge_cache", [
                    'purge_everything' => true,
                ]);

            if ($response->successful()) {
                Log::info('Cloudflare Service: Cache purged successfully.');

                return true;
            }

            Log::error('Cloudflare Service: Failed to purge cache. Response: '.$response->body());

            return false;

        } catch (\Exception $e) {
            Log::error('Cloudflare Service: Exception during cache purge - '.$e->getMessage());

            return false;
        }
    }

    /**
     * Purge specific URLs from the Cloudflare cache.
     * Use this when updating a static file like an APK or image.
     *
     * @param  array  $files  An array of absolute URLs e.g. ['https://example.com/file.apk']
     */
    public function purgeFiles(array $files): bool
    {
        if (empty($files)) {
            return true;
        }

        $zoneId = config('services.cloudflare.zone_id');
        $token = config('services.cloudflare.api_token');

        if (! $zoneId || ! $token) {
            Log::warning('Cloudflare Service: Missing CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN in .env. Purge aborted.');

            return false;
        }

        try {
            $response = Http::withToken($token)
                ->post("https://api.cloudflare.com/client/v4/zones/{$zoneId}/purge_cache", [
                    'files' => $files,
                ]);

            if ($response->successful()) {
                Log::info('Cloudflare Service: Files purged successfully. Files: '.implode(', ', $files));

                return true;
            }

            Log::error('Cloudflare Service: Failed to purge files. Response: '.$response->body());

            return false;

        } catch (\Exception $e) {
            Log::error('Cloudflare Service: Exception during files purge - '.$e->getMessage());

            return false;
        }
    }
}
