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
        Schema::create('booking_addons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->onDelete('cascade');
            $table->foreignId('addon_id')->constrained()->onDelete('cascade');
            $table->integer('quantity')->default(1);
            $table->decimal('price_at_booking', 10, 2); // Snapshot of price when requested
            $table->enum('status', [
                'pending',   // Tenant requested, awaiting landlord approval
                'approved',  // Landlord approved, will be added to next invoice
                'active',    // Currently active (for monthly recurring)
                'rejected',  // Landlord rejected the request
                'completed', // One-time addon has been invoiced/paid
                'cancelled'  // Tenant or landlord cancelled
            ])->default('pending');
            $table->text('request_note')->nullable(); // Tenant's note when requesting
            $table->text('response_note')->nullable(); // Landlord's note when approving/rejecting
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('invoiced_at')->nullable(); // When the addon was added to an invoice
            $table->foreignId('invoice_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->unique(['booking_id', 'addon_id'], 'booking_addon_unique');
            $table->index(['booking_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_addons');
    }
};
