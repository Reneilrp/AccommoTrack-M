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
        Schema::create('tenant_evictions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('room_id')->nullable()->constrained('rooms')->nullOnDelete();
            $table->foreignId('booking_id')->nullable()->constrained('bookings')->nullOnDelete();
            $table->enum('status', ['scheduled', 'finalized', 'cancelled', 'reverted'])->default('scheduled');
            $table->text('reason');
            $table->timestamp('scheduled_for');
            $table->timestamp('finalized_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('reverted_at')->nullable();
            $table->foreignId('finalized_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reverted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('cancelled_reason')->nullable();
            $table->text('reverted_reason')->nullable();
            $table->timestamps();

            $table->index(['landlord_id', 'tenant_id']);
            $table->index(['status', 'scheduled_for']);
            $table->index(['room_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenant_evictions');
    }
};
