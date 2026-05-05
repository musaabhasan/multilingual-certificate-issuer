<?php

declare(strict_types=1);

namespace CertificateIssuer\Certificate;

use RuntimeException;

final class UploadValidator
{
    private const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg'];
    private const CSV_MIME_TYPES = ['text/plain', 'text/csv', 'application/csv', 'application/vnd.ms-excel'];
    private const FORMULA_PREFIXES = ['=', '+', '-', '@'];

    public function __construct(
        private readonly int $maxImageBytes = 8_388_608,
        private readonly int $maxCsvBytes = 10_485_760
    ) {
    }

    public function assertBackgroundImage(string $path): void
    {
        $this->assertReadableFile($path);
        $this->assertMaxSize($path, $this->maxImageBytes, 'Background image');
        $mimeType = $this->mimeType($path);

        if (!in_array($mimeType, self::IMAGE_MIME_TYPES, true)) {
            throw new RuntimeException('Background must be a PNG or JPG image.');
        }
    }

    public function assertCsv(string $path): void
    {
        $this->assertReadableFile($path);
        $this->assertMaxSize($path, $this->maxCsvBytes, 'CSV file');
        $mimeType = $this->mimeType($path);

        if (!in_array($mimeType, self::CSV_MIME_TYPES, true)) {
            throw new RuntimeException('Recipient upload must be a CSV text file.');
        }
    }

    public function safeSpreadsheetCell(string $value): string
    {
        $trimmed = ltrim($value);
        if ($trimmed === '') {
            return $value;
        }

        foreach (self::FORMULA_PREFIXES as $prefix) {
            if (str_starts_with($trimmed, $prefix)) {
                return "'" . $value;
            }
        }

        return $value;
    }

    private function assertReadableFile(string $path): void
    {
        if (!is_file($path) || !is_readable($path)) {
            throw new RuntimeException('Uploaded file is not readable.');
        }
    }

    private function assertMaxSize(string $path, int $maxBytes, string $label): void
    {
        $size = filesize($path);
        if ($size === false || $size > $maxBytes) {
            throw new RuntimeException($label . ' exceeds the configured size limit.');
        }
    }

    private function mimeType(string $path): string
    {
        $info = finfo_open(FILEINFO_MIME_TYPE);
        if ($info === false) {
            throw new RuntimeException('Unable to initialize MIME type detection.');
        }

        $mimeType = finfo_file($info, $path);
        finfo_close($info);

        if ($mimeType === false) {
            throw new RuntimeException('Unable to determine upload MIME type.');
        }

        return $mimeType;
    }
}
