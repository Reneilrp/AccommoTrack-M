<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$reference = 'RCPT-12345';
$expectedSignature = hash_hmac('sha256', (string) $reference, config('app.key'));
echo "Expected: " . $expectedSignature . "\n";
