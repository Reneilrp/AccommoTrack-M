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
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('receipt_image_path')->nullable()->after('status');
            $table->string('reference_number')->nullable()->unique()->after('receipt_image_path');
            $table->date('move_in_date')->nullable()->after('start_date');
        });
        
        // Due to MySQL strict mode, modifying ENUMs can be tricky. It's safer to use raw query if modifying ENUM.
        // Assuming current status ENUM is: 'pending', 'confirmed', 'cancelled', 'completed', 'active'
        DB::statement("ALTER TABLE bookings MODIFY COLUMN status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'active', 'pending_reservation', 'reserved') NOT NULL DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['receipt_image_path', 'reference_number', 'move_in_date']);
        });
        
        // Reverting enum carefully, though any rows with new statuses will prevent this down migration from running effectively
        // unless they are updated first.
        DB::statement("ALTER TABLE bookings MODIFY COLUMN status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'active') NOT NULL DEFAULT 'pending'");
    }
};
