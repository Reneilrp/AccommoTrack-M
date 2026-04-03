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
        Schema::create('extension_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->onDelete('cascade');
            $table->foreignId('tenant_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('landlord_id')->constrained('users')->onDelete('cascade');
            $table->date('current_end_date');
            $table->date('requested_end_date');
            $table->enum('extension_type', ['monthly', 'daily']);
            $table->decimal('proposed_amount', 12, 2)->nullable();
            $table->text('tenant_notes')->nullable();
            $table->text('landlord_notes')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'modified'])->default('pending');
            $table->timestamp('handled_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('extension_requests');
    }
};
