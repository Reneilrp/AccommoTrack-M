<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modify the enum to include 'draft'
        DB::statement("ALTER TABLE `properties` MODIFY `current_status` ENUM('active','inactive','pending','maintenance','draft') NOT NULL DEFAULT 'active'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to previous enum values (remove 'draft')
        DB::statement("ALTER TABLE `properties` MODIFY `current_status` ENUM('active','inactive','pending','maintenance') NOT NULL DEFAULT 'active'");
    }
};
