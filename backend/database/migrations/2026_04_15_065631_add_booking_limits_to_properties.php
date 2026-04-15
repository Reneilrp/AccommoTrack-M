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
            // Check if columns don't already exist (they might from earlier schema)
            if (!Schema::hasColumn('properties', 'normal_booking_limit')) {
                $table->integer('normal_booking_limit')->default(1)->after('proxy_booking_limit')
                      ->comment('Max concurrent normal bookings per tenant (1-4)');
            }
            if (!Schema::hasColumn('properties', 'proxy_booking_limit')) {
                $table->integer('proxy_booking_limit')->default(3)->after('allow_partial_payments')
                      ->comment('Max concurrent proxy bookings per tenant (1-4)');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            if (Schema::hasColumn('properties', 'normal_booking_limit')) {
                $table->dropColumn('normal_booking_limit');
            }
            if (Schema::hasColumn('properties', 'proxy_booking_limit')) {
                $table->dropColumn('proxy_booking_limit');
            }
        });
    }
};
