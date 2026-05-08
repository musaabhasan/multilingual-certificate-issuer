<?php

declare(strict_types=1);

namespace CertificateIssuer\Certificate;

use InvalidArgumentException;

final class RecipientCollisionAudit
{
    private const DEFAULT_UNIQUE_FIELDS = ['unique_identifier', 'certificate_number', 'email'];

    /**
     * @param list<array<string, string>> $rows
     * @param list<string> $uniqueFields
     * @return array<string, mixed>
     */
    public function assess(array $rows, array $uniqueFields = self::DEFAULT_UNIQUE_FIELDS): array
    {
        $findings = [];
        $normalizedUniqueFields = $this->normalizeFieldList($uniqueFields);

        if ($rows === []) {
            $this->addFinding(
                $findings,
                'empty_recipient_file',
                'high',
                null,
                [],
                'Recipient import does not contain any data rows.',
                'Reject the upload and require at least one approved recipient row.'
            );
        }

        $availableFields = $rows === [] ? [] : array_keys($rows[0]);
        foreach ($normalizedUniqueFields as $field) {
            if (!in_array($field, $availableFields, true)) {
                $severity = $field === 'certificate_number' ? 'low' : 'medium';
                $this->addFinding(
                    $findings,
                    'unique_field_not_present',
                    $severity,
                    $field,
                    [],
                    'A configured unique field is not present in the recipient data.',
                    'Confirm whether the field is optional for this template or update the collision policy.'
                );
            }
        }

        $this->assessDuplicateUniqueFields($rows, $normalizedUniqueFields, $findings);
        $this->assessEmailNameConflicts($rows, $findings);
        $this->assessNameDateAmbiguity($rows, $findings);

        $summary = $this->summarize($findings);

        return [
            'passed' => $summary['high'] === 0,
            'risk_level' => $this->riskLevel($summary),
            'score' => $this->score($summary, count($rows)),
            'row_count' => count($rows),
            'unique_fields' => $normalizedUniqueFields,
            'summary' => $summary,
            'findings' => $findings,
        ];
    }

    /**
     * @param list<string> $uniqueFields
     * @return array<string, mixed>
     */
    public function assessCsv(string $path, array $uniqueFields = self::DEFAULT_UNIQUE_FIELDS): array
    {
        return $this->assess($this->readCsv($path), $uniqueFields);
    }

    /**
     * @return list<array<string, string>>
     */
    private function readCsv(string $path): array
    {
        if (!is_file($path) || !is_readable($path)) {
            throw new InvalidArgumentException('CSV file could not be read for recipient collision audit.');
        }

        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new InvalidArgumentException('CSV file could not be opened for recipient collision audit.');
        }

        $headers = fgetcsv($handle);
        if ($headers === false || $headers === [null]) {
            fclose($handle);
            throw new InvalidArgumentException('CSV file must include a header row.');
        }

        $headers = array_map(
            static fn (mixed $header): string => strtolower(trim(ltrim((string) $header, "\xEF\xBB\xBF"))),
            $headers
        );

        $rows = [];
        while (($row = fgetcsv($handle)) !== false) {
            if ($row === [null]) {
                continue;
            }

            $record = [];
            foreach ($headers as $index => $header) {
                if ($header === '') {
                    continue;
                }
                $record[$header] = trim((string) ($row[$index] ?? ''));
            }
            $rows[] = $record;
        }

        fclose($handle);

