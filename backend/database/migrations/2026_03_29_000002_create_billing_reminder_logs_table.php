<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('billing_reminder_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('booking_id')->nullable()->constrained('bookings')->nullOnDelete();
            $table->foreignId('tenant_id')->constrained('users')->cascadeOnDelete();
            $table->string('reminder_type', 32);
            $table->date('target_date');
            $table->timestamp('sent_at');
            $table->timestamps();

            $table->unique(
                ['invoice_id', 'reminder_type', 'target_date'],
                'uniq_billing_reminder_invoice_type_date'
            );
            $table->index(['tenant_id', 'reminder_type'], 'idx_billing_reminder_tenant_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('billing_reminder_logs');
    }
};
