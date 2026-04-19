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
            $table->boolean('can_record_payments')->default(false)->after('can_manage_payments');
            $table->boolean('can_void_payments')->default(false)->after('can_record_payments');
            $table->boolean('can_delete_tenants')->default(false)->after('can_add_tenant_manually');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('caretaker_assignments', function (Blueprint $table) {
            $table->dropColumn(['can_record_payments', 'can_void_payments', 'can_delete_tenants']);
        });
    }
};
