<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Certificate/VerificationReceipt.php';

use CertificateIssuer\Certificate\VerificationReceipt;

$receiptBuilder = new VerificationReceipt();
$receipt = $receiptBuilder->build(
    [
        'status' => 'valid',
        'certificate_number' => 'CERT-2026-00042',
        'recipient_display_name' => 'Musaab Hasan',
        'template_name' => 'Professional Development Certificate',
        'rendered_at' => '2026-05-08T16:10:00Z',
        'pdf_sha256' => str_repeat('a', 64),
        'batch_reference' => 'PD-2026-05',
        'manifest_sha256' => str_repeat('b', 64),
        'request_reference' => 'verify-20260508-0001',
        'source_channel' => 'public-qr',
        'policy_decision' => 'metadata-released',
    ],
    new DateTimeImmutable('2026-05-08T16:30:00Z')
);

if (!$receiptBuilder->verify($receipt)) {
    fwrite(STDERR, "Verification receipt hash check failed.\n");
    exit(1);
}

echo json_encode($receipt, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
