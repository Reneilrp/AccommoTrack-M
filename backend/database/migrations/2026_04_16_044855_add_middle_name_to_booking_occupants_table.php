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
        Schema::table('booking_occupants', function (Blueprint $table) {
            if (! Schema::hasColumn('booking_occupants', 'middle_name')) {
                $table->string('middle_name', 100)->nullable()->after('first_name');
            }
            if (Schema::hasColumn('booking_occupants', 'full_name')) {
                $table->dropColumn('full_name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking_occupants', function (Blueprint $table) {
            $table->dropColumn('middle_name');
            $table->string('full_name')->after('booking_id');
        });
    }
};
