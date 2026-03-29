<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->onDelete('restrict');
            $table->foreignId('room_id')->constrained()->onDelete('restrict');
            $table->unsignedBigInteger('previous_booking_id')->nullable();
            $table->integer('bed_count')->default(1);
            $table->foreignId('tenant_id')->nullable()->constrained('users')->onDelete('restrict');
            $table->foreignId('landlord_id')->constrained('users')->onDelete('restrict');
            $table->string('guest_name')->nullable();
            $table->string('booking_reference', 50)->unique();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->integer('total_months');
            $table->decimal('monthly_rent', 10, 2);
            $table->decimal('total_amount', 10, 2);

            // NEW: Refund tracking columns
            $table->decimal('refund_amount', 10, 2)->nullable();
            $table->timestamp('refund_processed_at')->nullable();

            // Updated status enum to include 'partial-completed'
            $table->enum('status', ['pending', 'confirmed', 'cancelled', 'completed', 'partial-completed'])->default('pending');
            $table->enum('payment_status', ['unpaid', 'partial', 'paid', 'refunded'])->default('unpaid');
            $table->string('payment_method')->nullable();
            $table->string('payment_plan')->default('full');
            $table->string('contract_mode', 16)->nullable();
            $table->date('next_billing_date')->nullable();
            $table->unsignedTinyInteger('billing_day')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('notice_given_at')->nullable();
            $table->decimal('deposit_balance', 10, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();

            $table->index('previous_booking_id');
            $table->index('tenant_id');
            $table->index('landlord_id');
            $table->index('room_id');
            $table->index('status');
            $table->index(['start_date', 'end_date']);
            $table->index(['status', 'payment_plan', 'next_billing_date'], 'idx_bookings_billing_queue');
            $table->index(['payment_plan', 'contract_mode'], 'idx_bookings_payment_contract_mode');

            $table->foreign('previous_booking_id')->references('id')->on('bookings')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
