<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Support\Facades\DB;

$bookingId = 38; // The ID mentioned in the user's error message

try {
    $booking = Booking::with(['tenant.tenantProfile', 'room.property'])->findOrFail($bookingId);
    echo "Found booking #$bookingId
";
    echo 'Status: '.$booking->status.'
';
    echo 'Tenant ID: '.$booking->tenant_id.'
';
    echo 'Room ID: '.$booking->room_id.'
';

    $service = app(BookingService::class);

    DB::beginTransaction();
    echo "Attempting to update status to 'confirmed'...
";

    $result = $service->updateStatus($booking, ['status' => 'confirmed']);

    DB::commit();
    echo 'Success!
';
} catch (\Exception $e) {
    DB::rollBack();
    echo 'ERROR: '.$e->getMessage().'
';
    echo 'TRACE:
'.$e->getTraceAsString().'
';
}
