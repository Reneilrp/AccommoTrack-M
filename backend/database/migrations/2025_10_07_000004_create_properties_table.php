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
            
            // Basic Information
            $table->string('title'); 
            $table->text('description')->nullable();
            $table->enum('property_type', ['apartment', 'house', 'room', 'studio', 'dormitory', 'condo', 'boarding_house']);
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
            
            // Property Specifications
            $table->integer('number_of_bedrooms')->nullable();
            $table->integer('number_of_bathrooms')->nullable();
            $table->decimal('floor_area', 8, 2)->nullable();
            $table->integer('parking_spaces')->nullable();
            $table->string('floor_level', 50)->nullable();
            $table->integer('max_occupants')->default(1);
            
            // Room Management
            $table->integer('total_rooms')->default(1);
            $table->integer('available_rooms')->default(1);
            
            // Rental Information
            $table->decimal('price_per_month', 10, 2);
            $table->decimal('security_deposit', 10, 2)->nullable();
            $table->string('currency', 10)->default('PHP');
            $table->enum('utilities_included', ['all', 'partial', 'none'])->default('none');
            $table->enum('minimum_lease_term', ['daily', 'weekly', 'monthly', '3_months', '6_months', '1_year'])->nullable();
            
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

    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};