<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->unsignedTinyInteger('normal_booking_limit')->default(1)->after('allow_partial_payments');
            $table->unsignedTinyInteger('proxy_booking_limit')->default(3)->after('normal_booking_limit');
            $table->unsignedTinyInteger('min_partial_payment_pct')->default(20)->after('proxy_booking_limit');
        });
        
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('booking_group_reference')->nullable()->after('booking_id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn(['normal_booking_limit', 'proxy_booking_limit', 'min_partial_payment_pct']);
        });
        
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('booking_group_reference');
        });
    }
};
