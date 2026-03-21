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
        // 1. Expand Enum to temporarily allow new value 'rather_not_say'
        DB::statement("ALTER TABLE users MODIFY COLUMN gender ENUM('male', 'female', 'other', 'prefer_not_to_say', 'rather_not_say') NULL DEFAULT 'rather_not_say'");

        // 2. Map existing legacy enum values to 'rather_not_say'
        DB::table('users')
            ->whereIn('gender', ['other', 'prefer_not_to_say'])
            ->update(['gender' => 'rather_not_say']);

        // 3. Constrict enum column definition strictly to the valid new set
        DB::statement("ALTER TABLE users MODIFY COLUMN gender ENUM('male', 'female', 'rather_not_say') NULL");

        // 4. Add the 'identified_as' column if it does not exist
        if (! Schema::hasColumn('users', 'identified_as')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('identified_as', 50)->nullable()->after('gender');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Remove the column
        if (Schema::hasColumn('users', 'identified_as')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('identified_as');
            });
        }

        // 2. Revert enum definition (mapping rather_not_say back to prefer_not_to_say or just allowing all again)
        DB::statement("ALTER TABLE users MODIFY COLUMN gender ENUM('male', 'female', 'other', 'prefer_not_to_say', 'rather_not_say') NULL");

        DB::table('users')
            ->where('gender', 'rather_not_say')
            ->update(['gender' => 'prefer_not_to_say']);

        DB::statement("ALTER TABLE users MODIFY COLUMN gender ENUM('male', 'female', 'other', 'prefer_not_to_say') NULL");
    }
};
