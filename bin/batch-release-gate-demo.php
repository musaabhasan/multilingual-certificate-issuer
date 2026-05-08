<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Queue/BatchReleaseGate.php';

use CertificateIssuer\Queue\BatchReleaseGate;

$input = $argv[1] ?? __DIR__ . '/../examples/batch-release-readiness.json';
$payload = json_decode((string) file_get_contents($input), true, 512, JSON_THROW_ON_ERROR);

if (!is_array($payload)) {
    fwrite(STDERR, "Batch readiness input must be a JSON array.\n");
    exit(1);
}

$gate = new BatchReleaseGate();
$reports = [];

foreach ($payload as $batch) {
    if (!is_array($batch)) {
        fwrite(STDERR, "Each batch readiness record must be an object.\n");
        exit(1);
    }
    $reports[] = $gate->assess($batch);
}

echo json_encode($reports, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
