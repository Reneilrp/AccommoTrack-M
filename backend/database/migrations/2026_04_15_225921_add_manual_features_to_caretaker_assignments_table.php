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
        Schema::table('caretaker_assignments', function (Blueprint $table) {
            $table->boolean('can_add_tenant_manually')->default(false)->after('can_view_tenants');
            $table->boolean('can_add_manual_bookings')->default(false)->after('can_view_bookings');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('caretaker_assignments', function (Blueprint $table) {
            $table->dropColumn(['can_add_tenant_manually', 'can_add_manual_bookings']);
        });
    }
};
