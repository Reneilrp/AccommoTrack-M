<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('bookings', 'next_billing_date')) {
                $table->date('next_billing_date')->nullable()->after('payment_plan');
                $table->index(['status', 'payment_plan', 'next_billing_date'], 'idx_bookings_billing_queue');
            }

            if (! Schema::hasColumn('bookings', 'billing_day')) {
                $table->unsignedTinyInteger('billing_day')->nullable()->after('next_billing_date');
            }

            if (! Schema::hasColumn('bookings', 'deposit_balance')) {
                $table->decimal('deposit_balance', 10, 2)->default(0)->after('refund_processed_at');
            }

            if (! Schema::hasColumn('bookings', 'notice_given_at')) {
                $table->timestamp('notice_given_at')->nullable()->after('confirmed_at');
            }
        });

        $driver = Schema::getConnection()->getDriverName();

        try {
            Schema::table('bookings', function (Blueprint $table) {
                $table->date('end_date')->nullable()->change();
            });
        } catch (\Throwable $e) {
            if ($driver === 'mysql') {
                DB::statement('ALTER TABLE bookings MODIFY end_date DATE NULL');
            } else {
                throw $e;
            }
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        DB::table('bookings')->whereNull('end_date')->update([
            'end_date' => DB::raw('start_date'),
        ]);

        try {
            Schema::table('bookings', function (Blueprint $table) {
                $table->date('end_date')->nullable(false)->change();
            });
        } catch (\Throwable $e) {
            if ($driver === 'mysql') {
                DB::statement('ALTER TABLE bookings MODIFY end_date DATE NOT NULL');
            } else {
                throw $e;
            }
        }

        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'notice_given_at')) {
                $table->dropColumn('notice_given_at');
            }

            if (Schema::hasColumn('bookings', 'deposit_balance')) {
                $table->dropColumn('deposit_balance');
            }

            if (Schema::hasColumn('bookings', 'billing_day')) {
                $table->dropColumn('billing_day');
            }

            if (Schema::hasColumn('bookings', 'next_billing_date')) {
                $table->dropIndex('idx_bookings_billing_queue');
                $table->dropColumn('next_billing_date');
            }
        });
    }
};
