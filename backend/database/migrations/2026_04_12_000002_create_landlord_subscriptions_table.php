<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landlord_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('subscription_plans')->restrictOnDelete();
            $table->string('source', 32)->default('system_default');
            $table->string('status', 32)->default('active');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->timestamp('grace_ends_at')->nullable();
            $table->boolean('auto_renew')->default(false);
            $table->foreignId('created_by_admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['landlord_id', 'status'], 'idx_landlord_subscriptions_landlord_status');
            $table->index(['starts_at', 'ends_at'], 'idx_landlord_subscriptions_window');
            $table->index(['source', 'status'], 'idx_landlord_subscriptions_source_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('landlord_subscriptions');
    }
};
