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
            $table->string('property_type');
            $table->enum('gender_restriction', ['male', 'female', 'mixed'])->default('mixed');
            $table->enum('current_status', ['active', 'inactive', 'pending', 'maintenance', 'draft'])->default('active');

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
            $table->integer('max_occupants')->default(1);
            $table->integer('number_of_bedrooms')->nullable();
            $table->integer('number_of_bathrooms')->nullable();
            $table->decimal('floor_area', 10, 2)->nullable();
            $table->string('floor_level')->nullable();
            $table->integer('total_floors')->default(1);

            // Property Rules (added here instead of using ->after())
            $table->text('property_rules')->nullable();
            $table->string('curfew_time')->nullable();
            $table->string('curfew_policy')->nullable();

            // Room Management
            $table->integer('total_rooms')->default(0);
            $table->integer('available_rooms')->default(0);

            // Status
            $table->boolean('is_published')->default(false);
            $table->boolean('is_available')->default(true);
            $table->boolean('is_eligible')->default(false);
            $table->json('accepted_payments')->nullable();
            $table->boolean('require_1month_advance')->default(false);
            $table->boolean('allow_partial_payments')->default(true);
            $table->boolean('require_reservation_fee')->default(false);
            $table->decimal('reservation_fee_amount', 10, 2)->default(0);

            $table->timestamps();

            // Indexes
            $table->index('landlord_id');
            $table->index('city');
            $table->index('province');
            $table->index('current_status');
            $table->index('property_type');
            $table->index('is_published');
            $table->index('is_available');
            $table->index('is_eligible');
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
