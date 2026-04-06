<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Room;
use App\Models\User;
use Illuminate\Http\Request;

$landlord = User::where('role', 'landlord')->first();
$room = Room::whereHas('property', function ($q) use ($landlord) {
    $q->where('landlord_id', $landlord->id);
})->first();

if (! $room) {
    echo "No room found for testing.\n";
    exit;
}

echo "Testing room update for Room ID: {$room->id}\n";

// Authenticate the user
auth()->login($landlord);

$payload = [
    'room_number' => $room->room_number,
    'room_type' => $room->room_type,
    'gender_restriction' => $room->gender_restriction,
    'floor' => $room->floor,
    'monthly_rate' => $room->monthly_rate,
    'billing_policy' => $room->billing_policy,
    'min_stay_days' => $room->min_stay_days,
    'capacity' => $room->capacity,
    'pricing_model' => $room->pricing_model,
    'status' => $room->status,
    'description' => 'Test Room Rules and Amenities',
    'rules' => ['No Smoking', 'No Pets'],
    'amenities' => ['Wi-Fi', 'Gym'],
];

$request = Request::create("/api/landlord/rooms/{$room->id}", 'PUT', $payload);
$request->headers->set('Accept', 'application/json');
$request->setUserResolver(function () use ($landlord) {
    return $landlord;
});

$response = app()->handle($request);

echo 'Status Code: '.$response->getStatusCode()."\n";
echo 'Response Body: '.$response->getContent()."\n";
