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
            $table->boolean('can_view_rooms')->default(false)->after('can_view_tenants');
            $table->boolean('can_view_properties')->default(false)->after('can_view_rooms');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('caretaker_assignments', function (Blueprint $table) {
            $table->dropColumn(['can_view_rooms', 'can_view_properties']);
        });
    }
};
