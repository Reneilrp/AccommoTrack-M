<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('caretaker_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('caretaker_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('can_view_bookings')->default(true);
            $table->boolean('can_view_messages')->default(true);
            $table->boolean('can_view_tenants')->default(true);
            $table->timestamps();

            $table->unique('caretaker_id');
            $table->unique(['landlord_id', 'caretaker_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caretaker_assignments');
    }
};
