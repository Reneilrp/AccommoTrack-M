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
        Schema::create('messages', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('sender_id')->index('idx_sender');
            $table->unsignedBigInteger('receiver_id')->index('idx_receiver');
            $table->unsignedBigInteger('room_id')->nullable()->index('room_id');
            $table->text('message');
            $table->boolean('is_read')->nullable()->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->useCurrent();

            $table->index(['sender_id', 'receiver_id'], 'idx_conversation');
            $table->index(['receiver_id', 'is_read'], 'idx_unread');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
