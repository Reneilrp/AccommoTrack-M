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
            $table->decimal('transfer_fee', 10, 2)->default(0)->after('current_status');
        });

        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->decimal('quoted_transfer_fee', 10, 2)->default(0)->after('credit_calculation');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn('transfer_fee');
        });

        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->dropColumn('quoted_transfer_fee');
        });
    }
};
