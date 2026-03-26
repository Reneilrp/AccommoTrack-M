<?php

namespace Database\Seeders;

use App\Models\Property;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestLandlordPropertyRoomSeeder extends Seeder
{
    private const LANDLORD_COUNT = 5;

    private const PROPERTY_TYPES = [
        'dormitory',
        'apartment',
        'boardingHouse',
        'bedSpacer',
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $landlordStats = ['created' => 0, 'updated' => 0];
        $propertyStats = ['created' => 0, 'updated' => 0];
        $roomStats = ['created' => 0, 'updated' => 0];

        for ($landlordNumber = 1; $landlordNumber <= self::LANDLORD_COUNT; $landlordNumber++) {
            $landlord = $this->upsertLandlord($landlordNumber, $landlordStats);

            foreach (self::PROPERTY_TYPES as $propertyType) {
                $property = $this->upsertProperty($landlord, $landlordNumber, $propertyType, $propertyStats);
                $this->upsertRoomsForProperty($property, $propertyType, $roomStats);
            }
        }

        $this->command?->info('TestLandlordPropertyRoomSeeder completed.');
        $this->command?->line("Landlords - created: {$landlordStats['created']}, updated: {$landlordStats['updated']}");
        $this->command?->line("Properties - created: {$propertyStats['created']}, updated: {$propertyStats['updated']}");
        $this->command?->line("Rooms - created: {$roomStats['created']}, updated: {$roomStats['updated']}");
    }

    private function upsertLandlord(int $landlordNumber, array &$stats): User
    {
        $name = "test{$landlordNumber}";
        $landlord = User::updateOrCreate(
            ['email' => "{$name}@example.com"],
            [
                'role' => 'landlord',
                'password' => Hash::make('Password123'),
                'first_name' => $name,
                'middle_name' => null,
                'last_name' => $name,
                'phone' => '09'.str_pad((string) $landlordNumber, 9, '0', STR_PAD_LEFT),
                'profile_image' => null,
                'is_active' => true,
                'is_verified' => true,
            ]
        );

        if ($landlord->wasRecentlyCreated) {
            $stats['created']++;
        } else {
            $stats['updated']++;
        }

        return $landlord;
    }

    private function upsertProperty(User $landlord, int $landlordNumber, string $propertyType, array &$stats): Property
    {
        $propertyTitle = "test{$landlordNumber}-{$propertyType}";
        $roomCount = $propertyType === 'apartment' ? 8 : 6;

        $property = Property::updateOrCreate(
            [
                'landlord_id' => $landlord->id,
                'title' => $propertyTitle,
            ],
            [
                'description' => "{$propertyTitle} property",
                'property_type' => $propertyType,
                'gender_restriction' => 'mixed',
                'current_status' => Property::STATUS_ACTIVE,
                'street_address' => "{$landlordNumber}01 Test Street",
                'city' => 'Zamboanga City',
                'province' => 'Zamboanga del Sur',
                'postal_code' => '7000',
                'country' => 'Philippines',
                'barangay' => 'Test Barangay',
                'max_occupants' => 8,
                'total_rooms' => $roomCount,
                'available_rooms' => $roomCount,
                'accepted_payments' => ['cash', 'gcash'],
                'is_published' => true,
                'is_available' => true,
                'is_eligible' => true,
            ]
        );

        if ($property->wasRecentlyCreated) {
            $stats['created']++;
        } else {
            $stats['updated']++;
        }

        return $property;
    }

    private function upsertRoomsForProperty(Property $property, string $propertyType, array &$stats): void
    {
        $roomTemplates = $this->buildRoomTemplates($propertyType);

        foreach ($roomTemplates as $roomTemplate) {
            $room = Room::updateOrCreate(
                [
                    'property_id' => $property->id,
                    'room_number' => $roomTemplate['room_number'],
                ],
                [
                    'room_type' => $roomTemplate['room_type'],
                    'gender_restriction' => 'mixed',
                    'floor' => $roomTemplate['floor'],
                    'monthly_rate' => $roomTemplate['monthly_rate'],
                    'daily_rate' => $roomTemplate['daily_rate'],
                    'billing_policy' => $roomTemplate['billing_policy'],
                    'min_stay_days' => $roomTemplate['min_stay_days'],
                    'capacity' => $roomTemplate['capacity'],
                    'pricing_model' => $roomTemplate['pricing_model'],
                    'status' => 'available',
                    'description' => "{$property->title} {$roomTemplate['room_number']}",
                ]
            );

            if ($room->wasRecentlyCreated) {
                $stats['created']++;
            } else {
                $stats['updated']++;
            }
        }
    }

    private function buildRoomTemplates(string $propertyType): array
    {
        if ($propertyType === 'apartment') {
            return [
                $this->roomTemplate('R01', 'single', 'daily', 1),
                $this->roomTemplate('R02', 'double', 'daily', 1),
                $this->roomTemplate('R03', 'quad', 'monthly', 1),
                $this->roomTemplate('R04', 'single', 'monthly', 1),
                $this->roomTemplate('R05', 'double', 'monthly', 2),
                $this->roomTemplate('R06', 'quad', 'monthly', 2),
                $this->roomTemplate('R07', 'single', 'monthly_with_daily', 2),
                $this->roomTemplate('R08', 'double', 'monthly_with_daily', 2),
            ];
        }

        if ($propertyType === 'bedSpacer') {
            return [
                $this->roomTemplate('R01', 'bedSpacer', 'daily', 1),
                $this->roomTemplate('R02', 'bedSpacer', 'daily', 1),
                $this->roomTemplate('R03', 'bedSpacer', 'monthly', 1),
                $this->roomTemplate('R04', 'bedSpacer', 'monthly', 1),
                $this->roomTemplate('R05', 'bedSpacer', 'monthly_with_daily', 1),
                $this->roomTemplate('R06', 'bedSpacer', 'monthly_with_daily', 1),
            ];
        }

        if ($propertyType === 'dormitory') {
            return [
                $this->roomTemplate('R01', 'single', 'daily', 1),
                $this->roomTemplate('R02', 'double', 'daily', 1),
                $this->roomTemplate('R03', 'double', 'monthly', 2),
                $this->roomTemplate('R04', 'quad', 'monthly', 2),
                $this->roomTemplate('R05', 'quad', 'monthly_with_daily', 2),
                $this->roomTemplate('R06', 'quad', 'monthly_with_daily', 2),
            ];
        }

        return [
            $this->roomTemplate('R01', 'single', 'daily', 1),
            $this->roomTemplate('R02', 'double', 'daily', 1),
            $this->roomTemplate('R03', 'single', 'monthly', 1),
            $this->roomTemplate('R04', 'double', 'monthly', 2),
            $this->roomTemplate('R05', 'quad', 'monthly_with_daily', 2),
            $this->roomTemplate('R06', 'quad', 'monthly_with_daily', 2),
        ];
    }

    private function roomTemplate(string $roomNumber, string $roomType, string $billingPolicy, int $floor): array
    {
        $capacity = match ($roomType) {
            'single' => 1,
            'double' => 2,
            'quad' => 4,
            default => 1,
        };

        $baseMonthlyRate = match ($roomType) {
            'single' => 4500,
            'double' => 7500,
            'quad' => 12000,
            default => 2500,
        };

        $dailyRate = null;
        $minStayDays = 30;

        if ($billingPolicy === 'daily') {
            $dailyRate = max(250, (int) round($baseMonthlyRate / 30));
            $minStayDays = 1;
        }

        if ($billingPolicy === 'monthly_with_daily') {
            $dailyRate = max(250, (int) round($baseMonthlyRate / 28));
            $minStayDays = 3;
        }

        return [
            'room_number' => $roomNumber,
            'room_type' => $roomType,
            'billing_policy' => $billingPolicy,
            'floor' => $floor,
            'capacity' => $capacity,
            'monthly_rate' => $baseMonthlyRate,
            'daily_rate' => $dailyRate,
            'min_stay_days' => $minStayDays,
            'pricing_model' => $roomType === 'bedSpacer' ? 'per_bed' : 'full_room',
        ];
    }
}
