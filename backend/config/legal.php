<?php

return [
    'terms_version' => env('LEGAL_TERMS_VERSION', 'v2.0'),
    'privacy_version' => env('LEGAL_PRIVACY_VERSION', 'v2.0'),
    'require_reconsent_on_major_update' => (bool) env('LEGAL_REQUIRE_RECONSENT_MAJOR', true),
];
