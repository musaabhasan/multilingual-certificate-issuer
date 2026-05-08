<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Certificate/RecipientDataMinimizationAudit.php';

use CertificateIssuer\Certificate\RecipientDataMinimizationAudit;

$input = $argv[1] ?? __DIR__ . '/../examples/recipient-data-minimization-policy.json';
$payload = json_decode((string) file_get_contents($input), true, 512, JSON_THROW_ON_ERROR);

if (!is_array($payload)) {
    fwrite(STDERR, "Recipient data audit input must be a JSON array.\n");
    exit(1);
}

$auditor = new RecipientDataMinimizationAudit();
$reports = [];
$hasHighRisk = false;

foreach ($payload as $index => $record) {
    if (!is_array($record)) {
        fwrite(STDERR, "Each recipient data audit record must be an object.\n");
        exit(1);
    }

    $policy = isset($record['policy']) && is_array($record['policy']) ? $record['policy'] : [];
    $label = isset($record['label']) ? trim((string) $record['label']) : 'record-' . ((int) $index + 1);

    if (isset($record['csv_path']) && is_string($record['csv_path'])) {
        $path = $record['csv_path'];
        if (!str_starts_with($path, DIRECTORY_SEPARATOR) && !preg_match('/^[A-Za-z]:[\\\\\\/]/', $path)) {
            $path = dirname($input) . DIRECTORY_SEPARATOR . $path;
        }
        $report = $auditor->assessCsv($path, $policy);
    } elseif (isset($record['headers']) && is_array($record['headers'])) {
        $report = $auditor->assessHeaders(
            array_map(static fn (mixed $header): string => (string) $header, $record['headers']),
            $policy
        );
    } else {
        fwrite(STDERR, "Each audit record must define csv_path or headers.\n");
        exit(1);
    }

    $report['label'] = $label;
    $reports[] = $report;
    $hasHighRisk = $hasHighRisk || $report['passed'] === false;
}

echo json_encode($reports, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;

exit($hasHighRisk ? 1 : 0);
