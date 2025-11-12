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
        Schema::create('payments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('tenant_id')->index('idx_tenant');
            $table->unsignedBigInteger('room_id')->nullable()->index('room_id');
            $table->unsignedBigInteger('booking_id')->nullable()->index('booking_id');
            $table->decimal('amount', 10);
            $table->date('payment_date')->nullable();
            $table->date('due_date')->index('idx_due_date');
            $table->enum('status', ['paid', 'pending', 'overdue', 'cancelled'])->default('pending')->index('idx_status');
            $table->enum('payment_method', ['cash', 'bank_transfer', 'gcash', 'paymaya', 'card'])->nullable();
            $table->string('reference_number', 100)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
