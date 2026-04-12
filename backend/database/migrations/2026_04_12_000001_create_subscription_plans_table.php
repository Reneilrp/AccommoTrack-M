<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->unsignedInteger('monthly_price_cents')->default(0);
            $table->unsignedInteger('annual_price_cents')->nullable();
            $table->string('currency', 3)->default('PHP');
            $table->unsignedInteger('max_properties')->default(1);
            $table->unsignedInteger('max_rooms_total')->default(10);
            $table->json('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'sort_order'], 'idx_subscription_plans_active_sort');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
