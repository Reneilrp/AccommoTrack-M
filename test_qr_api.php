<?php
$data = 'https://example.com/?sig=abc';
$url1 = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' . urlencode($data);
$url2 = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' . $data;

echo "URL1: $url1\n";
echo "URL2: $url2\n";
