<?php

namespace Database\Seeders;

use App\Models\Amenity;
use App\Models\Property;
use App\Models\PropertyCredential;
use App\Models\PropertyImage;
use App\Models\LandlordVerification;
use App\Models\Room;
use App\Models\RoomImage;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestLandlordPropertyRoomSeeder extends Seeder
{
    private const LANDLORD_COUNT = 5;

    // Supported modes via env TEST_PROPERTY_SEED_MODE: pending|pending_review|approved|approved_live
    private const SEED_MODE_PENDING_REVIEW = 'pending_review';

    private const SEED_MODE_APPROVED_LIVE = 'approved_live';

    private const LANDLORD_PROFILES = [
        ['first_name' => 'Mateo', 'middle_name' => 'Santos', 'last_name' => 'Reyes', 'gender' => 'male', 'identified_as' => 'He/Him'],
        ['first_name' => 'Liza', 'middle_name' => 'Cruz', 'last_name' => 'Dela Vega', 'gender' => 'female', 'identified_as' => 'She/Her'],
        ['first_name' => 'Paolo', 'middle_name' => 'Diaz', 'last_name' => 'Torres', 'gender' => 'male', 'identified_as' => 'He/Him'],
        ['first_name' => 'Andrea', 'middle_name' => 'Lopez', 'last_name' => 'Garcia', 'gender' => 'female', 'identified_as' => 'She/Her'],
        ['first_name' => 'Jordan', 'middle_name' => 'Ramos', 'last_name' => 'Navarro', 'gender' => 'female', 'identified_as' => 'They/Them'],
    ];

    private const PROPERTY_TYPES = [
        'dormitory',
        'apartment',
        'boardingHouse',
        'bedSpacer',
    ];

    private const AMENITY_CATALOG = [
        ['name' => 'WiFi', 'icon' => 'wifi', 'description' => 'High speed internet access'],
        ['name' => 'CCTV', 'icon' => 'shield', 'description' => '24/7 security camera coverage'],
        ['name' => 'Laundry Area', 'icon' => 'shirt', 'description' => 'Common laundry facility'],
        ['name' => 'Kitchen Access', 'icon' => 'utensils', 'description' => 'Shared kitchen usage'],
        ['name' => 'Study Area', 'icon' => 'book-open', 'description' => 'Quiet study and work space'],
        ['name' => 'Parking', 'icon' => 'car', 'description' => 'Dedicated vehicle parking spaces'],
        ['name' => 'Water Supply', 'icon' => 'droplet', 'description' => 'Stable daily water supply'],
        ['name' => 'Power Backup', 'icon' => 'battery', 'description' => 'Backup power for common areas'],
    ];

    private const PROPERTY_AMENITIES = [
        'dormitory' => ['WiFi', 'CCTV', 'Laundry Area', 'Kitchen Access', 'Study Area', 'Water Supply'],
        'apartment' => ['WiFi', 'CCTV', 'Parking', 'Power Backup', 'Water Supply'],
        'boardingHouse' => ['WiFi', 'CCTV', 'Laundry Area', 'Kitchen Access', 'Water Supply'],
        'bedSpacer' => ['WiFi', 'CCTV', 'Laundry Area', 'Kitchen Access', 'Water Supply'],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $seedMode = $this->resolveSeedMode();

        $landlordStats = ['created' => 0, 'updated' => 0];
        $propertyStats = ['created' => 0, 'updated' => 0];
        $roomStats = ['created' => 0, 'updated' => 0];
        $imageStats = ['created' => 0, 'updated' => 0];
        $videoStats = ['created' => 0, 'updated' => 0, 'deleted' => 0];
        $roomImageStats = ['created' => 0, 'updated' => 0, 'deleted' => 0];
        $credentialStats = ['created' => 0, 'updated' => 0];
        $amenityStats = ['created' => 0, 'updated' => 0, 'detached' => 0];
        $roomAmenityStats = ['created' => 0, 'updated' => 0, 'detached' => 0];

        $amenityIdsByName = $this->seedAmenityCatalog();
        $adminReviewerId = User::query()->where('role', 'admin')->value('id');

        for ($landlordNumber = 1; $landlordNumber <= self::LANDLORD_COUNT; $landlordNumber++) {
            $landlord = $this->upsertLandlord($landlordNumber, $landlordStats);
            $this->upsertLandlordVerification($landlord, $adminReviewerId);

            foreach (self::PROPERTY_TYPES as $propertyType) {
                $property = $this->upsertProperty($landlord, $landlordNumber, $propertyType, $seedMode, $propertyStats);
                $this->upsertRoomsForProperty($property, $propertyType, $roomStats);
                $this->upsertPropertyAssets($property, $landlordNumber, $propertyType, $amenityIdsByName, $imageStats, $videoStats, $credentialStats, $amenityStats);
                $this->upsertRoomAssets($property, $propertyType, $amenityIdsByName, $roomImageStats, $roomAmenityStats);
            }
        }

        $this->command?->info('TestLandlordPropertyRoomSeeder completed.');
        $this->command?->line("Seed mode: {$seedMode}");
        $this->command?->line("Landlords - created: {$landlordStats['created']}, updated: {$landlordStats['updated']}");
        $this->command?->line("Properties - created: {$propertyStats['created']}, updated: {$propertyStats['updated']}");
        $this->command?->line("Rooms - created: {$roomStats['created']}, updated: {$roomStats['updated']}");
        $this->command?->line("Property images - created: {$imageStats['created']}, updated: {$imageStats['updated']}");
        $this->command?->line("Property videos - created: {$videoStats['created']}, updated: {$videoStats['updated']}, deleted: {$videoStats['deleted']}");
        $this->command?->line("Room images - created: {$roomImageStats['created']}, updated: {$roomImageStats['updated']}, deleted: {$roomImageStats['deleted']}");
        $this->command?->line("Property credentials - created: {$credentialStats['created']}, updated: {$credentialStats['updated']}");
        $this->command?->line("Property amenity links - created: {$amenityStats['created']}, updated: {$amenityStats['updated']}, detached: {$amenityStats['detached']}");
        $this->command?->line("Room amenity links - created: {$roomAmenityStats['created']}, updated: {$roomAmenityStats['updated']}, detached: {$roomAmenityStats['detached']}");
    }

    private function upsertLandlordVerification(User $landlord, ?int $adminReviewerId): void
    {
        LandlordVerification::updateOrCreate(
            ['user_id' => $landlord->id],
            [
                'first_name' => $landlord->first_name,
                'middle_name' => $landlord->middle_name,
                'last_name' => $landlord->last_name,
                'valid_id_type' => "Driver's License",
                'valid_id_other' => null,
                'valid_id_path' => 'test/ids/landlord-'.$landlord->id.'.jpg',
                'permit_path' => 'test/permits/business-permit-'.$landlord->id.'.jpg',
                'status' => 'approved',
                'rejection_reason' => null,
                'reviewed_at' => now()->subDays(2),
                'reviewed_by' => $adminReviewerId,
            ]
        );
    }

    private function upsertLandlord(int $landlordNumber, array &$stats): User
    {
        $profile = self::LANDLORD_PROFILES[$landlordNumber - 1] ?? end(self::LANDLORD_PROFILES);
        $name = "test{$landlordNumber}";
        $dateOfBirth = Carbon::now()->subYears(25 + $landlordNumber)->subMonths($landlordNumber)->toDateString();

        $landlord = User::updateOrCreate(
            ['email' => "{$name}@example.com"],
            [
                'role' => 'landlord',
                'password' => Hash::make('Password123'),
                'first_name' => $profile['first_name'],
                'middle_name' => $profile['middle_name'],
                'last_name' => $profile['last_name'],
                'gender' => $profile['gender'],
                'identified_as' => $profile['identified_as'],
                'phone' => '09'.str_pad((string) $landlordNumber, 9, '0', STR_PAD_LEFT),
                'date_of_birth' => $dateOfBirth,
                'profile_image' => null,
                'is_active' => true,
                'is_verified' => true,
                'payment_methods_settings' => [
                    'allowed' => ['cash', 'online'],
                    'details' => [
                        'cash' => ['enabled' => true],
                        'online' => ['enabled' => true, 'provider' => 'gcash'],
                    ],
                ],
                'notification_preferences' => [
                    'bookings' => true,
                    'payments' => true,
                    'maintenance' => true,
                ],
            ]
        );

        if ($landlord->wasRecentlyCreated) {
            $stats['created']++;
        } else {
            $stats['updated']++;
        }

        return $landlord;
    }

    private function upsertProperty(User $landlord, int $landlordNumber, string $propertyType, string $seedMode, array &$stats): Property
    {
        $propertyTitle = "test{$landlordNumber}-{$propertyType}";
        $roomCount = $propertyType === 'apartment' ? 8 : 6;
        $typeProfile = $this->buildPropertyProfile($propertyType);
        $genderRestriction = $this->resolvePropertyGenderRestriction($propertyType, $landlordNumber);
        $visibility = $this->resolvePropertyVisibility($seedMode);
        $latitude = round(6.900100 + ($landlordNumber * 0.010000) + $typeProfile['lat_offset'], 7);
        $longitude = round(122.073100 + ($landlordNumber * 0.010000) + $typeProfile['lng_offset'], 7);

        $property = Property::updateOrCreate(
            [
                'landlord_id' => $landlord->id,
                'title' => $propertyTitle,
            ],
            [
                'description' => ucfirst($propertyType).' property managed by '.$landlord->first_name.' '.$landlord->last_name.'.',
                'property_type' => $propertyType,
                'gender_restriction' => $genderRestriction,
                'current_status' => $visibility['current_status'],
                'street_address' => "{$landlordNumber}01 Test Street",
                'city' => 'Zamboanga City',
                'province' => 'Zamboanga del Sur',
                'postal_code' => '7000',
                'country' => 'Philippines',
                'barangay' => 'Test Barangay',
                'latitude' => $latitude,
                'longitude' => $longitude,
                'nearby_landmarks' => 'Near barangay hall and public transport terminal',
                'property_rules' => [
                    'Observe cleanliness in common areas',
                    'Keep noise levels low after 10:00 PM',
                    'Visitors are allowed only during visiting hours',
                ],
                'curfew_time' => $typeProfile['curfew_time'],
                'curfew_policy' => $typeProfile['curfew_policy'],
                'max_occupants' => $typeProfile['max_occupants'],
                'number_of_bedrooms' => $typeProfile['number_of_bedrooms'],
                'number_of_bathrooms' => $typeProfile['number_of_bathrooms'],
                'floor_area' => $typeProfile['floor_area'],
                'floor_level' => $typeProfile['floor_level'],
                'total_floors' => $typeProfile['total_floors'],
                'total_rooms' => $roomCount,
                'available_rooms' => $roomCount,
                'accepted_payments' => ['cash', 'online'],
                'require_1month_advance' => $typeProfile['require_1month_advance'],
                'allow_partial_payments' => $typeProfile['allow_partial_payments'],
                'require_reservation_fee' => $typeProfile['require_reservation_fee'],
                'reservation_fee_amount' => $typeProfile['reservation_fee_amount'],
                'is_published' => $visibility['is_published'],
                'is_available' => $visibility['is_available'],
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
        $roomGenderRestriction = strtolower((string) ($property->gender_restriction ?: 'mixed'));

        foreach ($roomTemplates as $roomTemplate) {
            $roomRules = $this->buildRoomRules($propertyType, $roomTemplate['room_type'], $roomTemplate['billing_policy']);
            $requireAdvance = $this->resolveRoomAdvanceRequirement($property, $roomTemplate['billing_policy']);

            $room = Room::updateOrCreate(
                [
                    'property_id' => $property->id,
                    'room_number' => $roomTemplate['room_number'],
                ],
                [
                    'room_type' => $roomTemplate['room_type'],
                    'gender_restriction' => $roomGenderRestriction,
                    'floor' => $roomTemplate['floor'],
                    'monthly_rate' => $roomTemplate['monthly_rate'],
                    'daily_rate' => $roomTemplate['daily_rate'],
                    'billing_policy' => $roomTemplate['billing_policy'],
                    'min_stay_days' => $roomTemplate['min_stay_days'],
                    'capacity' => $roomTemplate['capacity'],
                    'pricing_model' => $roomTemplate['pricing_model'],
                    'status' => 'available',
                    'require_1month_advance' => $requireAdvance,
                    'rules' => $roomRules,
                    'description' => "{$property->title} {$roomTemplate['room_number']}",
                ]
            );

            if ($room->wasRecentlyCreated) {
                $stats['created']++;
            } else {
                $stats['updated']++;
            }
        }

        $property->refresh();
        $property->updateTotalRooms();
        $property->updateAvailableRooms();
    }

    private function resolvePropertyGenderRestriction(string $propertyType, int $landlordNumber): string
    {
        if ($propertyType === 'apartment') {
            return 'mixed';
        }

        return $landlordNumber % 2 === 0 ? 'female' : 'male';
    }

    private function upsertPropertyAssets(
        Property $property,
        int $landlordNumber,
        string $propertyType,
        array $amenityIdsByName,
        array &$imageStats,
        array &$videoStats,
        array &$credentialStats,
        array &$amenityStats
    ): void {
        $this->upsertPropertyImages($property, $landlordNumber, $propertyType, $imageStats);
        $this->upsertPropertyVideo($property, $landlordNumber, $propertyType, $videoStats);
        $this->upsertPropertyCredentials($property, $propertyType, $credentialStats);
        $this->syncPropertyAmenities($property, $propertyType, $amenityIdsByName, $amenityStats);
    }

    private function upsertPropertyVideo(Property $property, int $landlordNumber, string $propertyType, array &$stats): void
    {
        // Optional seed: only some property types get a video, mirroring realistic landlord uploads.
        $videoSupported = in_array($propertyType, ['apartment', 'dormitory'], true);

        if (! $videoSupported) {
            $stats['deleted'] += PropertyImage::query()
                ->where('property_id', $property->id)
                ->where('media_type', 'video')
                ->delete();

            return;
        }

        $video = PropertyImage::updateOrCreate(
            [
                'property_id' => $property->id,
                'media_type' => 'video',
            ],
            [
                'image_url' => 'test/property-videos/'.$propertyType.'/landlord-'.$landlordNumber.'-tour.mp4',
                'is_primary' => false,
                'display_order' => 99,
            ]
        );

        $stats['deleted'] += PropertyImage::query()
            ->where('property_id', $property->id)
            ->where('media_type', 'video')
            ->where('id', '!=', $video->id)
            ->delete();

        if ($video->wasRecentlyCreated) {
            $stats['created']++;
        } else {
            $stats['updated']++;
        }
    }

    private function upsertPropertyImages(Property $property, int $landlordNumber, string $propertyType, array &$stats): void
    {
        $imageTemplates = [
            ['key' => 'front', 'is_primary' => true],
            ['key' => 'lobby', 'is_primary' => false],
            ['key' => 'hallway', 'is_primary' => false],
        ];

        foreach ($imageTemplates as $displayOrder => $template) {
            $image = PropertyImage::updateOrCreate(
                [
                    'property_id' => $property->id,
                    'display_order' => $displayOrder,
                ],
                [
                    'image_url' => 'test/property-images/'.$propertyType.'/landlord-'.$landlordNumber.'-'.$template['key'].'.jpg',
                    'media_type' => 'image',
                    'is_primary' => $template['is_primary'],
                ]
            );

            if ($image->wasRecentlyCreated) {
                $stats['created']++;
            } else {
                $stats['updated']++;
            }
        }
    }

    private function upsertPropertyCredentials(Property $property, string $propertyType, array &$stats): void
    {
        foreach ($this->buildPropertyCredentialTemplates($propertyType) as $credentialTemplate) {
            $credential = PropertyCredential::updateOrCreate(
                [
                    'property_id' => $property->id,
                    'original_name' => $credentialTemplate['original_name'],
                ],
                [
                    'file_path' => 'test/property-credentials/'.$property->id.'/'.$credentialTemplate['file_name'],
                    'mime' => $credentialTemplate['mime'],
                ]
            );

            if ($credential->wasRecentlyCreated) {
                $stats['created']++;
            } else {
                $stats['updated']++;
            }
        }
    }

    private function syncPropertyAmenities(Property $property, string $propertyType, array $amenityIdsByName, array &$stats): void
    {
        $amenityNames = self::PROPERTY_AMENITIES[$propertyType] ?? [];
        $amenityIds = array_values(array_filter(array_map(
            fn (string $amenityName) => $amenityIdsByName[$amenityName] ?? null,
            $amenityNames
        )));

        $changes = $property->amenities()->sync($amenityIds);
        $stats['created'] += count($changes['attached'] ?? []);
        $stats['updated'] += count($changes['updated'] ?? []);
        $stats['detached'] += count($changes['detached'] ?? []);
    }

    private function upsertRoomAssets(
        Property $property,
        string $propertyType,
        array $amenityIdsByName,
        array &$roomImageStats,
        array &$roomAmenityStats
    ): void {
        $rooms = $property->rooms()->orderBy('room_number')->get();

        foreach ($rooms as $room) {
            $this->syncRoomAmenities($room, $propertyType, $amenityIdsByName, $roomAmenityStats);
            $this->upsertRoomImages($room, $propertyType, $roomImageStats);
        }
    }

    private function syncRoomAmenities(Room $room, string $propertyType, array $amenityIdsByName, array &$stats): void
    {
        $amenityNames = $this->buildRoomAmenityNames($propertyType, $room->room_type);
        $amenityIds = array_values(array_filter(array_map(
            fn (string $amenityName) => $amenityIdsByName[$amenityName] ?? null,
            $amenityNames
        )));

        $changes = $room->amenities()->sync($amenityIds);
        $stats['created'] += count($changes['attached'] ?? []);
        $stats['updated'] += count($changes['updated'] ?? []);
        $stats['detached'] += count($changes['detached'] ?? []);
    }

    private function upsertRoomImages(Room $room, string $propertyType, array &$stats): void
    {
        $desiredImageUrls = [
            'test/room-images/'.$propertyType.'/room-'.$room->room_number.'-a.jpg',
            'test/room-images/'.$propertyType.'/room-'.$room->room_number.'-b.jpg',
        ];

        $stats['deleted'] += RoomImage::query()
            ->where('room_id', $room->id)
            ->whereNotIn('image_url', $desiredImageUrls)
            ->delete();

        foreach ($desiredImageUrls as $imageUrl) {
            $roomImage = RoomImage::updateOrCreate(
                [
                    'room_id' => $room->id,
                    'image_url' => $imageUrl,
                ],
                []
            );

            if ($roomImage->wasRecentlyCreated) {
                $stats['created']++;
            } else {
                $stats['updated']++;
            }
        }
    }

    private function buildRoomAmenityNames(string $propertyType, string $roomType): array
    {
        $baseAmenities = self::PROPERTY_AMENITIES[$propertyType] ?? ['WiFi'];
        $selected = array_slice($baseAmenities, 0, 4);

        if ($roomType === 'bedSpacer') {
            $selected[] = 'Laundry Area';
        }

        if ($roomType === 'quad') {
            $selected[] = 'Study Area';
        }

        return array_values(array_unique($selected));
    }

    private function buildRoomRules(string $propertyType, string $roomType, string $billingPolicy): array
    {
        $rules = [
            'Keep room and shared spaces clean daily.',
            'Observe quiet hours after 10:00 PM.',
        ];

        if ($propertyType !== 'apartment') {
            $rules[] = 'Visitors must log in at the reception area.';
        }

        if ($roomType === 'bedSpacer') {
            $rules[] = 'Do not occupy another bed without landlord approval.';
        }

        if ($billingPolicy === 'daily') {
            $rules[] = 'Daily stay check-in cutoff is 8:00 PM.';
        }

        return $rules;
    }

    private function resolveRoomAdvanceRequirement(Property $property, string $billingPolicy): bool
    {
        if ($billingPolicy === 'daily') {
            return false;
        }

        return (bool) ($property->require_1month_advance ?? false);
    }

    private function resolveSeedMode(): string
    {
        $mode = strtolower((string) env('TEST_PROPERTY_SEED_MODE', self::SEED_MODE_PENDING_REVIEW));

        return match ($mode) {
            'approved', self::SEED_MODE_APPROVED_LIVE => self::SEED_MODE_APPROVED_LIVE,
            default => self::SEED_MODE_PENDING_REVIEW,
        };
    }

    private function resolvePropertyVisibility(string $seedMode): array
    {
        if ($seedMode === self::SEED_MODE_APPROVED_LIVE) {
            return [
                'current_status' => Property::STATUS_ACTIVE,
                'is_published' => true,
                'is_available' => true,
            ];
        }

        return [
            'current_status' => Property::STATUS_PENDING,
            'is_published' => false,
            'is_available' => false,
        ];
    }

    private function seedAmenityCatalog(): array
    {
        $idsByName = [];

        foreach (self::AMENITY_CATALOG as $amenityTemplate) {
            $amenity = Amenity::updateOrCreate(
                ['name' => $amenityTemplate['name']],
                [
                    'icon' => $amenityTemplate['icon'],
                    'description' => $amenityTemplate['description'],
                ]
            );

            $idsByName[$amenity->name] = $amenity->id;
        }

        return $idsByName;
    }

    private function buildPropertyProfile(string $propertyType): array
    {
        return match ($propertyType) {
            'apartment' => [
                'max_occupants' => 8,
                'number_of_bedrooms' => 2,
                'number_of_bathrooms' => 1,
                'floor_area' => 38.50,
                'floor_level' => '2nd Floor',
                'total_floors' => 3,
                'curfew_time' => null,
                'curfew_policy' => 'No curfew for apartment tenants.',
                'require_1month_advance' => true,
                'allow_partial_payments' => false,
                'require_reservation_fee' => false,
                'reservation_fee_amount' => 0,
                'lat_offset' => 0.0002,
                'lng_offset' => 0.0002,
            ],
            'dormitory' => [
                'max_occupants' => 10,
                'number_of_bedrooms' => 4,
                'number_of_bathrooms' => 2,
                'floor_area' => 85.00,
                'floor_level' => 'Ground to 2nd Floor',
                'total_floors' => 2,
                'curfew_time' => '22:00',
                'curfew_policy' => 'Gate closes at 10:00 PM. Late entry requires prior notice.',
                'require_1month_advance' => true,
                'allow_partial_payments' => true,
                'require_reservation_fee' => false,
                'reservation_fee_amount' => 0,
                'lat_offset' => 0.0001,
                'lng_offset' => 0.0001,
            ],
            'boardingHouse' => [
                'max_occupants' => 8,
                'number_of_bedrooms' => 6,
                'number_of_bathrooms' => 3,
                'floor_area' => 72.00,
                'floor_level' => 'Ground to 2nd Floor',
                'total_floors' => 2,
                'curfew_time' => '22:00',
                'curfew_policy' => 'Tenants are expected to be back before 10:00 PM for safety checks.',
                'require_1month_advance' => true,
                'allow_partial_payments' => true,
                'require_reservation_fee' => false,
                'reservation_fee_amount' => 0,
                'lat_offset' => 0.0003,
                'lng_offset' => 0.0003,
            ],
            'bedSpacer' => [
                'max_occupants' => 6,
                'number_of_bedrooms' => 3,
                'number_of_bathrooms' => 2,
                'floor_area' => 56.00,
                'floor_level' => '1st Floor',
                'total_floors' => 1,
                'curfew_time' => '22:00',
                'curfew_policy' => 'Guests and tenants should observe quiet hours after 10:00 PM.',
                'require_1month_advance' => false,
                'allow_partial_payments' => true,
                'require_reservation_fee' => false,
                'reservation_fee_amount' => 0,
                'lat_offset' => 0.0004,
                'lng_offset' => 0.0004,
            ],
            default => [
                'max_occupants' => 6,
                'number_of_bedrooms' => 2,
                'number_of_bathrooms' => 1,
                'floor_area' => 40.00,
                'floor_level' => '1st Floor',
                'total_floors' => 1,
                'curfew_time' => null,
                'curfew_policy' => null,
                'require_1month_advance' => false,
                'allow_partial_payments' => true,
                'require_reservation_fee' => false,
                'reservation_fee_amount' => 0,
                'lat_offset' => 0.0000,
                'lng_offset' => 0.0000,
            ],
        };
    }

    private function buildPropertyCredentialTemplates(string $propertyType): array
    {
        $base = [
            [
                'original_name' => 'Business Permit.pdf',
                'file_name' => 'business_permit.pdf',
                'mime' => 'application/pdf',
            ],
            [
                'original_name' => 'Proof of Ownership.pdf',
                'file_name' => 'proof_of_ownership.pdf',
                'mime' => 'application/pdf',
            ],
        ];

        if ($propertyType === 'apartment' || $propertyType === 'dormitory') {
            $base[] = [
                'original_name' => 'Fire Safety Certificate.pdf',
                'file_name' => 'fire_safety_certificate.pdf',
                'mime' => 'application/pdf',
            ];
        }

        return $base;
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
                $this->roomTemplate('R01', 'bedSpacer', 'daily', 1, 1),
                $this->roomTemplate('R02', 'bedSpacer', 'daily', 1, 2),
                $this->roomTemplate('R03', 'bedSpacer', 'monthly', 1, 1),
                $this->roomTemplate('R04', 'bedSpacer', 'monthly', 1, 2),
                $this->roomTemplate('R05', 'bedSpacer', 'monthly_with_daily', 1, 1),
                $this->roomTemplate('R06', 'bedSpacer', 'monthly_with_daily', 1, 2),
            ];
        }

        if ($propertyType === 'dormitory') {
            return [
                $this->roomTemplate('R01', 'single', 'daily', 1),
                $this->roomTemplate('R02', 'bedSpacer', 'daily', 1, 1),
                $this->roomTemplate('R03', 'single', 'monthly', 2),
                $this->roomTemplate('R04', 'bedSpacer', 'monthly', 2, 2),
                $this->roomTemplate('R05', 'single', 'monthly_with_daily', 2),
                $this->roomTemplate('R06', 'bedSpacer', 'monthly_with_daily', 2, 2),
            ];
        }

        // boardingHouse uses only single and bedSpacer room types.
        return [
            $this->roomTemplate('R01', 'single', 'daily', 1),
            $this->roomTemplate('R02', 'bedSpacer', 'daily', 1, 1),
            $this->roomTemplate('R03', 'single', 'monthly', 2),
            $this->roomTemplate('R04', 'bedSpacer', 'monthly', 2, 2),
            $this->roomTemplate('R05', 'single', 'monthly_with_daily', 2),
            $this->roomTemplate('R06', 'bedSpacer', 'monthly_with_daily', 2, 2),
        ];
    }

    private function roomTemplate(string $roomNumber, string $roomType, string $billingPolicy, int $floor, ?int $explicitCapacity = null): array
    {
        $capacity = $explicitCapacity ?? match ($roomType) {
            'single' => 1,
            'double' => 2,
            'quad' => 4,
            'bedSpacer' => 1,
            default => 1,
        };

        $baseMonthlyRate = match ($roomType) {
            'single' => 4500,
            'double' => 7500,
            'quad' => 12000,
            'bedSpacer' => $capacity === 2 ? 3200 : 2500,
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
