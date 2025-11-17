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
            'email' => 'pheinz.magnun@gmail.com',
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
            'email' => 'JinBilog0v0@gmail.com',
            'password' => Hash::make('Password123'),
            'first_name' => 'Neal Jean',
            'middle_name' => 'Lape',
            'last_name' => 'Claro',
            'phone' => '0911111111',
            'profile_image' => null,
            'is_active' => true,
        ]);

        $landlord3 = User::create([
            'role' => 'landlord',
            'email' => 'JPEnriquez@example.com',
            'password' => Hash::make('Password123'),
            'first_name' => 'John Paul',
            'middle_name' => '',
            'last_name' => 'Enriquez',
            'phone' => '0922222222',
            'profile_image' => null,
            'is_active' => true,
        ]);
        $landlord4 = User::create([
            'role' => 'landlord',
            'email' => 'Ar-rauf@gmail.com',
            'password' => Hash::make('Password123'),
            'first_name' => 'Ar-rauf',
            'middle_name' => '',
            'last_name' => 'Imar',
            'phone' => '09191234567',
            'profile_image' => null,
            'is_active' => true,
        ]);
        $landlord5 = User::create([
            'role' => 'landlord',
            'email' => 'landlord3@example.com',
            'password' => Hash::make('password123'),
            'first_name' => 'Rhadzmiel',
            'middle_name' => '',
            'last_name' => 'Sali',
            'phone' => '09191234567',
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

        $tenant3 = User::create([
            'role' => 'tenant',
            'email' => 'tenant3@example.com',
            'password' => Hash::make('password123'),
            'first_name' => 'Rawrr',
            'middle_name' => '',
            'last_name' => 'Rawrrr',
            'phone' => '09141234567',
            'profile_image' => null,
            'is_active' => true,
        ]);

        $tenant4 = User::create([
            'role' => 'tenant',
            'email' => 'tenant4@example.com',
            'password' => Hash::make('password123'),
            'first_name' => 'Rawrr',
            'middle_name' => '',
            'last_name' => 'Rawrrr',
            'phone' => '09151234567',
            'profile_image' => null,
            'is_active' => true,
        ]);

        $tenant5 = User::create([
            'role' => 'tenant',
            'email' => 'tenant5@example.com',
            'password' => Hash::make('password123'),
            'first_name' => 'Rawrr',
            'middle_name' => '',
            'last_name' => 'Rawrrr',
            'phone' => '09161234567',
            'profile_image' => null,
            'is_active' => true,
        ]);

        echo "✓ Created 5 landlords\n";
        echo "✓ Created 5 tenants\n";
        echo "✓ Total users: 9\n";
    }
}