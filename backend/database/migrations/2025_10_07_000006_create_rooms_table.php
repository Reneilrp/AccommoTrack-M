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
        Schema::create('rooms', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('property_id')->constrained('properties')->onDelete('cascade');
            $table->string('room_number', 50);
            $table->enum('room_type', ['single', 'double', 'quad', 'bedSpacer']);
            $table->integer('floor');
            $table->decimal('monthly_rate', 10, 2);
            // capacity first, then pricing_model (avoid using ->after() in CREATE TABLE)
            $table->integer('capacity')->default(1);
            $table->enum('pricing_model', ['full_room', 'per_bed'])->default('full_room');
            $table->enum('status', ['available', 'occupied', 'maintenance'])
                  ->default('available')
                  ->index('idx_status');

            // This is the correct way when you allow NULL (tenant can be null)
            $table->unsignedBigInteger('current_tenant_id')->nullable()->index();
            
            $table->text('description')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->useCurrent();

            $table->unique(['property_id', 'room_number'], 'unique_room_per_property');

            // Add the foreign key constraint with SET NULL on delete
            $table->foreign('current_tenant_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};