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
        if (! Schema::hasColumn('properties', 'reservation_fee_gap_days')) {
            Schema::table('properties', function (Blueprint $table) {
                $table->unsignedInteger('reservation_fee_gap_days')
                    ->default(3)
                    ->after('reservation_fee');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('properties', 'reservation_fee_gap_days')) {
            Schema::table('properties', function (Blueprint $table) {
                $table->dropColumn('reservation_fee_gap_days');
            });
        }
    }
};