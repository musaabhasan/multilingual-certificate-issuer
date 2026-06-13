<?php

declare(strict_types=1);

require_once __DIR__ . '/platform.php';

$checks = [
    'php_version' => version_compare(PHP_VERSION, '8.3.0', '>='),
    'vendor_autoload' => is_file(dirname(__DIR__) . '/vendor/autoload.php'),
    'storage_app_writable' => is_writable(app_storage_path()),
    'storage_certificates_writable' => app_directory_writable(dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'certificates'),
    'storage_uploads_writable' => app_directory_writable(dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'uploads'),
    'extension_sodium' => extension_loaded('sodium'),
    'extension_fileinfo' => extension_loaded('fileinfo'),
    'extension_gd' => extension_loaded('gd'),
    'extension_intl' => extension_loaded('intl'),
    'extension_mbstring' => extension_loaded('mbstring'),
    'extension_zip' => extension_loaded('zip'),
    'admin_configured' => app_users_exist(),
];

$ok = !in_array(false, $checks, true);
app_json_response(['ok' => $ok, 'checks' => $checks], $ok ? 200 : 503);

function app_directory_writable(string $path): bool
{
    if (!is_dir($path) && !mkdir($path, 0750, true) && !is_dir($path)) {
        return false;
    }

    return is_writable($path);
}
