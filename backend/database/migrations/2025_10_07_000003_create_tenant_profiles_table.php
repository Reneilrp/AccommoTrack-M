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
        Schema::create('tenant_profiles', function (Blueprint $table) {
            $table->id();
            
            // One-to-one with users table (each tenant has exactly one profile)
            $table->foreignId('user_id')
                  ->unique()
                  ->constrained('users')
                  ->onDelete('cascade');

            // Core tenancy information
            $table->date('move_in_date')->nullable();
            $table->date('move_out_date')->nullable();
            
            // Status: active = currently living, inactive = moved out, evicted = forced out
            $table->enum('status', ['active', 'inactive', 'evicted'])
                  ->default('inactive'); // safer default — only activate on booking confirm

            // // Optional link back to the booking that started this tenancy
            // $table->foreignId('booking_id')
            //       ->nullable()
            //       ->constrained('bookings')
            //       ->onDelete('set null');
            $table->unsignedBigInteger('booking_id')->nullable();

            // Landlord notes about the tenant
            $table->text('notes')->nullable();

            // Emergency contact
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone', 20)->nullable();
            $table->string('emergency_contact_relationship', 100)->nullable();

            // Current address (outside the property, e.g. hometown)
            $table->text('current_address')->nullable();

            // Tenant preferences / behavior notes
            $table->string('preference')->nullable();
            
            // Personal info
            $table->date('date_of_birth')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenant_profiles');
    }
};