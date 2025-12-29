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

        foreach ($landlords as $i => $landlord) {
            $property = Property::create([
                'landlord_id' => $landlord->id,
                'title' => 'Sample Property for Landlord ' . $landlord->id,
                'description' => 'A beautiful property owned by ' . $landlord->first_name,
                'property_type' => 'apartment',
                'street_address' => '123 Main St',
                'city' => 'Metro City',
                'province' => 'Metro Province',
                'barangay' => 'Barangay Uno',
                'postal_code' => '1000',
                'latitude' => 14.5995,
                'longitude' => 120.9842,
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
