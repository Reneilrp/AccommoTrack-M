<?php
$verificationUrl = "https://accommotrack.me/verify-receipt/RCPT-123?sig=a6adbf06cbe12e157c1ec64b7c75d4cc4be88a567cbec942114af2bb2fbe108d";
echo "urlencode: " . urlencode($verificationUrl) . "\n";
echo "rawurlencode: " . rawurlencode($verificationUrl) . "\n";
