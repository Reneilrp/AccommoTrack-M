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
        Schema::table('rooms', function (Blueprint $table) {
            if (!Schema::hasColumn('rooms', 'min_stay_days')) {
                $table->integer('min_stay_days')->default(1)->after('billing_policy');
            }
            if (!Schema::hasColumn('rooms', 'prorate_base')) {
                $table->integer('prorate_base')->default(30)->after('min_stay_days');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            if (Schema::hasColumn('rooms', 'prorate_base')) {
                $table->dropColumn('prorate_base');
            }
            if (Schema::hasColumn('rooms', 'min_stay_days')) {
                $table->dropColumn('min_stay_days');
            }
        });
    }
};
