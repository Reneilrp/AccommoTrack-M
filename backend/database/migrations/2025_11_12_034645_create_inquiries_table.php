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
        Schema::create('inquiries', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('property_id')->constrained('properties')->onDelete('cascade');
            $table->string('name');
            $table->string('email')->index('idx_email');
            $table->string('phone', 20)->nullable();
            $table->text('message');
            $table->enum('status', ['new', 'contacted', 'converted', 'closed'])->default('new')->index('idx_status');
            $table->string('source', 50)->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inquiries');
    }
};
