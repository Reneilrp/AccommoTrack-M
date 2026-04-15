#!/bin/bash

echo "=========================================="
echo "Phase 1 Migration Status Verification"
echo "=========================================="
echo ""

echo "1. Checking migration status..."
php artisan migrate:status | grep -E "(apply_se_defense|Migration name)" || echo "Migration not found or already run"

echo ""
echo "2. Checking database schema..."
echo ""

echo "Checking 'users' table for 'sex' column:"
php artisan tinker --execute="
\$hasSex = Schema::hasColumn('users', 'sex');
\$hasGender = Schema::hasColumn('users', 'gender');
echo 'Has sex column: ' . (\$hasSex ? 'YES' : 'NO') . PHP_EOL;
echo 'Has gender column: ' . (\$hasGender ? 'YES (NOT MIGRATED)' : 'NO (MIGRATED)') . PHP_EOL;
\$count = \App\Models\User::whereNotNull('sex')->count();
echo 'Users with sex data: ' . \$count . PHP_EOL;
"

echo ""
echo "Checking 'rooms' table for 'sex_restriction' column:"
php artisan tinker --execute="
\$hasSex = Schema::hasColumn('rooms', 'sex_restriction');
\$hasGender = Schema::hasColumn('rooms', 'gender_restriction');
echo 'Has sex_restriction column: ' . (\$hasSex ? 'YES' : 'NO') . PHP_EOL;
echo 'Has gender_restriction column: ' . (\$hasGender ? 'YES (NOT MIGRATED)' : 'NO (MIGRATED)') . PHP_EOL;
\$count = \App\Models\Room::whereNotNull('sex_restriction')->count();
echo 'Rooms with sex_restriction data: ' . \$count . PHP_EOL;
"

echo ""
echo "Checking 'properties' table for 'sex_restriction' column:"
php artisan tinker --execute="
\$hasSex = Schema::hasColumn('properties', 'sex_restriction');
\$hasGender = Schema::hasColumn('properties', 'gender_restriction');
echo 'Has sex_restriction column: ' . (\$hasSex ? 'YES' : 'NO') . PHP_EOL;
echo 'Has gender_restriction column: ' . (\$hasGender ? 'YES (NOT MIGRATED)' : 'NO (MIGRATED)') . PHP_EOL;
\$count = \App\Models\Property::whereNotNull('sex_restriction')->count();
echo 'Properties with sex_restriction data: ' . \$count . PHP_EOL;
"

echo ""
echo "Checking 'booking_occupants' table for structured names:"
php artisan tinker --execute="
\$hasFirstName = Schema::hasColumn('booking_occupants', 'first_name');
\$hasLastName = Schema::hasColumn('booking_occupants', 'last_name');
\$hasFullName = Schema::hasColumn('booking_occupants', 'full_name');
\$hasSex = Schema::hasColumn('booking_occupants', 'sex');
echo 'Has first_name column: ' . (\$hasFirstName ? 'YES' : 'NO') . PHP_EOL;
echo 'Has last_name column: ' . (\$hasLastName ? 'YES' : 'NO') . PHP_EOL;
echo 'Has full_name column: ' . (\$hasFullName ? 'YES (NOT MIGRATED)' : 'NO (MIGRATED)') . PHP_EOL;
echo 'Has sex column: ' . (\$hasSex ? 'YES' : 'NO') . PHP_EOL;
\$count = \App\Models\BookingOccupant::whereNotNull('first_name')->count();
echo 'Occupants with first_name data: ' . \$count . PHP_EOL;
"

echo ""
echo "=========================================="
echo "Phase 1 Verification Complete"
echo "=========================================="
