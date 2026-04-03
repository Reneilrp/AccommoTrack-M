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
            $table->decimal('reservation_fee', 10, 2)->default(1000.00)->after('transfer_fee');
            $table->string('gcash_name')->nullable()->after('reservation_fee');
            $table->string('gcash_number')->nullable()->after('gcash_name');
            $table->string('gcash_qr_path')->nullable()->after('gcash_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn(['reservation_fee', 'gcash_name', 'gcash_number', 'gcash_qr_path']);
        });
    }
};
