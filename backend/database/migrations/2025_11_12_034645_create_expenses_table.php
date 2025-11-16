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
        Schema::create('expenses', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('property_id')->constrained('properties')->onDelete('cascade');
            $table->enum('category', ['maintenance', 'utilities', 'repairs', 'supplies', 'taxes', 'insurance', 'other'])->index('idx_category');
            $table->decimal('amount', 10);
            $table->text('description');
            $table->date('expense_date')->index('idx_date');
            $table->string('receipt_image')->nullable();
            $table->string('paid_to')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