        return $rows;
    }

    /**
     * @param list<array<string, string>> $rows
     * @param list<string> $uniqueFields
     * @param list<array<string, mixed>> $findings
     */
    private function assessDuplicateUniqueFields(array $rows, array $uniqueFields, array &$findings): void
    {
        foreach ($uniqueFields as $field) {
            $groups = [];
            foreach ($rows as $index => $row) {
                if (!array_key_exists($field, $row)) {
                    continue;
                }

                $value = $this->normalizeValue((string) $row[$field], $field);
                if ($value === '') {
                    $this->addFinding(
                        $findings,
                        'missing_unique_value',
                        $field === 'certificate_number' ? 'medium' : 'high',
                        $field,
                        [$index + 2],
                        'A recipient row has an empty value for a uniqueness field.',
                        'Resolve the missing value before rendering or queueing certificates.'
                    );
                    continue;
                }

                $groups[$value][] = $index + 2;
            }

            foreach ($groups as $value => $lineNumbers) {
                if (count($lineNumbers) < 2) {
                    continue;
                }

                $this->addFinding(
                    $findings,
                    'duplicate_unique_value',
                    'high',
                    $field,
                    $lineNumbers,
                    "Recipient data repeats {$field} value '{$value}'.",
                    'Keep one authoritative recipient row, correct the duplicate, or create a documented replacement batch.'
                );
            }
        }
    }

    /**
     * @param list<array<string, string>> $rows
     * @param list<array<string, mixed>> $findings
     */
    private function assessEmailNameConflicts(array $rows, array &$findings): void
    {
        $groups = [];
        foreach ($rows as $index => $row) {
            $email = $this->normalizeValue((string) ($row['email'] ?? ''), 'email');
            if ($email === '') {
                continue;
            }

            $groups[$email][] = [
                'line' => $index + 2,
                'name' => $this->normalizedRecipientName($row),
            ];
        }

        foreach ($groups as $email => $records) {
            $names = array_values(array_unique(array_filter(array_column($records, 'name'))));
            if (count($names) < 2) {
                continue;
            }

            $this->addFinding(
                $findings,
                'email_assigned_to_multiple_names',
                'high',
                'email',
                array_column($records, 'line'),
                "The same email address '{$email}' is assigned to multiple recipient names.",
                'Confirm whether this is an authorized shared mailbox; otherwise split or correct the recipient rows.'
            );
        }
    }

    /**
     * @param list<array<string, string>> $rows
     * @param list<array<string, mixed>> $findings
     */
    private function assessNameDateAmbiguity(array $rows, array &$findings): void
    {
        $groups = [];
        foreach ($rows as $index => $row) {
            $name = $this->normalizedRecipientName($row);
            $date = strtolower(trim((string) ($row['issue_date'] ?? '')));
            if ($name === '' || $date === '') {
                continue;
            }

            $identity = implode('|', array_filter([
                $this->normalizeValue((string) ($row['unique_identifier'] ?? ''), 'unique_identifier'),
                $this->normalizeValue((string) ($row['certificate_number'] ?? ''), 'certificate_number'),
                $this->normalizeValue((string) ($row['email'] ?? ''), 'email'),
            ]));

            $groups[$name . '|' . $date][] = [
                'line' => $index + 2,
                'identity' => $identity,
            ];
        }

        foreach ($groups as $key => $records) {
            if (count($records) < 2) {
                continue;
            }

            $identities = array_values(array_unique(array_filter(array_column($records, 'identity'))));
            if (count($identities) < 2) {
                continue;
            }

            [$name, $date] = explode('|', $key, 2);
            $this->addFinding(
                $findings,
                'same_name_date_multiple_identities',
                'medium',
                'name_en',
                array_column($records, 'line'),
                "Recipient name '{$name}' appears more than once for issue date '{$date}' with different identifiers.",
                'Review whether the rows represent separate people, duplicate awards, or a replacement certificate.'
            );
        }
    }

    /**
     * @param list<string> $fields
     * @return list<string>
     */
    private function normalizeFieldList(array $fields): array
    {
        $normalized = array_map(
            static fn (string $field): string => strtolower(trim($field)),
            $fields
        );

        return array_values(array_unique(array_filter($normalized, static fn (string $field): bool => $field !== '')));
    }

    /**
     * @param array<string, string> $row
     */
    private function normalizedRecipientName(array $row): string
    {
        $name = '';
        foreach (['name_en', 'name_ar', 'recipient_name'] as $field) {
            $candidate = trim((string) ($row[$field] ?? ''));
            if ($candidate !== '') {
                $name = $candidate;
                break;
            }
        }

        return $this->normalizeWhitespace(strtolower($name));
    }

    private function normalizeValue(string $value, string $field): string
    {
        $value = $this->normalizeWhitespace($value);
        if ($field === 'email') {
            return strtolower($value);
        }

        return strtolower($value);
    }

    private function normalizeWhitespace(string $value): string
    {
        return trim((string) preg_replace('/\s+/', ' ', $value));
    }

    /**
     * @param list<array<string, mixed>> $findings
     * @param list<int> $lineNumbers
     */
    private function addFinding(
        array &$findings,
        string $id,
        string $severity,
        ?string $field,
        array $lineNumbers,
        string $message,
        string $recommendation
    ): void {
        $findings[] = [
            'id' => $id,
            'severity' => $severity,
            'field' => $field,
            'line_numbers' => $lineNumbers,
            'message' => $message,
            'recommendation' => $recommendation,
        ];
    }

    /**
     * @param list<array<string, mixed>> $findings
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
    private function score(array $summary, int $rowCount): int
    {
        $penalty = ($summary['high'] * 25) + ($summary['medium'] * 10) + ($summary['low'] * 4);
        $volumePenalty = $rowCount > 5000 ? 5 : 0;

        return max(0, 100 - $penalty - $volumePenalty);
    }
}
