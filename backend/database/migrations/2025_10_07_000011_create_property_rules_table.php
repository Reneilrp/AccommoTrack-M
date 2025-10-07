<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->enum('rule_type', ['allowed', 'not_allowed', 'policy']);
            $table->text('rule_text');
            $table->timestamps();
            
            $table->index('property_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_rules');
    }
};