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
        Schema::table('tenant_profiles', function (Blueprint $table) {
            // Change preference from string to json (or text if json not strictly supported, but json is standard in Laravel 10)
            $table->json('preference')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_profiles', function (Blueprint $table) {
            $table->string('preference')->nullable()->change();
        });
    }
};
