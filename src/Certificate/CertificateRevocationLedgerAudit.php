<?php

declare(strict_types=1);

namespace CertificateIssuer\Certificate;

use DateTimeImmutable;
use RuntimeException;
use Throwable;

final class CertificateRevocationLedgerAudit
{
    private const ACTIVE_STATUSES = ['rendered', 'valid'];
    private const KNOWN_STATUSES = ['pending', 'rendering', 'rendered', 'valid', 'failed', 'revoked'];

    /**
     * @return array<string, mixed>
     */
    public function auditFile(string $path): array
    {
        if (!is_file($path)) {
            throw new RuntimeException("Revocation ledger input file not found: {$path}");
        }

        $payload = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($payload)) {
            throw new RuntimeException('Revocation ledger input must be a JSON object.');
        }

        return $this->audit($payload);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function audit(array $payload): array
    {
        $certificates = $payload['certificates'] ?? [];
        if (!is_array($certificates)) {
            throw new RuntimeException('Revocation ledger input must include a certificates array.');
        }

        $findings = [];
        $numbers = $this->certificateNumberMap($certificates);

        foreach ($this->duplicateCertificateNumbers($numbers) as $number => $rows) {
            $findings[] = $this->finding(
                'high',
                'duplicate_certificate_number',
                $number,
                'Certificate number appears more than once in the revocation ledger.',
                ['rows' => $rows]
            );
        }

        foreach ($certificates as $index => $certificate) {
            if (!is_array($certificate)) {
                $findings[] = $this->finding('high', 'invalid_certificate_record', "certificates[{$index}]", 'Certificate record must be an object.');
                continue;
            }

            array_push($findings, ...$this->auditCertificate($certificate, $index, $numbers));
        }

        $summary = $this->summary($findings, count($certificates));

        return [
            'passed' => $summary['high'] === 0,
            'summary' => $summary,
            'findings' => $findings,
            'review_questions' => [
                'Can support staff explain why each revoked certificate was withdrawn without reading private CSV data?',
                'Does the ledger preserve the original PDF hash and manifest hash after revocation?',
                'Was the public verification token rotated or disabled according to policy?',
                'Does every corrected certificate link to the withdrawn certificate it replaces?',
                'Can audit reviewers reconstruct who approved the revocation and when the recipient was notified?',
            ],
        ];
    }

    /**
     * @param array<string, mixed> $certificate
     * @param array<string, list<int>> $numbers
     * @return list<array<string, mixed>>
     */
    private function auditCertificate(array $certificate, int $index, array $numbers): array
    {
        $target = $this->stringValue($certificate, 'certificate_number') ?: "certificates[{$index}]";
        $status = strtolower($this->stringValue($certificate, 'status'));
        $findings = [];

        if (!in_array($status, self::KNOWN_STATUSES, true)) {
            $findings[] = $this->finding('high', 'unknown_status', $target, 'Certificate status is not part of the approved status model.');
        }

        if (in_array($status, self::ACTIVE_STATUSES, true)) {
            foreach (['pdf_sha256', 'manifest_sha256'] as $field) {
                if ($this->stringValue($certificate, $field) === '') {
                    $findings[] = $this->finding('medium', $field . '_missing', $target, "Active certificate is missing {$field} evidence.");
                }
            }
        }

        if ($status !== 'revoked') {
            return $findings;
        }

        foreach (['revoked_at', 'revoked_by', 'revocation_reason'] as $field) {
            if ($this->stringValue($certificate, $field) === '') {
                $findings[] = $this->finding('high', $field . '_missing', $target, "Revoked certificate is missing {$field}.");
            }
        }

        foreach (['pdf_sha256', 'manifest_sha256', 'evidence_reference'] as $field) {
            if ($this->stringValue($certificate, $field) === '') {
                $findings[] = $this->finding('medium', $field . '_missing', $target, "Revoked certificate should preserve {$field}.");
            }
        }

        if (!$this->boolValue($certificate, 'token_rotated')) {
            $findings[] = $this->finding('medium', 'verification_token_not_rotated', $target, 'Verification token was not rotated or disabled after revocation.');
        }

        if (!$this->boolValue($certificate, 'recipient_notified')) {
            $findings[] = $this->finding('medium', 'recipient_notification_missing', $target, 'Recipient notification evidence is missing.');
        }

        $renderedAt = $this->dateValue($this->stringValue($certificate, 'rendered_at'));
        $revokedAt = $this->dateValue($this->stringValue($certificate, 'revoked_at'));
        if ($renderedAt !== null && $revokedAt !== null && $revokedAt < $renderedAt) {
            $findings[] = $this->finding('high', 'revoked_before_rendered', $target, 'Revocation timestamp is earlier than rendered timestamp.');
        }

        $replacement = $this->stringValue($certificate, 'replacement_certificate_number');
        if ($replacement !== '') {
            if ($replacement === $target) {
                $findings[] = $this->finding('high', 'replacement_self_reference', $target, 'Replacement certificate number points to the same certificate.');
            } elseif (!array_key_exists($replacement, $numbers)) {
                $findings[] = $this->finding('medium', 'replacement_missing_from_ledger', $target, 'Replacement certificate number is not present in the ledger.');
            }
        }

        $reason = strtolower($this->stringValue($certificate, 'revocation_reason'));
        if ($replacement === '' && preg_match('/(duplicate|incorrect|replacement|reissue|data error)/', $reason) === 1) {
            $findings[] = $this->finding('medium', 'replacement_reference_missing', $target, 'Revocation reason suggests a corrected certificate but no replacement is linked.');
        }

        return $findings;
    }

    /**
     * @param array<int, mixed> $certificates
     * @return array<string, list<int>>
     */
    private function certificateNumberMap(array $certificates): array
    {
        $numbers = [];
        foreach ($certificates as $index => $certificate) {
            if (!is_array($certificate)) {
                continue;
            }
            $number = $this->stringValue($certificate, 'certificate_number');
            if ($number === '') {
                continue;
            }
            $numbers[$number][] = $index + 1;
        }

        return $numbers;
    }

    /**
     * @param array<string, list<int>> $numbers
     * @return array<string, list<int>>
     */
    private function duplicateCertificateNumbers(array $numbers): array
    {
        return array_filter($numbers, static fn (array $rows): bool => count($rows) > 1);
    }

    /**
     * @param list<array<string, mixed>> $findings
     * @return array<string, int>
     */
    private function summary(array $findings, int $certificateCount): array
    {
        $summary = [
            'certificates' => $certificateCount,
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
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    private function finding(string $severity, string $state, string $target, string $message, array $extra = []): array
    {
        return [
            'severity' => $severity,
            'state' => $state,
            'target' => $target,
            'message' => $message,
        ] + $extra;
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

    private function dateValue(string $value): ?DateTimeImmutable
    {
        if ($value === '') {
            return null;
        }

        try {
            return new DateTimeImmutable($value);
        } catch (Throwable) {
            return null;
        }
    }
}
