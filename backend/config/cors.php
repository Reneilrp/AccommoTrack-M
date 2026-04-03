<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    // include broadcasting auth so the preflight for Echo/Pusher auth is handled
    'paths' => ['api/*', 'login', 'broadcasting/auth', 'api/broadcasting/auth', 'sanctum/csrf-cookie', 'storage/*'],
    'allowed_methods' => ['*'],
    // Browsers reject credentialed cookies when Access-Control-Allow-Origin is wildcard.
    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', implode(',', array_filter([
            env('APP_URL'),
            'http://localhost:3000',
            'http://localhost:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
            'https://accommotrack.me',
            'https://beta.accommotrack.me',
        ]))))
    ))),
    'allowed_origins_patterns' => [
        '#^https?://.*\.accommotrack\.me$#',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,

];
