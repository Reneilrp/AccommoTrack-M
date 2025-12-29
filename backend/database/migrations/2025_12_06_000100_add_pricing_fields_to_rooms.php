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
        Schema::table('rooms', function (Blueprint $table) {
            $table->decimal('daily_rate', 10, 2)->nullable()->after('monthly_rate');
            $table->string('billing_policy')->default('monthly')->after('daily_rate');
            $table->integer('min_stay_days')->nullable()->after('billing_policy');
            $table->integer('prorate_base')->default(30)->after('min_stay_days');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropColumn(['daily_rate', 'billing_policy', 'min_stay_days', 'prorate_base']);
        });
    }
};
