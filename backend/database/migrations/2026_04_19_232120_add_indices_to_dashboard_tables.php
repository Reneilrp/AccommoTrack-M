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
            $table->index(['landlord_id', 'status'], 'idx_bookings_landlord_status');
        });

        Schema::table('rooms', function (Blueprint $table) {
            $table->index(['property_id', 'status'], 'idx_rooms_property_status');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->index(['landlord_id', 'status'], 'idx_invoices_landlord_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('idx_bookings_landlord_status');
        });

        Schema::table('rooms', function (Blueprint $table) {
            $table->dropIndex('idx_rooms_property_status');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex('idx_invoices_landlord_status');
        });
    }
};
