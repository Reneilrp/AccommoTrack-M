<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class DropPricingFieldsFromRooms extends Migration
{
    /**
     * Run the migrations.
     *
     * Drops `min_stay_days` and `prorate_base` from `rooms` if they exist.
     *
     * @return void
     */
    public function up()
    {
        // Drop each column individually to avoid exceptions if one is already missing
        if (Schema::hasColumn('rooms', 'min_stay_days')) {
            Schema::table('rooms', function (Blueprint $table) {
                $table->dropColumn('min_stay_days');
            });
        }

        if (Schema::hasColumn('rooms', 'prorate_base')) {
            Schema::table('rooms', function (Blueprint $table) {
                $table->dropColumn('prorate_base');
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * Re-adds the columns with previous defaults so the change is reversible.
     * @return void
     */
    public function down()
    {
        Schema::table('rooms', function (Blueprint $table) {
            if (!Schema::hasColumn('rooms', 'min_stay_days')) {
                $table->integer('min_stay_days')->nullable()->after('billing_policy');
            }
            if (!Schema::hasColumn('rooms', 'prorate_base')) {
                $table->integer('prorate_base')->default(30)->after('min_stay_days');
            }
        });
    }
}
