<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/public/platform.php';

function assert_queue_merge(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function recipient_record(string $id, string $name, string $email, string $status = 'sent'): array
{
    return [
        'id' => $id,
        'sequence' => $id === 'recipient-1' ? 1 : 2,
        'identifier' => $id === 'recipient-1' ? 'CERT-2026-001' : 'CERT-2026-002',
        'email' => $email,
        'displayName' => $name,
        'status' => $status,
        'renderedAt' => '2026-06-15T05:00:00+00:00',
        'sentAt' => $status === 'sent' ? '2026-06-15T05:01:00+00:00' : '',
        'failedAt' => '',
        'failedReason' => '',
        'skippedAt' => '',
        'certificatePath' => $status === 'sent' ? 'storage/certificates/campaign/certificate.pdf' : '',
        'verificationTokenHash' => $status === 'sent' ? hash('sha256', $id) : '',
        'verificationIssuedAt' => $status === 'sent' ? '2026-06-15T05:00:30+00:00' : '',
        'verificationUrl' => $status === 'sent' ? 'http://127.0.0.1:8080/verify.php?certificate_number=' . rawurlencode($id) : '',
        'data' => [
            'unique_identifier' => $id === 'recipient-1' ? 'CERT-2026-001' : 'CERT-2026-002',
            'email' => $email,
            'name_en' => $name,
        ],
    ];
}

function queued_copy(array $recipient): array
{
    foreach (app_recipient_delivery_fields() as $field) {
        $recipient[$field] = $field === 'status' ? 'queued' : '';
    }

    return $recipient;
}

$current = [
    'templates' => [],
    'campaigns' => [
        [
            'id' => 'campaign-regression',
            'name' => 'Campaign Regression',
            'status' => 'completed',
            'recipients' => 2,
            'rendered' => 2,
            'sent' => 2,
            'failed' => 0,
            'skipped' => 0,
            'completedAt' => '2026-06-15T05:02:00+00:00',
            'deliveryEvents' => [
                ['at' => '2026-06-15T05:01:00+00:00', 'message' => 'Certificate sent by SMTP to aisha@example.test with certificate.pdf attached.'],
                ['at' => '2026-06-15T05:02:00+00:00', 'message' => 'Certificate sent by SMTP to omar@example.test with certificate.pdf attached.'],
            ],
            'recipientQueue' => [
                recipient_record('recipient-1', 'Aisha Al Mansoori', 'aisha@example.test'),
                recipient_record('recipient-2', 'Omar Al Hashimi', 'omar@example.test'),
            ],
        ],
    ],
];

$stale = $current;
$stale['campaigns'][0]['status'] = 'running';
$stale['campaigns'][0]['recipientQueue'][0] = queued_copy($stale['campaigns'][0]['recipientQueue'][0]);
$stale['campaigns'][0]['recipientQueue'][1] = queued_copy($stale['campaigns'][0]['recipientQueue'][1]);
$merged = app_merge_client_state($stale, $current);
assert_queue_merge($merged['campaigns'][0]['sent'] === 2, 'Stale client save regressed sent count.');
assert_queue_merge($merged['campaigns'][0]['status'] === 'completed', 'Stale client save regressed completed campaign status.');
assert_queue_merge($merged['campaigns'][0]['recipientQueue'][1]['status'] === 'sent', 'Stale client save regressed a sent recipient.');

$retry = $current;
$retry['campaigns'][0]['status'] = 'paused';
$retry['campaigns'][0]['recipientQueue'][0] = queued_copy($retry['campaigns'][0]['recipientQueue'][0]);
$retry['campaigns'][0]['deliveryEvents'][] = ['at' => '2026-06-15T05:03:00+00:00', 'message' => 'Queued Aisha Al Mansoori for resending.'];
$retryMerged = app_merge_client_state($retry, $current);
assert_queue_merge($retryMerged['campaigns'][0]['recipientQueue'][0]['status'] === 'queued', 'Explicit resend did not reset the selected recipient.');
assert_queue_merge($retryMerged['campaigns'][0]['recipientQueue'][1]['status'] === 'sent', 'Explicit resend reset the wrong recipient.');

$reset = $current;
$reset['campaigns'][0]['status'] = 'paused';
$reset['campaigns'][0]['recipientQueue'] = array_map('queued_copy', $reset['campaigns'][0]['recipientQueue']);
$reset['campaigns'][0]['deliveryEvents'][] = ['at' => '2026-06-15T05:04:00+00:00', 'message' => 'Campaign queue reset. Start the campaign when the schedule and speed are ready.'];
$resetMerged = app_merge_client_state($reset, $current);
assert_queue_merge($resetMerged['campaigns'][0]['sent'] === 0, 'Campaign reset did not clear sent count.');
assert_queue_merge($resetMerged['campaigns'][0]['recipientQueue'][1]['status'] === 'queued', 'Campaign reset did not clear the queue.');

echo "Queue state merge regression checks passed.\n";
