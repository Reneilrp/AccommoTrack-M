<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class NormalizeBillingPolicy extends Migration
{
    /**
     * Run the migrations.
     * Map old policy names to new ones:
     * - daily_only -> daily
     * - monthly_with_daily -> monthly_with_daily (unchanged)
     * - min_month -> monthly
     */
    public function up()
    {
        // Only run if the column exists
        if (!Schema::hasColumn('rooms', 'billing_policy')) {
            return;
        }

        DB::table('rooms')->where('billing_policy', 'daily_only')->update(['billing_policy' => 'daily']);
        DB::table('rooms')->where('billing_policy', 'min_month')->update(['billing_policy' => 'monthly']);
        // monthly_with_daily stays the same
    }

    /**
     * Reverse the migrations.
     * Map back to original values conservatively.
     */
    public function down()
    {
        if (!Schema::hasColumn('rooms', 'billing_policy')) {
            return;
        }

        DB::table('rooms')->where('billing_policy', 'daily')->update(['billing_policy' => 'daily_only']);
        // monthly_with_daily stays the same
    }
}
