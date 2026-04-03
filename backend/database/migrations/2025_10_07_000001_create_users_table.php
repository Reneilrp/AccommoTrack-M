<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->enum('role', ['landlord', 'tenant', 'admin', 'caretaker']);
            $table->string('email')->unique();
            $table->string('password');
            $table->rememberToken();
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->enum('gender', ['male', 'female', 'rather_not_say'])->nullable();
            $table->string('identified_as', 50)->nullable();
            $table->string('phone', 20)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('profile_image')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->timestamp('email_verified_at')->nullable();
            $table->string('email_otp_code')->nullable();
            $table->timestamp('email_otp_expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_blocked')->default(false);
            $table->json('notification_preferences')->nullable();
            $table->json('preferences')->nullable();
            $table->json('payment_methods_settings')->nullable();
            $table->string('paymongo_child_id')->nullable();
            $table->string('paymongo_verification_status')->nullable()->default('pending');
            $table->timestamps();

            $table->index('role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
