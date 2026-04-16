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
        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('cart_id')->index();
            $table->unsignedBigInteger('room_id')->index();
            $table->integer('bed_count')->default(1);
            $table->string('bed_numbers')->nullable()->comment('Comma-separated bed numbers');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->enum('contract_mode', ['daily', 'monthly'])->default('monthly');
            $table->enum('payment_plan', ['full', 'monthly', 'promo_one_time'])->default('monthly');
            $table->decimal('price_snapshot', 10, 2)->comment('Price at time of adding to cart');
            $table->json('occupants')->nullable()->comment('Proxy booking occupants');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('cart_id')->references('id')->on('carts')->onDelete('cascade');
            $table->foreign('room_id')->references('id')->on('rooms')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cart_items');
    }
};
