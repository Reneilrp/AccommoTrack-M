<?php

namespace App\Services;

use App\Models\DevicePushToken;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushNotificationService
{
    private const DEFAULT_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    private const MAX_MESSAGES_PER_REQUEST = 100;

    public function sendToUser(User $user, array $payload): void
    {
        $tokens = $user->pushTokens()
            ->where('is_active', true)
            ->pluck('token')
            ->filter(fn ($token) => is_string($token) && $token !== '')
            ->unique()
            ->values();

        if ($tokens->isEmpty()) {
            return;
        }

        $title = trim((string) ($payload['title'] ?? 'AccommoTrack'));
        $body = trim((string) ($payload['message'] ?? $payload['body'] ?? 'You have a new notification.'));
        $data = $payload['data'] ?? [];

        if (! is_array($data)) {
            $data = [];
        }

        $messages = $tokens->map(function ($token) use ($title, $body, $data) {
            return [
                'to' => $token,
                'title' => $title !== '' ? $title : 'AccommoTrack',
                'body' => $body !== '' ? $body : 'You have a new notification.',
                'sound' => 'default',
                'priority' => 'high',
                'channelId' => 'default',
                'data' => $data,
            ];
        });

        foreach ($messages->chunk(self::MAX_MESSAGES_PER_REQUEST) as $chunk) {
            $this->sendChunk($chunk->values()->all());
        }
    }

    private function sendChunk(array $messages): void
    {
        if (empty($messages)) {
            return;
        }

        $pushUrl = (string) config('services.expo.push_url', self::DEFAULT_PUSH_URL);
        $accessToken = (string) config('services.expo.access_token', '');

        try {
            $request = Http::asJson()->timeout(10);
            if ($accessToken !== '') {
                $request = $request->withToken($accessToken);
            }

            $response = $request->post($pushUrl, $messages);

            if (! $response->successful()) {
                Log::warning('Expo push request failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return;
            }

            $ticketResults = $response->json('data', []);
            if (! is_array($ticketResults)) {
                return;
            }

            foreach ($ticketResults as $index => $ticket) {
                if (! is_array($ticket)) {
                    continue;
                }

                if (($ticket['status'] ?? null) !== 'error') {
                    continue;
                }

                $details = $ticket['details'] ?? [];
                $errorCode = is_array($details) ? ($details['error'] ?? null) : null;
                if ($errorCode !== 'DeviceNotRegistered') {
                    continue;
                }

                $invalidToken = $messages[$index]['to'] ?? null;
                if (! is_string($invalidToken) || $invalidToken === '') {
                    continue;
                }

                DevicePushToken::query()
                    ->where('token', $invalidToken)
                    ->update([
                        'is_active' => false,
                        'last_seen_at' => now(),
                    ]);
            }
        } catch (\Throwable $e) {
            Log::warning('Expo push send failed', [
                'message' => $e->getMessage(),
            ]);
        }
    }
}
