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
        \App\Models\Invoice::whereIn('status', ['cancelled', 'voided'])
            ->update(['is_archived' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No practical way to reverse this safely without affecting manually archived ones
    }
};
