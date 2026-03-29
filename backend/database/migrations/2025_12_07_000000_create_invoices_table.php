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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->unsignedBigInteger('landlord_id')->index();
            $table->unsignedBigInteger('property_id')->nullable()->index();
            $table->unsignedBigInteger('booking_id')->nullable()->index();
            $table->unsignedBigInteger('tenant_id')->nullable()->index();
            $table->text('description')->nullable();
            $table->string('invoice_type', 32)->default('rent');
            $table->integer('subtotal_cents')->nullable();
            $table->integer('tax_cents')->nullable();
            $table->integer('total_cents')->nullable();
            $table->decimal('tax_percent', 5, 2)->nullable();
            $table->integer('amount_cents');
            $table->string('currency', 3)->default('PHP');
            $table->string('status')->default('pending');
            $table->date('due_date')->nullable();
            $table->date('billing_period_start')->nullable();
            $table->date('billing_period_end')->nullable();
            $table->string('billing_period_key', 20)->nullable();
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('invoice_type', 'idx_invoices_invoice_type');
            $table->unique(['booking_id', 'invoice_type', 'billing_period_key'], 'uniq_invoices_booking_type_period');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
