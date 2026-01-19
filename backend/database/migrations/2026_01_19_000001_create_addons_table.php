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
        Schema::create('addons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->string('name'); // e.g., "Rice Cooker", "Electric Fan", "Wi-Fi Upgrade"
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2); // Price in local currency
            $table->enum('price_type', ['one_time', 'monthly'])->default('monthly');
            // 'one_time' = charged once when approved (e.g., cleaning kit purchase)
            // 'monthly' = recurring charge added to rent invoice (e.g., appliance usage fee)
            $table->enum('addon_type', ['rental', 'fee'])->default('fee');
            // 'rental' = property provides the item (e.g., rice cooker for rent)
            // 'fee' = tenant brings own item but pays usage fee (e.g., electric appliance fee)
            $table->integer('stock')->nullable(); // For rentals: available quantity. NULL = unlimited
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['property_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('addons');
    }
};
