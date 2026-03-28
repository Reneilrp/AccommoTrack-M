<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->decimal('credit_amount', 10, 2)->nullable()->after('landlord_notes');
            $table->json('credit_calculation')->nullable()->after('credit_amount');
        });
    }

    public function down(): void
    {
        Schema::table('transfer_requests', function (Blueprint $table) {
            $table->dropColumn(['credit_amount', 'credit_calculation']);
        });
    }
};
