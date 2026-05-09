<?php

declare(strict_types=1);

namespace CertificateIssuer\Mail;

use RuntimeException;

final class DeliverySuppressionAudit
{
    /**
     * @return array<string, mixed>
     */
    public function auditFile(string $path): array
    {
        if (!is_file($path)) {
            throw new RuntimeException("Delivery suppression input file not found: {$path}");
        }

        $payload = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($payload)) {
            throw new RuntimeException('Delivery suppression input must be a JSON object.');
        }

        return $this->audit($payload);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function audit(array $payload): array
    {
        $policy = is_array($payload['suppression_policy'] ?? null) ? $payload['suppression_policy'] : [];
        $metrics = is_array($payload['delivery_metrics'] ?? null) ? $payload['delivery_metrics'] : [];
        $suppressions = is_array($payload['suppressions'] ?? null) ? $payload['suppressions'] : [];
        $queueItems = is_array($payload['queue_items'] ?? null) ? $payload['queue_items'] : [];

        $findings = [
            ...$this->auditPolicy($policy),
            ...$this->auditMetrics($metrics, $policy),
            ...$this->auditSuppressions($suppressions),
            ...$this->auditQueueItems($queueItems, $suppressions, $policy),
        ];

        $summary = $this->summary($findings, count($suppressions), count($queueItems));

        return [
            'passed' => $summary['high'] === 0,
            'batch_id' => $this->stringValue($payload, 'batch_id'),
            'release_status' => $this->stringValue($payload, 'release_status'),
            'summary' => $summary,
            'findings' => $findings,
            'release_questions' => [
                'Were hard bounces and complaints suppressed before new queue rows were created?',
                'Were manual holds respected for recipients or certificate batches under review?',
                'Did retry attempts stop before provider reputation or recipient trust was harmed?',
                'Can each suppression release be tied to an accountable approval record?',
                'Are delivery metrics below the configured hard-bounce and complaint thresholds?',
            ],
        ];
    }

    /**
     * @param array<string, mixed> $policy
     * @return list<array<string, mixed>>
     */
    private function auditPolicy(array $policy): array
    {
        $findings = [];

        foreach ([
            'hard_bounce_suppresses' => 'Hard-bounce events do not automatically suppress future sends.',
            'complaint_suppresses' => 'Complaint events do not automatically suppress future sends.',
            'manual_hold_blocks_delivery' => 'Manual holds do not block delivery queue release.',
            'suppression_checked_before_queueing' => 'Suppression checks are not required before queue creation.',
            'release_requires_approval' => 'Suppression release does not require accountable approval.',
        ] as $key => $message) {
            if (!$this->boolValue($policy, $key)) {
                $findings[] = $this->finding('high', $key . '_missing', 'suppression_policy', $message);
            }
        }

        $retryLimit = $this->intValue($policy, 'retry_limit');
        if ($retryLimit < 1 || $retryLimit > 5) {
            $findings[] = $this->finding('medium', 'retry_limit_out_of_range', 'suppression_policy.retry_limit', 'Retry limit should be between 1 and 5 attempts.');
        }

        $backoff = $this->intValue($policy, 'retry_backoff_minutes');
        if ($backoff < 15) {
            $findings[] = $this->finding('medium', 'retry_backoff_too_short', 'suppression_policy.retry_backoff_minutes', 'Retry backoff should avoid rapid repeated delivery attempts.');
        }

        if ($this->floatValue($policy, 'max_hard_bounce_rate') <= 0 || $this->floatValue($policy, 'max_hard_bounce_rate') > 0.05) {
            $findings[] = $this->finding('medium', 'hard_bounce_threshold_missing', 'suppression_policy.max_hard_bounce_rate', 'Hard-bounce threshold is missing or too permissive.');
        }

        if ($this->floatValue($policy, 'max_complaint_rate') <= 0 || $this->floatValue($policy, 'max_complaint_rate') > 0.005) {
            $findings[] = $this->finding('medium', 'complaint_threshold_missing', 'suppression_policy.max_complaint_rate', 'Complaint threshold is missing or too permissive.');
        }

        return $findings;
    }

