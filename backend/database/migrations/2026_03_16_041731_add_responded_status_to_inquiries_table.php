<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE inquiries MODIFY COLUMN status ENUM('new', 'contacted', 'converted', 'closed', 'responded') DEFAULT 'new'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE inquiries MODIFY COLUMN status ENUM('new', 'contacted', 'converted', 'closed') DEFAULT 'new'");
    }
};
