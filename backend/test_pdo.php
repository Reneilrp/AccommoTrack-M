<?php

// Direct PDO test
try {
    $dsn = 'mysql:host=127.0.0.1;port=3306;dbname=accommotrack_db;charset=utf8mb4';
    $user = 'pheinz_dev';
    $pass = 'AccommoTrackDevTeam5.';

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    echo 'Direct PDO Connection Successful!
';

    // Test a simple query
    $stmt = $pdo->query('SELECT id FROM bookings WHERE id = 38');
    $row = $stmt->fetch();
    if ($row) {
        echo 'Found Booking 38 via PDO
';
    } else {
        echo 'Booking 38 NOT found via PDO
';
    }

} catch (PDOException $e) {
    echo 'Direct PDO ERROR: '.$e->getMessage().'
';
}
