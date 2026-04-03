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
        Schema::table('landlord_verifications', function (Blueprint $table) {
            if (! Schema::hasColumn('landlord_verifications', 'valid_id_back_path')) {
                $table->string('valid_id_back_path')->nullable()->after('valid_id_path');
            }
        });

        Schema::table('landlord_verification_history', function (Blueprint $table) {
            if (! Schema::hasColumn('landlord_verification_history', 'valid_id_back_path')) {
                $table->string('valid_id_back_path')->nullable()->after('valid_id_path');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('landlord_verifications', function (Blueprint $table) {
            if (Schema::hasColumn('landlord_verifications', 'valid_id_back_path')) {
                $table->dropColumn('valid_id_back_path');
            }
        });

        Schema::table('landlord_verification_history', function (Blueprint $table) {
            if (Schema::hasColumn('landlord_verification_history', 'valid_id_back_path')) {
                $table->dropColumn('valid_id_back_path');
            }
        });
    }
};
