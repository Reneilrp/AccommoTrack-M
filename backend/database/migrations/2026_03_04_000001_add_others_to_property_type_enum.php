<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // MySQL: extend the enum to include 'others'
        DB::statement("ALTER TABLE properties MODIFY COLUMN property_type ENUM('dormitory', 'apartment', 'boardingHouse', 'bedSpacer', 'others') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Convert any 'others' rows back to a safe default before shrinking enum
        DB::statement("UPDATE properties SET property_type = 'apartment' WHERE property_type = 'others'");
        DB::statement("ALTER TABLE properties MODIFY COLUMN property_type ENUM('dormitory', 'apartment', 'boardingHouse', 'bedSpacer') NOT NULL");
    }
};
