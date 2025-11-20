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
            $table->foreignId('tenant_id')->references('id')->on('users')->onDelete('restrict');
            $table->foreignId('landlord_id')->references('id')->on('users')->onDelete('restrict');
            $table->string('booking_reference', 50)->unique();
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('total_months');
            $table->decimal('monthly_rent', 10, 2);
            $table->decimal('total_amount', 10, 2);
            
            // NEW: Refund tracking columns
            $table->decimal('refund_amount', 10, 2)->nullable();
            $table->timestamp('refund_processed_at')->nullable();
            
            // Updated status enum to include 'partial-completed'
            $table->enum('status', ['pending', 'confirmed', 'cancelled', 'completed', 'partial-completed'])->default('pending');
            $table->enum('payment_status', ['unpaid', 'partial', 'paid', 'refunded'])->default('unpaid');
            $table->text('notes')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();
            
            $table->index('tenant_id');
            $table->index('landlord_id');
            $table->index('room_id');
            $table->index('status');
            $table->index(['start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};