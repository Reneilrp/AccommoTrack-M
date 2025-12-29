<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Landlord Users
        $landlord1 = User::create([
            'role' => 'landlord',
            'email' => 'landlord1@example.com',
            'password' => Hash::make('Password123'),
            'first_name' => 'Pheinz Reneil',
            'middle_name' => 'Tambis',
            'last_name' => 'Magnun',
            'phone' => '09936929775',
            'profile_image' => null,
            'is_active' => true,
        ]);

        $landlord2 = User::create([
            'role' => 'landlord',
            'email' => 'landlord2@example.com',
            'password' => Hash::make('Password123'),
            'first_name' => 'Neal Jean',
            'middle_name' => 'Lape',
            'last_name' => 'Claro',
            'phone' => '0911111111',
            'profile_image' => null,
            'is_active' => true,
        ]);

        // Create Tenant Users
        $tenant1 = User::create([
            'role' => 'tenant',
            'email' => 'tenant1@example.com',
            'password' => Hash::make('password123'),
            'first_name' => 'Rawrr',
            'middle_name' => '',
            'last_name' => 'Rawrrr',
            'phone' => '09121234567',
            'profile_image' => null,
            'is_active' => true,
        ]);

        $tenant2 = User::create([
            'role' => 'tenant',
            'email' => 'tenant2@example.com',
            'password' => Hash::make('password123'),
            'first_name' => 'Rawrr',
            'middle_name' => '',
            'last_name' => 'Rawrrr',
            'phone' => '09131234567',
            'profile_image' => null,
            'is_active' => true,
        ]);

        echo "✓ Created 2 landlords\n";
        echo "✓ Created 2 tenants\n";
        echo "✓ Total users: 4\n";
    }
}