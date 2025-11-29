<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * This will create or update a single admin user. Credentials are read
     * from the environment variables `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
     * Default: admin@example.com / password123 (for development only).
     *
     * @return void
     */
    public function run()
    {
        $email = env('ADMIN_EMAIL', 'admin@example.com');
        $password = env('ADMIN_PASSWORD', 'password123');

        User::updateOrCreate(
            ['email' => $email],
            [
                'first_name' => 'System',
                'last_name' => 'Administrator',
                'email' => $email,
                'password' => Hash::make($password),
                'role' => 'admin',
                'is_verified' => true,
                'is_active' => true,
            ]
        );

        $this->command->info("Admin user created/updated: {$email}");
    }
}
