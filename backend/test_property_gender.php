<?php

use App\Http\Requests\StoreRoomRequest;
use App\Models\Property;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

echo "===============================\n";
echo "TESTING PROPERTY RESTRICTIONS\n";
echo "===============================\n\n";

$email = 'landlord_'.Str::random(5).'@test.com';

$landlord = User::create([
    'first_name' => 'Test',
    'last_name' => 'Landlord',
    'email' => $email,
    'password' => Hash::make('password123'),
    'role' => 'landlord',
    'is_verified' => true,
    'gender' => 'male',
    'date_of_birth' => '1990-01-01',
]);
$landlord->is_verified = true;
$landlord->save();

// 1. Create a FEMALE ONLY Property (ENUM is 'girls')
$propFemale = Property::create([
    'landlord_id' => $landlord->id,
    'title' => 'Female Only Dorm',
    'description' => 'Test female only property',
    'street_address' => '123 Female St',
    'city' => 'Manila',
    'province' => 'NCR',
    'postal_code' => '1000',
    'country' => 'Philippines',
    'barangay' => 'Brgy 1',
    'property_type' => 'dormitory',
    'total_rooms' => 10,
    'available_rooms' => 10,
    'gender_restriction' => 'girls',
    'current_status' => 'active',
]);
echo 'Created FEMALE ONLY Property ID: '.$propFemale->id."\n";

echo "Testing addition of MALE room to FEMALE property via Validator...\n";
$req1 = new StoreRoomRequest;
$req1->merge([
    'property_id' => $propFemale->id,
    'room_number' => 'M101',
    'room_type' => 'single',
    'gender_restriction' => 'male', // strictly fail
    'capacity' => 1,
    'floor' => 1,
    'pricing_model' => 'full_room',
    'billing_policy' => 'monthly',
    'monthly_rate' => 5000,
]);
$v1 = Validator::make($req1->all(), $req1->rules(), $req1->messages());
$pass1 = ! $v1->fails() && empty($v1->errors()->get('gender_restriction'));
echo 'Errors: '.json_encode($v1->errors()->get('gender_restriction'))."\n\n";

echo "Testing addition of FEMALE room to FEMALE property via Validator...\n";
$req2 = new StoreRoomRequest;
$req2->merge([
    'property_id' => $propFemale->id,
    'room_number' => 'F101',
    'room_type' => 'single',
    'gender_restriction' => 'female', // succeed
    'capacity' => 1,
    'floor' => 1,
    'pricing_model' => 'full_room',
    'billing_policy' => 'monthly',
    'monthly_rate' => 5000,
]);
$v2 = Validator::make($req2->all(), $req2->rules(), $req2->messages());
$pass2 = ! $v2->fails();
echo 'Errors: '.json_encode($v2->errors()->get('gender_restriction'))."\n\n";

echo "Testing addition of MALE room to MIXED property via Validator...\n";
$propMixed = Property::create([
    'landlord_id' => $landlord->id,
    'title' => 'Mixed Dorm',
    'description' => 'Test mixed property',
    'street_address' => '456 Mixed St',
    'city' => 'Manila',
    'province' => 'NCR',
    'postal_code' => '1000',
    'country' => 'Philippines',
    'barangay' => 'Brgy 2',
    'property_type' => 'dormitory',
    'total_rooms' => 10,
    'available_rooms' => 10,
    'gender_restriction' => 'mixed',
    'current_status' => 'active',
]);

$req3 = new StoreRoomRequest;
$req3->merge([
    'property_id' => $propMixed->id,
    'room_number' => 'M102',
    'room_type' => 'double',
    'gender_restriction' => 'male', // succeed
    'capacity' => 2,
    'floor' => 2,
    'pricing_model' => 'full_room',
    'billing_policy' => 'monthly',
    'monthly_rate' => 6000,
]);
$v3 = Validator::make($req3->all(), $req3->rules(), $req3->messages());
$pass3 = ! $v3->fails();
echo 'Errors: '.json_encode($v3->errors()->get('gender_restriction'))."\n\n";

if (! $pass1 && $pass2 && $pass3) {
    echo "✅ TEST PASSED: Validation rules work exactly as intended!\n";
} else {
    echo "❌ TEST FAILED!\n";
}

echo "===============================\n\n";
exit(0);
