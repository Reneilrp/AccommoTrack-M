<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('bookings', 'contract_mode')) {
                $table->string('contract_mode', 16)->nullable()->after('payment_plan');
                $table->index(['payment_plan', 'contract_mode'], 'idx_bookings_payment_contract_mode');
            }
        });

        DB::table('bookings')
            ->whereNull('contract_mode')
            ->update(['contract_mode' => 'monthly']);

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("
                UPDATE bookings b
                INNER JOIN rooms r ON r.id = b.room_id
                SET b.contract_mode = 'daily'
                WHERE r.billing_policy = 'daily'
            ");
        }
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'contract_mode')) {
                $table->dropIndex('idx_bookings_payment_contract_mode');
                $table->dropColumn('contract_mode');
            }
        });
    }
};
