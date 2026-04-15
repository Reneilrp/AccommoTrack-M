<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Change enum restrictions to string on 'users' to avoid enum issues, then change name
        if (Schema::hasColumn('users', 'gender')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('gender', 32)->nullable()->change();
            });
            DB::table('users')->whereNotIn('gender', ['male', 'female'])->update(['gender' => null]);
            Schema::table('users', function (Blueprint $table) {
                $table->renameColumn('gender', 'sex');
            });
        }
        
        // Rooms
        if (Schema::hasColumn('rooms', 'gender_restriction')) {
            Schema::table('rooms', function (Blueprint $table) {
                $table->string('gender_restriction', 32)->default('mixed')->change();
            });
            Schema::table('rooms', function (Blueprint $table) {
                $table->renameColumn('gender_restriction', 'sex_restriction');
            });
        }
        
        // Properties
        if (Schema::hasColumn('properties', 'gender_restriction')) {
            Schema::table('properties', function (Blueprint $table) {
                $table->string('gender_restriction', 32)->default('mixed')->change();
            });
            Schema::table('properties', function (Blueprint $table) {
                $table->renameColumn('gender_restriction', 'sex_restriction');
            });
        }
        
        // Booking Occupants
        if (Schema::hasColumn('booking_occupants', 'gender')) {
            Schema::table('booking_occupants', function (Blueprint $table) {
                $table->renameColumn('gender', 'sex');
            });
        }
        
        if (!Schema::hasColumn('booking_occupants', 'first_name')) {
            Schema::table('booking_occupants', function (Blueprint $table) {
                $table->string('first_name')->nullable()->after('booking_id');
            });
        }
        if (!Schema::hasColumn('booking_occupants', 'last_name')) {
            Schema::table('booking_occupants', function (Blueprint $table) {
                $table->string('last_name')->nullable()->after('first_name');
            });
        }
        
        // Migrate data
        if (Schema::hasColumn('booking_occupants', 'full_name')) {
            $occupants = DB::table('booking_occupants')->get();
            foreach ($occupants as $occupant) {
                $name = $occupant->full_name ?? '';
                $parts = array_filter(explode(' ', trim($name)));
                $last_name = array_pop($parts);
                $first_name = implode(' ', $parts);
                if (empty($first_name)) {
                    $first_name = rtrim((string)$last_name);
                    $last_name = null;
                }
                
                DB::table('booking_occupants')->where('id', $occupant->id)->update([
                    'first_name' => rtrim((string)$first_name) ?: null,
                    'last_name' => rtrim((string)$last_name) ?: null,
                ]);
            }
            
            Schema::table('booking_occupants', function (Blueprint $table) {
                $table->dropColumn('full_name');
            });
        }
    }

    public function down(): void
    {
    }
};
