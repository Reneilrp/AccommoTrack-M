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
            $table->foreignId('tenant_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('room_id')->nullable()->constrained('rooms')->onDelete('set null');
            $table->foreignId('booking_id')->nullable()->constrained('bookings')->onDelete('set null');
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
