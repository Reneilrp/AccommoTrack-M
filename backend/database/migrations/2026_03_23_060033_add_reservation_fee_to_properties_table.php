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
            $table->boolean('require_reservation_fee')->default(false)->after('allow_partial_payments');
            $table->decimal('reservation_fee_amount', 10, 2)->default(0)->after('require_reservation_fee');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn(['require_reservation_fee', 'reservation_fee_amount']);
        });
    }
};
