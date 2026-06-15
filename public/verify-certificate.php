<?php

declare(strict_types=1);

require_once __DIR__ . '/platform.php';

$certificateNumber = trim((string) ($_POST['certificate_number'] ?? $_GET['certificate_number'] ?? ''));
$token = trim((string) ($_POST['token'] ?? $_GET['token'] ?? ''));

try {
    $lookup = app_verify_certificate_lookup($certificateNumber, $token);
    if ($lookup === null) {
        app_json_response([
            'valid' => false,
            'status' => 'invalid',
            'error' => 'Certificate was not verified.',
        ], 404);
    }

    app_json_response([
        'valid' => (bool) ($lookup['valid'] ?? false),
        'status' => (string) ($lookup['status'] ?? 'invalid'),
        'certificate' => $lookup,
    ]);
} catch (Throwable $error) {
    app_json_response([
        'valid' => false,
        'status' => 'invalid',
        'error' => 'Verification request could not be processed.',
    ], 400);
}
