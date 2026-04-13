<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservation_disputes', function (Blueprint $table) {
            $table->enum('resolution', ['force_refund', 'release_to_landlord', 'dismissed'])->nullable()->after('admin_notes');
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete()->after('resolution');
            $table->timestamp('resolved_at')->nullable()->after('resolved_by');
        });
    }

    public function down(): void
    {
        Schema::table('reservation_disputes', function (Blueprint $table) {
            $table->dropForeign(['resolved_by']);
            $table->dropColumn(['resolution', 'resolved_by', 'resolved_at']);
        });
    }
};
