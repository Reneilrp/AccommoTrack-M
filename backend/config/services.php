<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'paymongo' => [
        'secret_key' => env('PAYMONGO_SECRET', env('PAYMONGO_SECRET_KEY')),
        'public_key' => env('PAYMONGO_PUBLIC', env('PAYMONGO_PUBLIC_KEY')),
        'webhook_secret' => env('PAYMONGO_WEBHOOK_SECRET'),
        'parent_org_id' => env('PAYMONGO_PARENT_ORG_ID'),
        'verify_ssl' => env('PAYMONGO_VERIFY_SSL', true),
    ],

    'cloudflare' => [
        'zone_id' => env('CLOUDFLARE_ZONE_ID'),
        'api_token' => env('CLOUDFLARE_API_TOKEN'),
    ],

    'expo' => [
        'push_url' => env('EXPO_PUSH_URL', 'https://exp.host/--/api/v2/push/send'),
        'access_token' => env('EXPO_ACCESS_TOKEN', ''),
    ],

];
