<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('caretaker_assignments', function (Blueprint $table) {
            $table->boolean('can_approve_bookings')->default(false)->after('can_view_bookings');
            $table->boolean('can_cancel_bookings')->default(false)->after('can_approve_bookings');
            $table->boolean('can_view_audit_logs')->default(false)->after('can_manage_payments');
            $table->boolean('can_manage_add_ons')->default(false)->after('can_manage_maintenance');
        });
    }

    public function down(): void
    {
        Schema::table('caretaker_assignments', function (Blueprint $table) {
            $table->dropColumn(['can_approve_bookings', 'can_cancel_bookings', 'can_view_audit_logs', 'can_manage_add_ons']);
        });
    }
};
