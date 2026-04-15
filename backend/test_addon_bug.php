<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$booking = \App\Models\Booking::first();
if ($booking) {
    try {
        $addonRequest = $booking->addons()
            ->where('addon_id', 1)
            ->first();
        echo "Success";
    } catch (\Exception $e) {
        echo "Error: " . $e->getMessage();
    }
} else {
    echo "No booking";
}
