<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Mail/DeliverySuppressionAudit.php';

use CertificateIssuer\Mail\DeliverySuppressionAudit;

$input = $argv[1] ?? __DIR__ . '/../examples/delivery-suppression-sample.json';
$auditor = new DeliverySuppressionAudit();
$report = $auditor->auditFile($input);

echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;

exit($report['passed'] ? 0 : 1);
