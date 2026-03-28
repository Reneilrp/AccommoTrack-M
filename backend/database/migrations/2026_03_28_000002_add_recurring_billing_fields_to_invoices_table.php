<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('invoices', 'invoice_type')) {
                $table->string('invoice_type', 32)->default('rent')->after('description');
                $table->index('invoice_type', 'idx_invoices_invoice_type');
            }

            if (! Schema::hasColumn('invoices', 'billing_period_start')) {
                $table->date('billing_period_start')->nullable()->after('due_date');
            }

            if (! Schema::hasColumn('invoices', 'billing_period_end')) {
                $table->date('billing_period_end')->nullable()->after('billing_period_start');
            }

            if (! Schema::hasColumn('invoices', 'billing_period_key')) {
                $table->string('billing_period_key', 20)->nullable()->after('billing_period_end');
            }

            $table->unique(
                ['booking_id', 'invoice_type', 'billing_period_key'],
                'uniq_invoices_booking_type_period'
            );
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique('uniq_invoices_booking_type_period');

            if (Schema::hasColumn('invoices', 'billing_period_key')) {
                $table->dropColumn('billing_period_key');
            }

            if (Schema::hasColumn('invoices', 'billing_period_end')) {
                $table->dropColumn('billing_period_end');
            }

            if (Schema::hasColumn('invoices', 'billing_period_start')) {
                $table->dropColumn('billing_period_start');
            }

            if (Schema::hasColumn('invoices', 'invoice_type')) {
                $table->dropIndex('idx_invoices_invoice_type');
                $table->dropColumn('invoice_type');
            }
        });
    }
};
