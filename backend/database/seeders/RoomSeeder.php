<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Room;
use App\Models\Property;
use App\Models\RoomImage;

class RoomSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roomImages = [
            'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd',
            'https://images.unsplash.com/photo-1507089947368-19c1da9775ae',
        ];

        // Get properties belonging to landlord IDs 1 and 2
        $properties = Property::whereIn('landlord_id', [1, 2])->get();
        foreach ($properties as $property) {
            for ($i = 1; $i <= 10; $i++) {
                $room = Room::create([
                    'property_id' => $property->id,
                    'room_number' => 'R' . str_pad($i, 2, '0', STR_PAD_LEFT),
                    'room_type' => 'single',
                    'floor' => 1,
                    'monthly_rate' => 5000 + ($i * 100),
                    'billing_policy' => 'monthly',
                    'capacity' => 1,
                    'pricing_model' => 'full_room',
                    'status' => 'available',
                    'description' => 'Room ' . $i . ' in ' . $property->title,
                ]);
                // Add room image
                RoomImage::create([
                    'room_id' => $room->id,
                    'image_url' => $roomImages[$i % count($roomImages)],
                ]);
            }
        }
    }
}
