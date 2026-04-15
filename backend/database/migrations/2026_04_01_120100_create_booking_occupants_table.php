<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_occupants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->string('full_name');
            $table->date('date_of_birth')->nullable();
            $table->string('sex', 32)->nullable();
            $table->string('relationship_to_booker', 64)->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('email')->nullable();
            $table->timestamp('move_in_verified_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('booking_id');
            $table->index('relationship_to_booker');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_occupants');
    }
};
