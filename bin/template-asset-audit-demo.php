<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Certificate/TemplateAssetIntegrityAudit.php';

use CertificateIssuer\Certificate\TemplateAssetIntegrityAudit;

$input = $argv[1] ?? __DIR__ . '/../examples/template-asset-manifest-sample.json';
$auditor = new TemplateAssetIntegrityAudit();
$report = $auditor->auditFile($input);

echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;

exit($report['passed'] ? 0 : 1);
