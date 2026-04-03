<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('booking_mode', 16)->default('normal')->after('tenant_id');
            $table->string('booking_group_reference', 64)->nullable()->after('booking_reference');

            $table->index(['property_id', 'tenant_id', 'booking_mode', 'status'], 'idx_bookings_mode_limit');
            $table->index('booking_group_reference', 'idx_bookings_group_reference');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('idx_bookings_mode_limit');
            $table->dropIndex('idx_bookings_group_reference');
            $table->dropColumn(['booking_mode', 'booking_group_reference']);
        });
    }
};
