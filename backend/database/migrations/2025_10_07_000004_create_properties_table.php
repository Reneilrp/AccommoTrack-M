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
        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_id')->constrained('users')->onDelete('cascade');
            
            // Basic Information
            $table->string('title'); 
            $table->text('description')->nullable();
            $table->enum('property_type', ['dormitory', 'apartment', 'boardingHouse', 'bedSpacer']);
            $table->enum('current_status', ['active', 'inactive', 'pending', 'maintenance'])->default('active');
            
            // Location Details
            $table->string('street_address');
            $table->string('city', 100);
            $table->string('province', 100);
            $table->string('postal_code', 20)->nullable();
            $table->string('country', 100)->default('Philippines');
            $table->string('barangay', 100)->nullable();
            
            // Property Coordinates
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->text('nearby_landmarks')->nullable();
            
            // Property Rules (added here instead of using ->after())
            $table->text('property_rules')->nullable();
            
            // Room Management
            $table->integer('total_rooms')->default(0);
            $table->integer('available_rooms')->default(0);
            
            // Status
            $table->boolean('is_published')->default(false);
            $table->boolean('is_available')->default(true);
            
            $table->timestamps();
            
            // Indexes
            $table->index('landlord_id');
            $table->index('city');
            $table->index('province');
            $table->index('current_status');
            $table->index('property_type');
            $table->index('is_published');
            $table->index('is_available');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};