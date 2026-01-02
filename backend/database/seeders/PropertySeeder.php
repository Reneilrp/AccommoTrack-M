<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Property;
use App\Models\PropertyImage;
use App\Models\User;

class PropertySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get landlords with IDs 1 and 2
        $landlords = User::whereIn('id', [1, 2])->where('role', 'landlord')->get();
        $propertyImages = [
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
            'https://images.unsplash.com/photo-1465101046530-73398c7f28ca',
        ];

        $propertyData = [
            1 => [
                'title' => 'Pheinz Apartment',
                'description' => 'Modern apartment in Zamboanga City owned by Pheinz Reneil.',
                'street_address' => '101 Mayor Jaldon St',
                'barangay' => 'Barangay Zone I',
                'postal_code' => '7000',
                'latitude' => 6.9100,
                'longitude' => 122.0730,
            ],
            2 => [
                'title' => 'Neal Jean Residence',
                'description' => 'Cozy residence in Zamboanga City owned by Neal Jean.',
                'street_address' => '202 Gov. Alvarez Ave',
                'barangay' => 'Barangay Zone II',
                'postal_code' => '7000',
                'latitude' => 6.9214,
                'longitude' => 122.0790,
            ],
        ];

        foreach ($landlords as $i => $landlord) {
            $data = $propertyData[$landlord->id] ?? [
                'title' => 'Sample Property',
                'description' => 'A property in Zamboanga City.',
                'street_address' => 'Unknown',
                'barangay' => 'Barangay Uno',
                'postal_code' => '7000',
                'latitude' => 6.9214,
                'longitude' => 122.0790,
            ];
            $property = Property::create([
                'landlord_id' => $landlord->id,
                'title' => $data['title'],
                'description' => $data['description'],
                'property_type' => 'apartment',
                'street_address' => $data['street_address'],
                'city' => 'Zamboanga City',
                'province' => 'Zamboanga',
                'barangay' => $data['barangay'],
                'postal_code' => $data['postal_code'],
                'latitude' => $data['latitude'],
                'longitude' => $data['longitude'],
                'is_published' => true,
                'is_available' => true,
            ]);

            // Add property image
            PropertyImage::create([
                'property_id' => $property->id,
                'image_url' => $propertyImages[$i % count($propertyImages)],
                'is_primary' => true,
                'display_order' => 0,
            ]);
        }
    }
}
