<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_id')->constrained('users')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('property_type', ['apartment', 'house', 'room', 'studio', 'dormitory']);
            $table->text('address');
            $table->string('barangay', 100);
            $table->string('city', 100);
            $table->string('postal_code', 20)->nullable();
            $table->integer('total_rooms')->default(1);
            $table->integer('available_rooms')->default(1);
            $table->integer('max_occupants')->default(1);
            $table->decimal('price_per_month', 10, 2);
            $table->string('currency', 10)->default('PHP');
            $table->boolean('is_published')->default(false);
            $table->boolean('is_available')->default(true);
            $table->timestamps();
            
            $table->index('landlord_id');
            $table->index('city');
            $table->index('is_published');
            $table->index('is_available');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};