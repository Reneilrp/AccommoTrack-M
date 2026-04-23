<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$invoice = \App\Models\Invoice::first();
if (!$invoice) {
    echo "No invoices found.\n";
    exit;
}

$invoice->receipt_reference = 'RCPT-' . date('YmdHis') . '-' . strtoupper(\Illuminate\Support\Str::random(10));
$invoice->status = 'paid';
$invoice->save();

$reference = $invoice->receipt_reference;
$signature = hash_hmac('sha256', $reference, config('app.key'));

echo "Ref: $reference\n";
echo "Sig: $signature\n";

$request = \Illuminate\Http\Request::create("/api/public/receipts/{$reference}/verify?sig={$signature}", 'GET');
$controller = new \App\Http\Controllers\Public\PublicReceiptController();
$response = $controller->verifyApi($request, $reference);

echo "Status: " . $response->getStatusCode() . "\n";
echo "Content: " . $response->getContent() . "\n";
