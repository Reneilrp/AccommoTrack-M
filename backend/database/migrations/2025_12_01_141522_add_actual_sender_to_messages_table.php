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
        Schema::table('messages', function (Blueprint $table) {
            // Track who actually sent the message (caretaker or landlord)
            // sender_id = the landlord (for conversation threading)
            // actual_sender_id = the person who actually typed the message
            $table->foreignId('actual_sender_id')->nullable()->after('sender_id')->constrained('users')->onDelete('set null');
            $table->string('sender_role', 20)->nullable()->after('actual_sender_id'); // 'landlord' or 'caretaker'
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropForeign(['actual_sender_id']);
            $table->dropColumn(['actual_sender_id', 'sender_role']);
        });
    }
};
