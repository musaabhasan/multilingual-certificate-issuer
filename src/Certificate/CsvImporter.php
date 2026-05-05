<?php

declare(strict_types=1);

namespace CertificateIssuer\Certificate;

use InvalidArgumentException;

final class CsvImporter
{
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

        $headers = array_map(static fn ($header) => trim((string) $header), $headers);
        $rows = [];

        while (($row = fgetcsv($handle)) !== false) {
            if ($row === [null]) {
                continue;
            }

            $record = [];
            foreach ($headers as $index => $header) {
                $record[$header] = isset($row[$index]) ? trim((string) $row[$index]) : '';
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
}
