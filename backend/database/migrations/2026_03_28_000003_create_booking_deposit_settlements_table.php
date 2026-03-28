<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_deposit_settlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->onDelete('cascade');
            $table->foreignId('settled_by')->nullable()->references('id')->on('users')->nullOnDelete();

            $table->decimal('starting_balance', 10, 2)->default(0);
            $table->decimal('damage_fee', 10, 2)->default(0);
            $table->decimal('cleaning_fee', 10, 2)->default(0);
            $table->decimal('other_fee', 10, 2)->default(0);
            $table->decimal('total_deductions', 10, 2)->default(0);
            $table->decimal('excess_charges', 10, 2)->default(0);

            $table->decimal('refund_due', 10, 2)->default(0);
            $table->decimal('refund_paid', 10, 2)->default(0);
            $table->decimal('ending_balance', 10, 2)->default(0);

            $table->boolean('mark_refunded')->default(false);
            $table->string('refund_method', 50)->nullable();
            $table->string('refund_reference', 100)->nullable();
            $table->text('note')->nullable();

            $table->timestamps();

            $table->index(['booking_id', 'created_at'], 'idx_booking_deposit_settlement_booking_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_deposit_settlements');
    }
};
