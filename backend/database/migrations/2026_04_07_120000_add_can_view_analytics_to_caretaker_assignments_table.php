<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('caretaker_assignments', function (Blueprint $table) {
            if (! Schema::hasColumn('caretaker_assignments', 'can_view_analytics')) {
                $table->boolean('can_view_analytics')->default(false)->after('can_manage_payments');
            }
        });
    }

    public function down(): void
    {
        Schema::table('caretaker_assignments', function (Blueprint $table) {
            if (Schema::hasColumn('caretaker_assignments', 'can_view_analytics')) {
                $table->dropColumn('can_view_analytics');
            }
        });
    }
};
