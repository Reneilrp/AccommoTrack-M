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
            $table->boolean('can_manage_maintenance')->default(false)->after('can_view_properties');
            $table->boolean('can_manage_payments')->default(false)->after('can_manage_maintenance');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('caretaker_assignments', function (Blueprint $table) {
            $table->dropColumn(['can_manage_maintenance', 'can_manage_payments']);
        });
    }
};
