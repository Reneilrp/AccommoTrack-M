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
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('invoice_id')->nullable()->index();
            $table->unsignedBigInteger('tenant_id')->nullable()->index();
            $table->integer('amount_cents');
            $table->string('currency', 3)->default('PHP');
            $table->string('status'); // pending, succeeded, failed, refunded
            $table->string('method')->nullable(); // stripe, paypal, cash, bank_transfer
            $table->string('gateway_reference')->nullable()->index();
            $table->json('gateway_response')->nullable();
            $table->string('idempotency_key')->nullable()->index();
            $table->integer('refunded_amount_cents')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
    }
};
