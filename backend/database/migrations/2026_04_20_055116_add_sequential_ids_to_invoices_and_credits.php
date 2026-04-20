<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add columns
        Schema::table('invoices', function (Blueprint $blueprint) {
            $blueprint->unsignedBigInteger('invoice_number')->nullable()->after('id');
            $blueprint->index(['property_id', 'invoice_number']);
        });

        Schema::table('tenant_credits', function (Blueprint $blueprint) {
            $blueprint->unsignedBigInteger('invoice_id')->nullable()->after('room_id');
            $blueprint->foreign('invoice_id')->references('id')->on('invoices')->onDelete('set null');
        });

        // 2. Backfill existing invoices
        // We find each property, and for each property, we sort invoices by created_at then ID
        // and assign sequential numbers starting from 1.
        $propertyIds = DB::table('invoices')
            ->whereNotNull('property_id')
            ->distinct()
            ->pluck('property_id');

        foreach ($propertyIds as $propertyId) {
            $invoices = DB::table('invoices')
                ->where('property_id', $propertyId)
                ->orderBy('created_at', 'asc')
                ->orderBy('id', 'asc')
                ->get();

            $counter = 1;
            foreach ($invoices as $invoice) {
                DB::table('invoices')
                    ->where('id', $invoice->id)
                    ->update(['invoice_number' => $counter]);
                $counter++;
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_credits', function (Blueprint $blueprint) {
            $blueprint->dropForeign(['invoice_id']);
            $blueprint->dropColumn('invoice_id');
        });

        Schema::table('invoices', function (Blueprint $blueprint) {
            $blueprint->dropIndex(['property_id', 'invoice_number']);
            $blueprint->dropColumn('invoice_number');
        });
    }
};
