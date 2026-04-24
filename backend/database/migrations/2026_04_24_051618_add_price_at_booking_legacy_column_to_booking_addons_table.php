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
        if (!Schema::hasColumn('booking_addons', 'price_at_booking')) {
            Schema::table('booking_addons', function (Blueprint $table) {
                $table->decimal('price_at_booking', 10, 2)->nullable()->after('quantity');
            });

            // Sync data from cents column if it exists
            if (Schema::hasColumn('booking_addons', 'price_at_booking_cents')) {
                DB::table('booking_addons')->update([
                    'price_at_booking' => DB::raw('price_at_booking_cents / 100')
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking_addons', function (Blueprint $table) {
            $table->dropColumn('price_at_booking');
        });
    }
};
