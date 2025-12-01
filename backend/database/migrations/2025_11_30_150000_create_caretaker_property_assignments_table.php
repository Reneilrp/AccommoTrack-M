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
        Schema::create('caretaker_property_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('caretaker_assignment_id')->constrained('caretaker_assignments')->cascadeOnDelete();
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['caretaker_assignment_id', 'property_id'], 'caretaker_property_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('caretaker_property_assignments');
    }
};
