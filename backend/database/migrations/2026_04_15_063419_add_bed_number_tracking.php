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
        Schema::table('room_tenant_assignments', function (Blueprint $table) {
            $table->string('bed_numbers')->nullable()->after('bed_count')
                  ->comment('Comma-separated bed numbers assigned (e.g., "1,3,5")');
        });

        Schema::table('booking_occupants', function (Blueprint $table) {
            $table->integer('bed_number')->nullable()->after('sex')
                  ->comment('Specific bed number assigned to this occupant');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('room_tenant_assignments', function (Blueprint $table) {
            $table->dropColumn('bed_numbers');
        });

        Schema::table('booking_occupants', function (Blueprint $table) {
            $table->dropColumn('bed_number');
        });
    }
};
