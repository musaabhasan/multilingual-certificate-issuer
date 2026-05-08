<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Certificate/CertificateRevocationLedgerAudit.php';

use CertificateIssuer\Certificate\CertificateRevocationLedgerAudit;

$input = $argv[1] ?? __DIR__ . '/../examples/revocation-ledger-sample.json';
$auditor = new CertificateRevocationLedgerAudit();
$report = $auditor->auditFile($input);

echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;

exit($report['passed'] ? 0 : 1);
