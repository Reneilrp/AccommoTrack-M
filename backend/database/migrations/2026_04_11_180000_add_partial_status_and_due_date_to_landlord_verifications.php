<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('landlord_verifications', function (Blueprint $table) {
            if (! Schema::hasColumn('landlord_verifications', 'document_due_at')) {
                $table->timestamp('document_due_at')->nullable()->after('reviewed_by');
            }
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE landlord_verifications MODIFY status ENUM('pending', 'partial_verified', 'pending_documents_review', 'approved', 'rejected') NOT NULL DEFAULT 'pending'");
            DB::statement("ALTER TABLE landlord_verification_history MODIFY status ENUM('pending', 'partial_verified', 'pending_documents_review', 'approved', 'rejected') NOT NULL DEFAULT 'pending'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::table('landlord_verifications')
                ->whereIn('status', ['partial_verified', 'pending_documents_review'])
                ->update(['status' => 'pending']);

            DB::table('landlord_verification_history')
                ->whereIn('status', ['partial_verified', 'pending_documents_review'])
                ->update(['status' => 'pending']);

            DB::statement("ALTER TABLE landlord_verifications MODIFY status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending'");
            DB::statement("ALTER TABLE landlord_verification_history MODIFY status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending'");
        }

        Schema::table('landlord_verifications', function (Blueprint $table) {
            if (Schema::hasColumn('landlord_verifications', 'document_due_at')) {
                $table->dropColumn('document_due_at');
            }
        });
    }
};
