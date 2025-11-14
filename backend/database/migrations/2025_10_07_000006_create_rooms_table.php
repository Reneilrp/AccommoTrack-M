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
            $table->unsignedBigInteger('property_id')->index('idx_property');
            $table->string('room_number', 50);
            $table->enum('room_type', ['single', 'double', 'quad', 'bedSpacer']);
            $table->integer('floor');
            $table->decimal('monthly_rate', 10, 2);
            $table->integer('capacity')->default(1);
            $table->enum('status', ['available', 'occupied', 'maintenance'])->default('available')->index('idx_status');
            $table->unsignedBigInteger('current_tenant_id')->nullable()->index('current_tenant_id');
            $table->text('description')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->useCurrent();

            $table->unique(['property_id', 'room_number'], 'unique_room_per_property');
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
