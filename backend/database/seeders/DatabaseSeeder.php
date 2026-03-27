<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Call the UserSeeder we created earlier
        $this->call([
            AdminUserSeeder::class,
            TestLandlordPropertyRoomSeeder::class,
        ]);

        $this->command->info('🎉 Database seeding completed successfully!');
    }
}