    /**
     * @param array<string, mixed> $metrics
     * @param array<string, mixed> $policy
     * @return list<array<string, mixed>>
     */
    private function auditMetrics(array $metrics, array $policy): array
    {
        $findings = [];
        $total = max(0, $this->intValue($metrics, 'total_recipients'));
        $hardBounces = max(0, $this->intValue($metrics, 'hard_bounces'));
        $complaints = max(0, $this->intValue($metrics, 'complaints'));

        if ($total === 0) {
            return [
                $this->finding('medium', 'metrics_total_missing', 'delivery_metrics.total_recipients', 'Delivery metrics do not include recipient volume.'),
            ];
        }

        $hardBounceRate = $hardBounces / $total;
        $complaintRate = $complaints / $total;
        $maxHardBounceRate = $this->floatValue($policy, 'max_hard_bounce_rate') ?: 0.02;
        $maxComplaintRate = $this->floatValue($policy, 'max_complaint_rate') ?: 0.001;

        if ($hardBounceRate > $maxHardBounceRate) {
            $findings[] = $this->finding('high', 'hard_bounce_rate_exceeded', 'delivery_metrics.hard_bounces', 'Hard-bounce rate exceeds release threshold.');
        }

        if ($complaintRate > $maxComplaintRate) {
            $findings[] = $this->finding('high', 'complaint_rate_exceeded', 'delivery_metrics.complaints', 'Complaint rate exceeds release threshold.');
        }

        if ($this->intValue($metrics, 'failed_after_retries') > 0 && $this->intValue($metrics, 'suppressed_recipients') === 0) {
            $findings[] = $this->finding('medium', 'failed_without_suppression_review', 'delivery_metrics.failed_after_retries', 'Failed deliveries exist but no suppression review is recorded.');
        }

        return $findings;
    }

    /**
     * @param list<mixed> $suppressions
     * @return list<array<string, mixed>>
     */
    private function auditSuppressions(array $suppressions): array
    {
        $findings = [];

        foreach ($suppressions as $index => $entry) {
            if (!is_array($entry)) {
                $findings[] = $this->finding('high', 'invalid_suppression_entry', "suppressions[{$index}]", 'Suppression entry must be an object.');
                continue;
            }

            $target = $this->target($entry, "suppressions[{$index}]");
            $reason = strtolower($this->stringValue($entry, 'reason'));
            $active = $this->boolValue($entry, 'active');

            if ($this->stringValue($entry, 'email_hash') === '' || $this->stringValue($entry, 'email_mask') === '') {
                $findings[] = $this->finding('high', 'suppression_identity_gap', $target, 'Suppression entry is missing hashed or masked recipient identity.');
            }

            if (!in_array($reason, ['hard_bounce', 'complaint', 'manual_hold', 'correction_hold', 'recipient_request'], true)) {
                $findings[] = $this->finding('medium', 'suppression_reason_unknown', $target, 'Suppression reason is missing or outside the approved reason set.');
            }

            if ($active && $this->stringValue($entry, 'created_at') === '') {
                $findings[] = $this->finding('medium', 'suppression_created_at_gap', $target, 'Active suppression is missing its creation timestamp.');
            }

            if ($active && in_array($reason, ['manual_hold', 'correction_hold'], true) && $this->stringValue($entry, 'approved_by') === '') {
                $findings[] = $this->finding('medium', 'manual_hold_approval_gap', $target, 'Manual or correction hold is missing approval evidence.');
            }

            if (!$active && ($this->stringValue($entry, 'released_at') === '' || $this->stringValue($entry, 'release_approved_by') === '')) {
                $findings[] = $this->finding('high', 'suppression_release_evidence_gap', $target, 'Released suppression lacks release timestamp or approval evidence.');
            }
        }

        return $findings;
    }

