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
        Schema::table('addons', function (Blueprint $table) {
            $table->boolean('is_custom')->default(false)->after('is_active');
            $table->unsignedBigInteger('request_tenant_id')->nullable()->after('is_custom');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('addons', function (Blueprint $table) {
            $table->dropColumn(['is_custom', 'request_tenant_id']);
        });
    }
};
