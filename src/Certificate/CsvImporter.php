<?php

declare(strict_types=1);

namespace CertificateIssuer\Certificate;

use InvalidArgumentException;

final class CsvImporter
{
    public function __construct(
        private readonly ?UploadValidator $uploadValidator = null,
        private readonly int $maxRows = 10_000
    )
    {
    }

    /**
     * @return array<int, array<string, string>>
     */
    public function read(string $path): array
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new InvalidArgumentException('CSV file could not be opened.');
        }

        $headers = fgetcsv($handle);
        if ($headers === false || $headers === [null]) {
            fclose($handle);
            throw new InvalidArgumentException('CSV file must include a header row.');
        }

        $headers = array_map(static fn ($header): string => self::normalizeHeader((string) $header), $headers);
        $this->assertValidHeaders($headers);
        $rows = [];

        while (($row = fgetcsv($handle)) !== false) {
            if ($row === [null]) {
                continue;
            }

            if (count($rows) >= $this->maxRows) {
                fclose($handle);
                throw new InvalidArgumentException('CSV file exceeds the configured recipient row limit.');
            }

            $record = [];
            foreach ($headers as $index => $header) {
                $value = isset($row[$index]) ? trim((string) $row[$index]) : '';
                $record[$header] = $this->uploadValidator?->safeSpreadsheetCell($value) ?? $value;
            }
            $rows[] = $record;
        }

        fclose($handle);
        return $rows;
    }

    /**
     * @param array<int, array<string, string>> $rows
     * @return array<int, string>
     */
    public function validateRequiredColumns(array $rows, array $requiredColumns): array
    {
        if ($rows === []) {
            return ['CSV file does not contain recipient rows.'];
        }

        $available = array_keys($rows[0]);
        $missing = array_values(array_diff($requiredColumns, $available));

        return array_map(static fn (string $column): string => 'Missing required CSV column: ' . $column, $missing);
    }

    /**
     * @param array<int, string> $headers
     */
    private function assertValidHeaders(array $headers): void
    {
        if (in_array('', $headers, true)) {
            throw new InvalidArgumentException('CSV header row must not contain empty columns.');
        }

        $duplicates = array_keys(array_filter(array_count_values($headers), static fn (int $count): bool => $count > 1));
        if ($duplicates !== []) {
            throw new InvalidArgumentException('CSV header row contains duplicate columns: ' . implode(', ', $duplicates));
        }
    }

    private static function normalizeHeader(string $header): string
    {
        return trim(ltrim($header, "\xEF\xBB\xBF"));
    }
}
