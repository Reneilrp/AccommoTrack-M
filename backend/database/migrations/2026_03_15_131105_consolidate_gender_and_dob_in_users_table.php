<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\TenantProfile;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add gender to users table if it doesn't exist
        if (!Schema::hasColumn('users', 'gender')) {
            Schema::table('users', function (Blueprint $table) {
                $table->enum('gender', ['male', 'female', 'other', 'prefer_not_to_say'])->nullable()->after('last_name');
            });
        }
        
        // Ensure date_of_birth is on users table
        if (!Schema::hasColumn('users', 'date_of_birth')) {
             Schema::table('users', function (Blueprint $table) {
                $table->date('date_of_birth')->nullable()->after('phone');
            });
        }

        // Data migration
        $profiles = TenantProfile::whereNotNull('gender')->orWhereNotNull('date_of_birth')->get();
        foreach ($profiles as $profile) {
            $user = $profile->user;
            if ($user) {
                $updateData = [];
                if ($profile->gender && is_null($user->gender)) {
                    $updateData['gender'] = strtolower($profile->gender);
                }
                if ($profile->date_of_birth && is_null($user->date_of_birth)) {
                     $updateData['date_of_birth'] = $profile->date_of_birth;
                }
                if (!empty($updateData)) {
                    DB::table('users')->where('id', $user->id)->update($updateData);
                }
            }
        }

        // Drop columns from tenant_profiles
        if (Schema::hasColumn('tenant_profiles', 'gender')) {
            Schema::table('tenant_profiles', function (Blueprint $table) {
                $table->dropColumn('gender');
            });
        }
        if (Schema::hasColumn('tenant_profiles', 'date_of_birth')) {
            Schema::table('tenant_profiles', function (Blueprint $table) {
                $table->dropColumn('date_of_birth');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Add columns back to tenant_profiles
        if (!Schema::hasColumn('tenant_profiles', 'gender')) {
            Schema::table('tenant_profiles', function (Blueprint $table) {
                $table->string('gender')->nullable();
            });
        }
        if (!Schema::hasColumn('tenant_profiles', 'date_of_birth')) {
             Schema::table('tenant_profiles', function (Blueprint $table) {
                $table->date('date_of_birth')->nullable();
            });
        }
        
        // Restore data if possible (simplified)
        $users = User::whereNotNull('gender')->orWhereNotNull('date_of_birth')->get();
        foreach($users as $user) {
            $profile = $user->tenantProfile;
            if ($profile) {
                 DB::table('tenant_profiles')->where('user_id', $user->id)->update([
                     'gender' => $user->gender,
                     'date_of_birth' => $user->date_of_birth,
                 ]);
            }
        }

        // Drop columns from users
        if (Schema::hasColumn('users', 'gender')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('gender');
            });
        }
    }
};