    /**
     * @param list<mixed> $queueItems
     * @param list<mixed> $suppressions
     * @param array<string, mixed> $policy
     * @return list<array<string, mixed>>
     */
    private function auditQueueItems(array $queueItems, array $suppressions, array $policy): array
    {
        $findings = [];
        $retryLimit = max(1, $this->intValue($policy, 'retry_limit'));
        $activeHashes = $this->activeSuppressionHashes($suppressions);

        foreach ($queueItems as $index => $item) {
            if (!is_array($item)) {
                $findings[] = $this->finding('high', 'invalid_queue_item', "queue_items[{$index}]", 'Queue item must be an object.');
                continue;
            }

            $target = $this->target($item, "queue_items[{$index}]");
            $status = strtolower($this->stringValue($item, 'status'));
            $emailHash = $this->stringValue($item, 'email_hash');
            $attempts = $this->intValue($item, 'attempts');

            if (in_array($status, ['pending', 'scheduled', 'processing'], true) && !$this->boolValue($item, 'suppression_checked')) {
                $findings[] = $this->finding('high', 'queue_without_suppression_check', $target, 'Deliverable queue item was created without suppression-check evidence.');
            }

            if (in_array($status, ['pending', 'scheduled', 'processing'], true) && $emailHash !== '' && in_array($emailHash, $activeHashes, true)) {
                $findings[] = $this->finding('high', 'suppressed_recipient_queued', $target, 'Recipient with active suppression is still queued for delivery.');
            }

            if ($attempts > $retryLimit && !in_array($status, ['failed', 'suppressed', 'cancelled'], true)) {
                $findings[] = $this->finding('high', 'retry_limit_exceeded', $target, 'Queue item exceeded retry limit without being failed, cancelled, or suppressed.');
            }

            if ($status === 'failed' && $this->stringValue($item, 'last_error') === '') {
                $findings[] = $this->finding('medium', 'failed_error_gap', $target, 'Failed queue item lacks delivery error evidence.');
            }

            if ($status === 'scheduled' && $this->stringValue($item, 'scheduled_at') === '') {
                $findings[] = $this->finding('medium', 'scheduled_at_gap', $target, 'Scheduled queue item is missing scheduled_at evidence.');
            }
        }

        return $findings;
    }

    /**
     * @param list<mixed> $suppressions
     * @return list<string>
     */
    private function activeSuppressionHashes(array $suppressions): array
    {
        $hashes = [];
        foreach ($suppressions as $entry) {
            if (!is_array($entry) || !$this->boolValue($entry, 'active')) {
                continue;
            }

            $hash = $this->stringValue($entry, 'email_hash');
            if ($hash !== '') {
                $hashes[] = $hash;
            }
        }

        return $hashes;
    }

    /**
     * @param list<array<string, mixed>> $findings
     * @return array<string, int>
     */
    private function summary(array $findings, int $suppressionCount, int $queueItemCount): array
    {
        $summary = [
            'suppressions' => $suppressionCount,
            'queue_items' => $queueItemCount,
            'high' => 0,
            'medium' => 0,
            'low' => 0,
        ];

        foreach ($findings as $finding) {
            $severity = is_string($finding['severity'] ?? null) ? $finding['severity'] : 'low';
            if (array_key_exists($severity, $summary)) {
                $summary[$severity]++;
            }
        }

        return $summary;
    }

    /**
     * @return array<string, mixed>
     */
    private function finding(string $severity, string $state, string $target, string $message): array
    {
        return [
            'severity' => $severity,
            'state' => $state,
            'target' => $target,
            'message' => $message,
        ];
    }

    /**
     * @param array<string, mixed> $value
     */
    private function target(array $value, string $fallback): string
    {
        return $this->stringValue($value, 'recipient_id')
            ?: $this->stringValue($value, 'email_mask')
            ?: $this->stringValue($value, 'email_hash')
            ?: $fallback;
    }

    /**
     * @param array<string, mixed> $value
     */
    private function stringValue(array $value, string $key): string
    {
        $raw = $value[$key] ?? '';
        return is_scalar($raw) ? trim((string) $raw) : '';
    }

    /**
     * @param array<string, mixed> $value
     */
    private function boolValue(array $value, string $key): bool
    {
        return filter_var($value[$key] ?? false, FILTER_VALIDATE_BOOL);
    }

    /**
     * @param array<string, mixed> $value
     */
    private function intValue(array $value, string $key): int
    {
        $raw = $value[$key] ?? 0;
        return is_numeric($raw) ? (int) $raw : 0;
    }

    /**
     * @param array<string, mixed> $value
     */
    private function floatValue(array $value, string $key): float
    {
        $raw = $value[$key] ?? 0;
        return is_numeric($raw) ? (float) $raw : 0.0;
    }
}
