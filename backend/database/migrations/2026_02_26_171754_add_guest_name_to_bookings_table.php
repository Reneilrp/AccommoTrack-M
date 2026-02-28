<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('guest_name')->nullable()->after('landlord_id');
            $table->unsignedBigInteger('tenant_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('guest_name');
            $table->unsignedBigInteger('tenant_id')->nullable(false)->change();
        });
    }
};
