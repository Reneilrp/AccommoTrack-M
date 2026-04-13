<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE inquiries MODIFY status ENUM('new', 'contacted', 'responded', 'converted', 'escalated', 'closed', 'archived') NOT NULL DEFAULT 'new'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("UPDATE inquiries SET status = 'closed' WHERE status IN ('escalated', 'archived')");
        DB::statement("ALTER TABLE inquiries MODIFY status ENUM('new', 'contacted', 'converted', 'closed', 'responded') NOT NULL DEFAULT 'new'");
    }
};
