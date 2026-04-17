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
            $table->boolean('force_wallet_refunds')->default(true)->after('allow_partial_payments');
        });

        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->enum('refund_preference', ['wallet', 'cash'])->default('wallet')->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->dropColumn('refund_preference');
        });

        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn('force_wallet_refunds');
        });
    }
};
