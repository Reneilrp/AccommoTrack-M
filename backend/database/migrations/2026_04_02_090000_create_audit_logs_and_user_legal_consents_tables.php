<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('domain', 40)->index();
            $table->string('event', 120)->index();
            $table->string('severity', 16)->default('info')->index();

            $table->unsignedBigInteger('actor_id')->nullable()->index();
            $table->string('actor_role', 32)->nullable()->index();

            $table->string('subject_type', 80)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();

            $table->unsignedBigInteger('booking_id')->nullable()->index();
            $table->unsignedBigInteger('invoice_id')->nullable()->index();
            $table->unsignedBigInteger('payment_transaction_id')->nullable()->index();
            $table->unsignedBigInteger('property_id')->nullable()->index();
            $table->unsignedBigInteger('tenant_id')->nullable()->index();
            $table->unsignedBigInteger('landlord_id')->nullable()->index();

            $table->string('status_before', 64)->nullable();
            $table->string('status_after', 64)->nullable();
            $table->text('summary')->nullable();
            $table->json('metadata')->nullable();

            $table->string('request_id', 100)->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->timestamps();

            $table->index(['subject_type', 'subject_id'], 'idx_audit_logs_subject');
        });

        Schema::create('user_legal_consents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('consent_type', 40)->default('signup')->index();
            $table->string('terms_version', 40)->nullable();
            $table->string('privacy_version', 40)->nullable();
            $table->string('platform', 20)->nullable()->index();
            $table->timestamp('consented_at')->useCurrent()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'consent_type'], 'idx_user_legal_consents_user_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_legal_consents');
        Schema::dropIfExists('audit_logs');
    }
};
