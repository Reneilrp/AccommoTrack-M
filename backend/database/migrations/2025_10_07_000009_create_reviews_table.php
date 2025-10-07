<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->foreignId('booking_id')->constrained()->onDelete('cascade');
            $table->foreignId('tenant_id')->references('id')->on('users')->onDelete('cascade');
            $table->integer('rating');
            $table->integer('cleanliness_rating')->nullable();
            $table->integer('location_rating')->nullable();
            $table->integer('value_rating')->nullable();
            $table->integer('communication_rating')->nullable();
            $table->text('comment')->nullable();
            $table->boolean('is_published')->default(true);
            $table->text('landlord_response')->nullable();
            $table->timestamp('landlord_response_date')->nullable();
            $table->timestamps();
            
            $table->unique('booking_id');
            $table->index('property_id');
            $table->index('rating');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};