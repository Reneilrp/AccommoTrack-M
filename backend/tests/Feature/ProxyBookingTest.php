<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Room;
use App\Models\Property;
use App\Services\BookingService;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class ProxyBookingTest extends TestCase
{
    use DatabaseTransactions;
    
    protected BookingService $bookingService;
    protected User $testTenant;
    protected Property $testProperty;

    protected function setUp(): void
    {
        parent::setUp();
        $this->bookingService = app(BookingService::class);
        
        // Create test tenant
        $this->testTenant = User::firstOrCreate(
            ['email' => 'test-tenant@example.com'],
            [
                'first_name' => 'Test',
                'last_name' => 'Tenant',
                'role' => 'tenant',
                'sex' => 'male',
                'password' => bcrypt('password'),
            ]
        );
        
        // Get or create test property
        $landlord = User::where('role', 'landlord')->first();
        if (!$landlord) {
            $landlord = User::create([
                'first_name' => 'Test',
                'last_name' => 'Landlord',
                'email' => 'test-landlord@example.com',
                'role' => 'landlord',
                'password' => bcrypt('password'),
            ]);
        }
        
        $this->testProperty = Property::firstOrCreate(
            ['title' => 'Test Property for Proxy Booking'],
            [
                'landlord_id' => $landlord->id,
                'property_type' => 'dormitory',
                'street_address' => '123 Test St',
                'city' => 'Test City',
                'province' => 'Test Province',
                'postal_code' => '12345',
                'current_status' => 'active',
            ]
        );
    }

    public function test_mixed_room_accepts_mixed_sex_occupants()
    {
        echo "\n=== TEST 1: Mixed Room with Mixed-Sex Occupants ===\n";
        
        $mixedRoom = Room::create([
            'property_id' => $this->testProperty->id,
            'room_number' => 'TEST-MIXED-' . time(),
            'capacity' => 4,
            'sex_restriction' => 'mixed',
            'price' => 5000,
            'status' => 'available',
            'billing_policy' => 'monthly',
            'floor' => '1',
        ]);
        echo "Created test mixed room: {$mixedRoom->room_number}\n";

        $data = [
            'property_id' => $mixedRoom->property_id,
            'room_id' => $mixedRoom->id,
            'start_date' => now()->addDays(7)->format('Y-m-d'),
            'end_date' => now()->addMonths(3)->format('Y-m-d'),
            'booking_mode' => 'proxy',
            'bed_count' => 2,
            'occupants' => [
                ['full_name' => 'John Doe', 'sex' => 'male'],
                ['full_name' => 'Jane Smith', 'sex' => 'female']
            ]
        ];

        try {
            $booking = $this->bookingService->createBooking($data, $this->testTenant->id);
            
            $this->assertNotNull($booking);
            $this->assertEquals(2, $booking->occupants->count());
            $this->assertEquals('proxy', $booking->booking_mode);
            
            echo "✓ PASSED: Mixed room accepted mixed-sex occupants\n";
            echo "  Booking ID: {$booking->id}\n";
            echo "  Booking Reference: {$booking->booking_reference}\n";
            echo "  Occupants: {$booking->occupants->count()}\n";
            
        } catch (\Exception $e) {
            $this->fail("✗ FAILED: " . $e->getMessage());
        }
    }

    public function test_male_only_room_rejects_mixed_sex_occupants()
    {
        echo "\n=== TEST 2: Male-Only Room with Mixed-Sex Occupants ===\n";
        
        $maleRoom = Room::create([
            'property_id' => $this->testProperty->id,
            'room_number' => 'TEST-MALE-' . time(),
            'capacity' => 4,
            'sex_restriction' => 'male',
            'price' => 5000,
            'status' => 'available',
            'billing_policy' => 'monthly',
            'floor' => '1',
        ]);
        echo "Created test male-only room: {$maleRoom->room_number}\n";

        $data = [
            'property_id' => $maleRoom->property_id,
            'room_id' => $maleRoom->id,
            'start_date' => now()->addDays(7)->format('Y-m-d'),
            'end_date' => now()->addMonths(3)->format('Y-m-d'),
            'booking_mode' => 'proxy',
            'bed_count' => 2,
            'occupants' => [
                ['full_name' => 'John Doe', 'sex' => 'male'],
                ['full_name' => 'Jane Smith', 'sex' => 'female']
            ]
        ];

        try {
            $booking = $this->bookingService->createBooking($data, $this->testTenant->id);
            $this->fail("✗ FAILED: Male-only room accepted mixed-sex occupants (BUG!)");
        } catch (\DomainException $e) {
            $this->assertStringContainsString('sex must match the room restriction', $e->getMessage());
            echo "✓ PASSED: Male-only room correctly rejected mixed-sex occupants\n";
            echo "  Error Message: {$e->getMessage()}\n";
        }
    }

    public function test_female_only_room_accepts_all_female_occupants()
    {
        echo "\n=== TEST 3: Female-Only Room with All-Female Occupants ===\n";
        
        // Create a female tenant for this test
        $femaleTenant = User::create([
            'first_name' => 'Female',
            'last_name' => 'Tenant',
            'email' => 'female-tenant-' . time() . '@example.com',
            'role' => 'tenant',
            'sex' => 'female',
            'password' => bcrypt('password'),
        ]);
        
        $femaleRoom = Room::create([
            'property_id' => $this->testProperty->id,
            'room_number' => 'TEST-FEMALE-' . time(),
            'capacity' => 4,
            'sex_restriction' => 'female',
            'price' => 5000,
            'status' => 'available',
            'billing_policy' => 'monthly',
            'floor' => '1',
        ]);
        echo "Created test female-only room: {$femaleRoom->room_number}\n";

        $data = [
            'property_id' => $femaleRoom->property_id,
            'room_id' => $femaleRoom->id,
            'start_date' => now()->addDays(7)->format('Y-m-d'),
            'end_date' => now()->addMonths(3)->format('Y-m-d'),
            'booking_mode' => 'proxy',
            'bed_count' => 2,
            'occupants' => [
                ['full_name' => 'Jane Doe', 'sex' => 'female'],
                ['full_name' => 'Mary Smith', 'sex' => 'female']
            ]
        ];

        try {
            $booking = $this->bookingService->createBooking($data, $femaleTenant->id);
            
            $this->assertNotNull($booking);
            $this->assertEquals(2, $booking->occupants->count());
            $this->assertEquals('proxy', $booking->booking_mode);
            
            echo "✓ PASSED: Female-only room accepted all-female occupants\n";
            echo "  Booking ID: {$booking->id}\n";
            echo "  Booking Reference: {$booking->booking_reference}\n";
            echo "  Occupants: {$booking->occupants->count()}\n";
            
        } catch (\Exception $e) {
            $this->fail("✗ FAILED: " . $e->getMessage());
        }
    }

    public function test_male_only_room_accepts_all_male_occupants()
    {
        echo "\n=== TEST 4: Male-Only Room with All-Male Occupants ===\n";
        
        $maleRoom = Room::create([
            'property_id' => $this->testProperty->id,
            'room_number' => 'TEST-MALE2-' . time(),
            'capacity' => 4,
            'sex_restriction' => 'male',
            'price' => 5000,
            'status' => 'available',
            'billing_policy' => 'monthly',
            'floor' => '1',
        ]);
        echo "Created test male-only room: {$maleRoom->room_number}\n";

        $data = [
            'property_id' => $maleRoom->property_id,
            'room_id' => $maleRoom->id,
            'start_date' => now()->addDays(7)->format('Y-m-d'),
            'end_date' => now()->addMonths(3)->format('Y-m-d'),
            'booking_mode' => 'proxy',
            'bed_count' => 2,
            'occupants' => [
                ['full_name' => 'John Doe', 'sex' => 'male'],
                ['full_name' => 'Mike Smith', 'sex' => 'male']
            ]
        ];

        try {
            $booking = $this->bookingService->createBooking($data, $this->testTenant->id);
            
            $this->assertNotNull($booking);
            $this->assertEquals(2, $booking->occupants->count());
            $this->assertEquals('proxy', $booking->booking_mode);
            
            echo "✓ PASSED: Male-only room accepted all-male occupants\n";
            echo "  Booking ID: {$booking->id}\n";
            echo "  Booking Reference: {$booking->booking_reference}\n";
            echo "  Occupants: {$booking->occupants->count()}\n";
            
        } catch (\Exception $e) {
            $this->fail("✗ FAILED: " . $e->getMessage());
        }
    }

    public function test_proxy_booking_requires_occupants()
    {
        echo "\n=== TEST 5: Proxy Booking Requires Occupants ===\n";
        
        $mixedRoom = Room::create([
            'property_id' => $this->testProperty->id,
            'room_number' => 'TEST-MIXED2-' . time(),
            'capacity' => 4,
            'sex_restriction' => 'mixed',
            'price' => 5000,
            'status' => 'available',
            'billing_policy' => 'monthly',
            'floor' => '1',
        ]);

        $data = [
            'property_id' => $mixedRoom->property_id,
            'room_id' => $mixedRoom->id,
            'start_date' => now()->addDays(7)->format('Y-m-d'),
            'end_date' => now()->addMonths(3)->format('Y-m-d'),
            'booking_mode' => 'proxy',
            'bed_count' => 2,
            'occupants' => []
        ];

        try {
            $booking = $this->bookingService->createBooking($data, $this->testTenant->id);
            $this->fail("✗ FAILED: Proxy booking accepted without occupants (BUG!)");
        } catch (\DomainException $e) {
            $this->assertStringContainsString('Proxy booking requires at least one occupant', $e->getMessage());
            echo "✓ PASSED: Proxy booking correctly rejected without occupants\n";
            echo "  Error Message: {$e->getMessage()}\n";
        }
    }
}
