<?php

declare(strict_types=1);

require_once __DIR__ . '/platform.php';

app_require_auth(true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    app_json_response(['error' => 'Upload endpoint accepts POST only.'], 405);
}

app_verify_csrf();

$category = (string) ($_POST['category'] ?? '');
if (!in_array($category, ['backgrounds', 'images'], true)) {
    app_json_response(['error' => 'Invalid upload category.'], 422);
}

if (!isset($_FILES['asset']) || !is_array($_FILES['asset'])) {
    app_json_response(['error' => 'No image file was uploaded.'], 422);
}

$file = $_FILES['asset'];
$error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
if ($error !== UPLOAD_ERR_OK) {
    app_json_response(['error' => 'Image upload failed.'], 422);
}

$tmpName = (string) ($file['tmp_name'] ?? '');
if ($tmpName === '' || !is_uploaded_file($tmpName)) {
    app_json_response(['error' => 'Uploaded file could not be verified.'], 422);
}

$maxBytes = 5 * 1024 * 1024;
$size = (int) ($file['size'] ?? 0);
if ($size <= 0 || $size > $maxBytes) {
    app_json_response(['error' => 'Image must be smaller than 5 MB.'], 422);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($tmpName);
$extensions = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];

if (!is_string($mime) || !isset($extensions[$mime])) {
    app_json_response(['error' => 'Only PNG, JPG, and WebP images are allowed.'], 422);
}

$originalName = pathinfo((string) ($file['name'] ?? 'asset'), PATHINFO_FILENAME);
$baseName = strtolower((string) preg_replace('/[^A-Za-z0-9_-]+/', '-', $originalName));
$baseName = trim($baseName, '-_');
if ($baseName === '') {
    $baseName = 'asset';
}

$fileName = sprintf('%s-%s.%s', $baseName, bin2hex(random_bytes(4)), $extensions[$mime]);
$root = dirname(__DIR__);
$uploadDir = $root . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . $category;

if (!is_dir($uploadDir) && !mkdir($uploadDir, 0750, true) && !is_dir($uploadDir)) {
    app_json_response(['error' => 'Upload directory could not be created.'], 500);
}

$targetPath = $uploadDir . DIRECTORY_SEPARATOR . $fileName;
if (!move_uploaded_file($tmpName, $targetPath)) {
    app_json_response(['error' => 'Uploaded image could not be saved.'], 500);
}

chmod($targetPath, 0640);

app_json_response([
    'path' => 'storage/uploads/' . $category . '/' . $fileName,
    'name' => $fileName,
    'size' => $size,
]);
