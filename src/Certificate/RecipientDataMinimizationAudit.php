<?php

declare(strict_types=1);

namespace CertificateIssuer\Certificate;

use InvalidArgumentException;

final class RecipientDataMinimizationAudit
{
    private const REQUIRED_DEFAULT_FIELDS = ['unique_identifier', 'email', 'name_en', 'issue_date'];
    private const HIGH_RISK_PATTERNS = [
        'address',
        'birth',
        'biometric',
        'device',
        'government_id',
        'health',
        'home',
        'id_number',
        'medical',
        'national_id',
        'passport',
        'phone',
        'salary',
        'ssn',
    ];
    private const MODERATE_RISK_PATTERNS = [
        'age',
        'department',
        'employer',
        'gender',
        'grade',
        'ip',
        'job',
        'location',
        'nationality',
        'role',
    ];

    /**
     * @param list<string> $headers
     * @param array<string, mixed> $policy
     * @return array<string, mixed>
     */
    public function assessHeaders(array $headers, array $policy = []): array
    {
        $normalizedHeaders = $this->normalizeHeaders($headers);
        $allowedFields = $this->stringList($policy, 'allowed_fields');
        $requiredFields = $this->stringList($policy, 'required_fields') ?: self::REQUIRED_DEFAULT_FIELDS;
        $findings = [];

        if ($normalizedHeaders === []) {
            $this->addFinding(
                $findings,
                'missing_headers',
                'high',
                null,
                'Recipient data import does not declare any fields.',
                'Reject the upload and require an explicit header row.'
            );
        }

        foreach ($this->duplicates($normalizedHeaders) as $field) {
            $this->addFinding(
                $findings,
                'duplicate_field',
                'high',
                $field,
                'Recipient data contains a duplicate field name.',
                'Rename or remove duplicate columns before import.'
            );
        }

        foreach ($requiredFields as $field) {
            if (!in_array($field, $normalizedHeaders, true)) {
                $this->addFinding(
                    $findings,
                    'missing_required_field',
                    'high',
                    $field,
                    'A required certificate field is missing from the recipient data.',
                    'Add the field or update the approved template mapping before release.'
                );
            }
        }

        foreach ($normalizedHeaders as $field) {
            if ($field === '') {
                $this->addFinding(
                    $findings,
                    'empty_field',
                    'high',
                    null,
                    'Recipient data contains an empty field name.',
                    'Reject the upload until every column has a stable field name.'
                );
                continue;
            }

            $risk = $this->fieldRisk($field);
            if ($risk === 'high' && !$this->isAllowed($field, $allowedFields)) {
                $this->addFinding(
                    $findings,
                    'high_risk_field_not_approved',
                    'high',
                    $field,
                    'Recipient data includes a high-risk field that is not on the approved data list.',
                    'Remove the field or document a narrow certificate-delivery purpose and approval.'
                );
                continue;
            }

            if ($risk === 'moderate' && !$this->isAllowed($field, $allowedFields)) {
                $this->addFinding(
                    $findings,
                    'contextual_field_not_approved',
                    'medium',
                    $field,
                    'Recipient data includes a contextual field that is not on the approved data list.',
                    'Confirm that the field is needed for rendering, delivery, verification, or audit evidence.'
                );
                continue;
            }

            if ($allowedFields !== [] && !$this->isAllowed($field, $allowedFields)) {
                $this->addFinding(
                    $findings,
                    'field_outside_allowed_list',
                    'medium',
                    $field,
                    'Recipient data includes a field outside the approved data dictionary.',
                    'Update the approved data dictionary or remove the field from the import.'
                );
            }
        }

        $this->assessPolicy($policy, $findings);

        $summary = $this->summarize($findings);

        return [
            'passed' => $summary['high'] === 0,
            'risk_level' => $this->riskLevel($summary),
            'score' => $this->score($summary, count($normalizedHeaders)),
            'field_count' => count(array_filter($normalizedHeaders, static fn (string $field): bool => $field !== '')),
            'headers' => $normalizedHeaders,
            'summary' => $summary,
            'findings' => $findings,
        ];
    }

    /**
     * @param array<string, mixed> $policy
     * @return array<string, mixed>
     */
    public function assessCsv(string $path, array $policy = []): array
    {
        if (!is_file($path) || !is_readable($path)) {
            throw new InvalidArgumentException('CSV file could not be read for recipient data audit.');
        }

        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new InvalidArgumentException('CSV file could not be opened for recipient data audit.');
        }

        $headers = fgetcsv($handle);
        fclose($handle);

        if ($headers === false || $headers === [null]) {
            $headers = [];
        }

