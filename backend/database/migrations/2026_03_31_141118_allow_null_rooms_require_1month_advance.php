<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Allow rooms.require_1month_advance to store NULL.
     * NULL = inherit from parent property (default behaviour).
     * true = explicitly required for this room (overrides property setting).
     * false = explicitly disabled for this room (overrides property setting).
     */
    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->boolean('require_1month_advance')->nullable()->default(null)->change();
        });
    }

    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            // Revert: set all NULL rows to false before removing nullable
            \Illuminate\Support\Facades\DB::table('rooms')
                ->whereNull('require_1month_advance')
                ->update(['require_1month_advance' => false]);

            $table->boolean('require_1month_advance')->nullable(false)->default(false)->change();
        });
    }
};
