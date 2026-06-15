<?php

declare(strict_types=1);

require_once __DIR__ . '/platform.php';

app_require_auth();

$path = str_replace('\\', '/', trim((string) ($_GET['path'] ?? '')));
if (!preg_match('#^storage/uploads/(backgrounds|images)/[A-Za-z0-9._-]+\.(png|jpe?g|webp)$#i', $path)) {
    http_response_code(404);
    exit;
}

$absolutePath = dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $path);
$uploadsRoot = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'uploads';
$resolvedRoot = realpath($uploadsRoot);
$resolvedFile = realpath($absolutePath);

if ($resolvedRoot === false || $resolvedFile === false || !str_starts_with($resolvedFile, $resolvedRoot . DIRECTORY_SEPARATOR) || !is_file($resolvedFile)) {
    http_response_code(404);
    exit;
}

$mime = (new finfo(FILEINFO_MIME_TYPE))->file($resolvedFile);
$allowed = ['image/jpeg', 'image/png', 'image/webp'];
if (!is_string($mime) || !in_array($mime, $allowed, true)) {
    http_response_code(404);
    exit;
}

header('Content-Type: ' . $mime);
header('Content-Length: ' . (string) filesize($resolvedFile));
header('Cache-Control: private, max-age=3600');
readfile($resolvedFile);