        return $this->assessHeaders(array_map(static fn (mixed $header): string => (string) $header, $headers), $policy);
    }

    /**
     * @param array<string, mixed> $policy
     * @param list<array<string, string|null>> $findings
     */
    private function assessPolicy(array $policy, array &$findings): void
    {
        if ($this->stringValue($policy, 'purpose') === '') {
            $this->addFinding(
                $findings,
                'missing_processing_purpose',
                'medium',
                null,
                'Recipient data policy does not state a certificate-processing purpose.',
                'Document the specific purpose, such as rendering certificates, delivery, verification, and audit evidence.'
            );
        }

        $retentionDays = $this->intValue($policy, 'retention_days');
        if ($retentionDays <= 0) {
            $this->addFinding(
                $findings,
                'missing_retention_period',
                'high',
                null,
                'Recipient data policy does not define a retention period.',
                'Set a retention period for raw CSV files, generated PDFs, queue records, and audit evidence.'
            );
        } elseif ($retentionDays > 730) {
            $this->addFinding(
                $findings,
                'long_retention_period',
                'medium',
                null,
                'Recipient data retention exceeds two years.',
                'Confirm the legal or institutional need, then document periodic review and deletion controls.'
            );
        }

        if ($this->stringValue($policy, 'access_role') === '') {
            $this->addFinding(
                $findings,
                'missing_access_role',
                'medium',
                null,
                'Recipient data policy does not define the lowest-privilege access role.',
                'Assign access to a specific operator, auditor, or administrator role.'
            );
        }

        if (!$this->boolValue($policy, 'encrypted_at_rest')) {
            $this->addFinding(
                $findings,
                'storage_encryption_not_confirmed',
                'high',
                null,
                'Recipient data storage encryption is not confirmed.',
                'Confirm database, backup, and private-object storage encryption before processing recipient data.'
            );
        }

        if ($this->boolValue($policy, 'external_sharing') && $this->stringValue($policy, 'sharing_agreement_ref') === '') {
            $this->addFinding(
                $findings,
                'external_sharing_without_agreement',
                'high',
                null,
                'Recipient data policy allows external sharing without an agreement reference.',
                'Add the data sharing agreement reference or disable external sharing for the batch.'
            );
        }

        if ($this->boolValue($policy, 'allow_raw_csv_download') && $this->stringValue($policy, 'download_approval_ref') === '') {
            $this->addFinding(
                $findings,
                'raw_csv_download_without_approval',
                'medium',
                null,
                'Raw CSV downloads are allowed without an approval reference.',
                'Require approval and audit logging for raw recipient CSV exports.'
            );
        }
    }

    /**
     * @param list<string> $headers
     * @return list<string>
     */
    private function normalizeHeaders(array $headers): array
    {
        return array_map(
            static fn (string $header): string => strtolower(trim(ltrim($header, "\xEF\xBB\xBF"))),
            $headers
        );
    }

    /**
     * @param list<string> $headers
     * @return list<string>
     */
    private function duplicates(array $headers): array
    {
        $counts = array_count_values(array_filter($headers, static fn (string $field): bool => $field !== ''));

        return array_values(array_filter(array_keys($counts), static fn (string $field): bool => $counts[$field] > 1));
    }

    /**
     * @param array<string, mixed> $policy
     * @return list<string>
     */
    private function stringList(array $policy, string $key): array
    {
        if (!isset($policy[$key]) || !is_array($policy[$key])) {
            return [];
        }

        return array_values(array_filter(
            array_map(static fn (mixed $value): string => strtolower(trim((string) $value)), $policy[$key]),
            static fn (string $value): bool => $value !== ''
        ));
    }

    /**
     * @param list<string> $allowedFields
     */
    private function isAllowed(string $field, array $allowedFields): bool
    {
        return $allowedFields === [] || in_array($field, $allowedFields, true);
    }

    private function fieldRisk(string $field): string
    {
        foreach (self::HIGH_RISK_PATTERNS as $pattern) {
            if (str_contains($field, $pattern)) {
                return 'high';
            }
        }

        foreach (self::MODERATE_RISK_PATTERNS as $pattern) {
            if (str_contains($field, $pattern)) {
                return 'moderate';
            }
        }

        return 'baseline';
    }

    /**
     * @param list<array<string, string|null>> $findings
     */
    private function addFinding(
        array &$findings,
        string $id,
        string $severity,
        ?string $field,
        string $message,
        string $recommendation
    ): void {
        $findings[] = [
            'id' => $id,
            'severity' => $severity,
            'field' => $field,
            'message' => $message,
            'recommendation' => $recommendation,
        ];
    }

    /**
     * @param list<array<string, string|null>> $findings
     * @return array{high: int, medium: int, low: int, total: int}
     */
    private function summarize(array $findings): array
    {
        $summary = ['high' => 0, 'medium' => 0, 'low' => 0, 'total' => count($findings)];
        foreach ($findings as $finding) {
            $severity = (string) ($finding['severity'] ?? 'low');
            if (isset($summary[$severity])) {
                $summary[$severity]++;
            }
        }

        return $summary;
    }

    /**
     * @param array{high: int, medium: int, low: int, total: int} $summary
     */
    private function riskLevel(array $summary): string
    {
        if ($summary['high'] > 0) {
            return 'high';
        }

        if ($summary['medium'] > 0) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * @param array{high: int, medium: int, low: int, total: int} $summary
     */
    private function score(array $summary, int $fieldCount): int
    {
        $penalty = ($summary['high'] * 20) + ($summary['medium'] * 8) + ($summary['low'] * 3);
        $fieldPenalty = max(0, $fieldCount - 8) * 2;

        return max(0, 100 - $penalty - $fieldPenalty);
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
}
