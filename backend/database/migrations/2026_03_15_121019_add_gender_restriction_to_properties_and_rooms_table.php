<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            if (! Schema::hasColumn('properties', 'gender_restriction')) {
                $table->enum('gender_restriction', ['male', 'female', 'mixed'])->default('mixed')->after('property_type');
            }
        });

        Schema::table('rooms', function (Blueprint $table) {
            if (! Schema::hasColumn('rooms', 'gender_restriction')) {
                $table->enum('gender_restriction', ['male', 'female', 'mixed'])->default('mixed')->after('room_type');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn('gender_restriction');
        });

        Schema::table('rooms', function (Blueprint $table) {
            $table->dropColumn('gender_restriction');
        });
    }
};
