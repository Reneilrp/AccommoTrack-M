<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->unique()
                  ->constrained('users')
                  ->onDelete('cascade');

            // TENANT-SPECIFIC ONLY
            $table->date('move_in_date')->nullable();
            $table->date('move_out_date')->nullable();
            $table->enum('status', ['active', 'inactive', 'evicted'])->default('active');
            $table->text('notes')->nullable();

            // EMERGENCY & PERSONAL
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone', 20)->nullable();
            $table->string('emergency_contact_relationship', 100)->nullable();
            $table->text('current_address')->nullable();

            // PREFERENCES & BEHAVIOR 
            $table->string('preference')->nullable();
            $table->date('date_of_birth')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_profiles');
    }
};