<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Certificate/RecipientCollisionAudit.php';

use CertificateIssuer\Certificate\RecipientCollisionAudit;

$input = $argv[1] ?? __DIR__ . '/../examples/recipient-collision-sample.csv';
$uniqueFields = isset($argv[2])
    ? array_values(array_filter(array_map('trim', explode(',', $argv[2]))))
    : ['unique_identifier', 'certificate_number', 'email'];

$auditor = new RecipientCollisionAudit();
$report = $auditor->assessCsv($input, $uniqueFields);

echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;

exit($report['passed'] ? 0 : 1);
