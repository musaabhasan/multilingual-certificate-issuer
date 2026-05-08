<?php

declare(strict_types=1);

namespace CertificateIssuer\Queue;

use DateTimeImmutable;
use Throwable;

final class BatchReleaseGate
{
    /**
     * @param array<string, mixed> $batch
     * @return array<string, mixed>
     */
    public function assess(array $batch, int $minimumThrottleSeconds = 60): array
    {
        $checks = [];

        $this->addCheck(
            $checks,
            'batch_reference_present',
            $this->stringValue($batch, 'batch_reference') !== '',
            'Batch reference is present.',
            'Add a stable batch reference before release.',
            $this->stringValue($batch, 'batch_reference')
        );

        $this->addCheck(
            $checks,
            'template_approved',
            $this->stringValue($batch, 'template_status') === 'approved',
            'Certificate template is approved.',
            'Approve the certificate template and version before sending.',
            $this->stringValue($batch, 'template_status')
        );

        $approval = $this->arrayValue($batch, 'approval');
        $this->addCheck(
            $checks,
            'batch_approved',
            $this->stringValue($approval, 'approved_by') !== '' && $this->validDate($approval['approved_at'] ?? null),
            'Batch approval is recorded.',
            'Record approver and approval timestamp before queue release.',
            trim($this->stringValue($approval, 'approved_by') . ' ' . $this->stringValue($approval, 'approved_at'))
        );

        $rowCount = $this->intValue($batch, 'row_count');
        $renderedCount = $this->intValue($batch, 'rendered_count');
        $queuedCount = $this->intValue($batch, 'queued_count');
        $this->addCheck(
            $checks,
            'rendered_count_matches_batch',
            $rowCount > 0 && $renderedCount === $rowCount,
            'Rendered certificate count matches recipient count.',
            'Render all certificates and resolve failed render jobs before release.',
            "{$renderedCount}/{$rowCount}"
        );
        $this->addCheck(
            $checks,
            'queued_count_matches_batch',
            $rowCount > 0 && $queuedCount === $rowCount,
            'Queued delivery count matches recipient count.',
            'Create one queued delivery row per approved recipient before release.',
            "{$queuedCount}/{$rowCount}"
        );

        $this->addCheck(
            $checks,
            'hash_manifest_verified',
            $this->boolValue($batch, 'pdf_hash_manifest_verified'),
            'PDF hash manifest is verified.',
            'Verify the batch hash manifest before sending certificate attachments.',
            $this->boolEvidence($batch, 'pdf_hash_manifest_verified')
        );

        $this->addCheck(
            $checks,
            'suppression_checked',
            $this->boolValue($batch, 'suppression_checked'),
            'Suppression list was checked before release.',
            'Check hashed suppression records before queue release.',
            $this->boolEvidence($batch, 'suppression_checked')
        );

        $smtp = $this->arrayValue($batch, 'smtp');
        $this->addCheck(
            $checks,
            'smtp_profile_active',
            $this->boolValue($smtp, 'active'),
            'SMTP profile is active.',
            'Use an approved active SMTP profile before release.',
            $this->boolEvidence($smtp, 'active')
        );
        $this->addCheck(
            $checks,
            'sender_domain_aligned',
            $this->boolValue($smtp, 'spf_aligned') && $this->boolValue($smtp, 'dkim_aligned') && $this->boolValue($smtp, 'dmarc_aligned'),
            'SPF, DKIM, and DMARC alignment are confirmed.',
            'Confirm sender-domain SPF, DKIM, and DMARC alignment before bulk delivery.',
            $this->domainEvidence($smtp)
        );

        $throttle = $this->intValue($batch, 'throttle_seconds');
        $this->addCheck(
            $checks,
            'throttle_respects_minimum',
            $throttle >= $minimumThrottleSeconds,
            'Queue throttle respects the minimum send interval.',
            "Set throttle_seconds to at least {$minimumThrottleSeconds}.",
            (string) $throttle
        );

        $this->addCheck(
            $checks,
            'schedule_valid',
            $this->validDate($batch['scheduled_at'] ?? null),
            'Scheduled release time is valid.',
            'Set scheduled_at to an ISO-8601 or database-compatible date/time.',
            $this->stringValue($batch, 'scheduled_at')
        );

        $this->addCheck(
            $checks,
            'certificate_delivery_mode_present',
            in_array($this->stringValue($batch, 'delivery_mode'), ['attachment', 'verification_link', 'attachment_and_link'], true),
            'Certificate delivery mode is explicit.',
            'Set delivery_mode to attachment, verification_link, or attachment_and_link.',
            $this->stringValue($batch, 'delivery_mode')
        );

        $failed = array_values(array_filter($checks, static fn (array $check): bool => $check['status'] === 'fail'));
        $warnings = array_values(array_filter($checks, static fn (array $check): bool => $check['status'] === 'warn'));

        return [
            'batch_reference' => $this->stringValue($batch, 'batch_reference'),
            'release_allowed' => $failed === [],
            'risk_level' => $failed !== [] ? 'high' : ($warnings !== [] ? 'medium' : 'low'),
            'failed_checks' => count($failed),
            'warning_checks' => count($warnings),
            'checks' => $checks,
        ];
    }

    /**
     * @param list<array<string, string>> $checks
     */
    private function addCheck(
        array &$checks,
        string $id,
        bool $passed,
        string $passMessage,
        string $failMessage,
        string $evidence,
        string $severity = 'fail'
    ): void {
        $checks[] = [
            'id' => $id,
            'status' => $passed ? 'pass' : $severity,
            'message' => $passed ? $passMessage : $failMessage,
            'evidence' => $evidence,
        ];
    }

    /**
     * @param array<string, mixed> $value
     * @return array<string, mixed>
     */
    private function arrayValue(array $value, string $key): array
    {
        return isset($value[$key]) && is_array($value[$key]) ? $value[$key] : [];
    }

    /**
     * @param array<string, mixed> $value
     */
    private function stringValue(array $value, string $key): string
    {
        return isset($value[$key]) ? trim((string) $value[$key]) : '';
    }

    /**
     * @param array<string, mixed> $value
     */
    private function intValue(array $value, string $key): int
    {
        return isset($value[$key]) && is_numeric($value[$key]) ? (int) $value[$key] : 0;
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
    private function boolEvidence(array $value, string $key): string
    {
        return $this->boolValue($value, $key) ? 'true' : 'false';
    }

    /**
     * @param array<string, mixed> $smtp
     */
    private function domainEvidence(array $smtp): string
    {
        return sprintf(
            'spf=%s; dkim=%s; dmarc=%s',
            $this->boolEvidence($smtp, 'spf_aligned'),
            $this->boolEvidence($smtp, 'dkim_aligned'),
            $this->boolEvidence($smtp, 'dmarc_aligned')
        );
    }

    private function validDate(mixed $value): bool
    {
        if (!is_string($value) || trim($value) === '') {
            return false;
        }

        try {
            new DateTimeImmutable($value);
            return true;
        } catch (Throwable) {
            return false;
        }
    }
}
