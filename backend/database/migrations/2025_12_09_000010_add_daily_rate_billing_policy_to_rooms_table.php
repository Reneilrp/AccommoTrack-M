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
            // Nullable daily rate for per-day pricing
            if (!Schema::hasColumn('rooms', 'daily_rate')) {
                $table->decimal('daily_rate', 10, 2)->nullable()->after('monthly_rate');
            }

            // Billing policy indicates how pricing is applied
            if (!Schema::hasColumn('rooms', 'billing_policy')) {
                $table->enum('billing_policy', ['monthly', 'monthly_with_daily', 'daily'])
                      ->default('monthly')
                      ->after('daily_rate');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            if (Schema::hasColumn('rooms', 'billing_policy')) {
                $table->dropColumn('billing_policy');
            }
            if (Schema::hasColumn('rooms', 'daily_rate')) {
                $table->dropColumn('daily_rate');
            }
        });
    }
};
