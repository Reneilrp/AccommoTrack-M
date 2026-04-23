<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$reference = 'RCPT-12345';
$appKey = config('app.key');

$sig1 = hash_hmac('sha256', $reference, $appKey);
$sig2 = hash_hmac('sha256', (string) $reference, $appKey);

echo "Sig1: $sig1\n";
echo "Sig2: $sig2\n";
echo "Match: " . (hash_equals($sig1, $sig2) ? 'Yes' : 'No') . "\n";
