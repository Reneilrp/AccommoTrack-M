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
            if (! Schema::hasColumn('properties', 'max_occupants')) {
                $table->integer('max_occupants')->default(1)->after('nearby_landmarks');
            }
            if (! Schema::hasColumn('properties', 'number_of_bedrooms')) {
                $table->integer('number_of_bedrooms')->nullable()->after('max_occupants');
            }
            if (! Schema::hasColumn('properties', 'number_of_bathrooms')) {
                $table->integer('number_of_bathrooms')->nullable()->after('number_of_bedrooms');
            }
            if (! Schema::hasColumn('properties', 'floor_area')) {
                $table->decimal('floor_area', 10, 2)->nullable()->after('number_of_bathrooms');
            }
            if (! Schema::hasColumn('properties', 'floor_level')) {
                $table->string('floor_level')->nullable()->after('floor_area');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn(['max_occupants', 'number_of_bedrooms', 'number_of_bathrooms', 'floor_area', 'floor_level']);
        });
    }
};
