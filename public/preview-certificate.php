<?php

declare(strict_types=1);

require_once __DIR__ . '/platform.php';

app_require_auth();

header('X-Frame-Options: SAMEORIGIN');
header("Content-Security-Policy: default-src 'self'; frame-ancestors 'self'; base-uri 'self'");

$file = trim((string) ($_GET['file'] ?? ''));
if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,190}\.pdf$/', $file)) {
    http_response_code(404);
    exit;
}

$previewRoot = app_storage_path('previews');
$absolutePath = $previewRoot . DIRECTORY_SEPARATOR . $file;
$resolvedRoot = realpath($previewRoot);
$resolvedFile = realpath($absolutePath);

if ($resolvedRoot === false || $resolvedFile === false || !str_starts_with($resolvedFile, $resolvedRoot . DIRECTORY_SEPARATOR) || !is_file($resolvedFile)) {
    http_response_code(404);
    exit;
}

header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="certificate-preview.pdf"');
header('Content-Length: ' . (string) filesize($resolvedFile));
header('Cache-Control: private, no-store');
readfile($resolvedFile);
