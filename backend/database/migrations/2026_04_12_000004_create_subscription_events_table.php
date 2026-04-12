<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_subscription_id')->nullable()->constrained('landlord_subscriptions')->nullOnDelete();
            $table->foreignId('subscription_grant_id')->nullable()->constrained('subscription_grants')->nullOnDelete();
            $table->foreignId('landlord_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event', 64);
            $table->string('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['landlord_id', 'event', 'created_at'], 'idx_subscription_events_landlord_event_created');
            $table->index('landlord_subscription_id', 'idx_subscription_events_subscription');
            $table->index('subscription_grant_id', 'idx_subscription_events_grant');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_events');
    }
};
