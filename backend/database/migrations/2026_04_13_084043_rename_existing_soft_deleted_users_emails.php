<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Get all soft-deleted users that haven't been renamed yet
        $deletedUsers = \App\Models\User::onlyTrashed()
            ->where('email', 'not like', '%.deleted.%')
            ->get();

        foreach ($deletedUsers as $user) {
            $originalEmail = $user->email;
            $user->email = $originalEmail.'.deleted.'.time();
            $user->save();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We don't necessarily want to revert this as it might cause unique constraint failures
        // if the original emails have since been taken by new registrations.
    }
};
