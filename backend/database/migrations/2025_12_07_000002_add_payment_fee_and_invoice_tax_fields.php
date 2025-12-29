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
        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->integer('gateway_fee_cents')->nullable()->after('amount_cents');
            $table->integer('net_amount_cents')->nullable()->after('gateway_fee_cents');
            $table->string('balance_transaction_id')->nullable()->after('gateway_reference');
            $table->string('provider_event_id')->nullable()->after('idempotency_key');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->integer('subtotal_cents')->nullable()->after('description');
            $table->integer('tax_cents')->nullable()->after('subtotal_cents');
            $table->integer('total_cents')->nullable()->after('tax_cents');
            $table->decimal('tax_percent', 5, 2)->nullable()->after('tax_cents');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->dropColumn(['gateway_fee_cents', 'net_amount_cents', 'balance_transaction_id', 'provider_event_id']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['subtotal_cents', 'tax_cents', 'total_cents', 'tax_percent']);
        });
    }
};
