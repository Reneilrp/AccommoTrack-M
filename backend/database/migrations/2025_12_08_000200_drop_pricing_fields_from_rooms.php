<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class DropPricingFieldsFromRooms extends Migration
{
    /**
     * Run the migrations.
     *
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
        });
    }
}
