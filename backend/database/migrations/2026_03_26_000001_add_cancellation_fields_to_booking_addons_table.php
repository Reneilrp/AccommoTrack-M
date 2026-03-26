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
        Schema::table('booking_addons', function (Blueprint $table) {
            $table->timestamp('cancellation_requested_at')->nullable()->after('invoice_id');
            $table->timestamp('cancellation_effective_at')->nullable()->after('cancellation_requested_at');
            $table->index(['status', 'cancellation_effective_at'], 'booking_addons_status_cancel_effective_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking_addons', function (Blueprint $table) {
            $table->dropIndex('booking_addons_status_cancel_effective_idx');
            $table->dropColumn(['cancellation_requested_at', 'cancellation_effective_at']);
        });
    }
};
