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
        // 1. Refactor addons table
        Schema::table('addons', function (Blueprint $table) {
            $table->integer('price_cents')->nullable()->after('price');
        });
        DB::table('addons')->update(['price_cents' => DB::raw('ROUND(price * 100)')]);
        Schema::table('addons', function (Blueprint $table) {
            $table->dropColumn('price');
            $table->integer('price_cents')->nullable(false)->change();
        });

        // 2. Refactor booking_addons table
        Schema::table('booking_addons', function (Blueprint $table) {
            $table->integer('price_at_booking_cents')->nullable()->after('price_at_booking');
        });
        DB::table('booking_addons')->update(['price_at_booking_cents' => DB::raw('ROUND(price_at_booking * 100)')]);
        Schema::table('booking_addons', function (Blueprint $table) {
            $table->dropColumn('price_at_booking');
            $table->integer('price_at_booking_cents')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking_addons', function (Blueprint $table) {
            $table->decimal('price_at_booking', 10, 2)->nullable()->after('price_at_booking_cents');
        });
        DB::table('booking_addons')->update(['price_at_booking' => DB::raw('price_at_booking_cents / 100')]);
        Schema::table('booking_addons', function (Blueprint $table) {
            $table->dropColumn('price_at_booking_cents');
            $table->decimal('price_at_booking', 10, 2)->nullable(false)->change();
        });

        Schema::table('addons', function (Blueprint $table) {
            $table->decimal('price', 10, 2)->nullable()->after('price_cents');
        });
        DB::table('addons')->update(['price' => DB::raw('price_cents / 100')]);
        Schema::table('addons', function (Blueprint $table) {
            $table->dropColumn('price_cents');
            $table->decimal('price', 10, 2)->nullable(false)->change();
        });
    }
};
