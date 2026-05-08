<?php

declare(strict_types=1);

namespace CertificateIssuer\Certificate;

use DateTimeImmutable;
use InvalidArgumentException;
use JsonException;
use RuntimeException;

final class CertificateHashManifest
{
    /**
     * @param list<array{
     *     certificate_number:string,
     *     recipient_identifier:string,
     *     pdf_path:string,
     *     pdf_sha256?:string|null,
     *     rendered_at?:string|null
     * }> $certificates
     * @return array<string, mixed>
     */
    public function build(string $batchReference, array $certificates, ?DateTimeImmutable $createdAt = null): array
    {
        if (trim($batchReference) === '') {
            throw new InvalidArgumentException('Batch reference is required.');
        }

        $createdAt ??= new DateTimeImmutable('now');
        $entries = [];

        foreach ($certificates as $certificate) {
            $entries[] = $this->entry($certificate);
        }

        usort($entries, static function (array $left, array $right): int {
            return [$left['certificate_number'], $left['recipient_identifier']]
                <=> [$right['certificate_number'], $right['recipient_identifier']];
        });

        $manifest = [
            'manifest_version' => '1.0',
            'batch_reference' => $batchReference,
            'created_at' => $createdAt->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z'),
            'hash_algorithm' => 'sha256',
            'certificate_count' => count($entries),
            'certificates' => $entries,
        ];

        $manifest['manifest_sha256'] = hash('sha256', $this->canonicalJson($manifest));
        return $manifest;
    }

    /**
     * @param array<string, mixed> $manifest
     */
    public function verify(array $manifest): bool
    {
        if (!isset($manifest['manifest_sha256']) || !is_string($manifest['manifest_sha256'])) {
            return false;
        }

        $expected = $manifest['manifest_sha256'];
        $copy = $manifest;
        unset($copy['manifest_sha256']);

        return hash_equals($expected, hash('sha256', $this->canonicalJson($copy)));
    }

    /**
     * @param array<string, mixed> $certificate
     * @return array<string, string>
     */
    private function entry(array $certificate): array
    {
        foreach (['certificate_number', 'recipient_identifier', 'pdf_path'] as $field) {
            if (!isset($certificate[$field]) || !is_string($certificate[$field]) || trim($certificate[$field]) === '') {
                throw new InvalidArgumentException("Certificate manifest entry missing {$field}.");
            }
        }

        $pdfPath = $certificate['pdf_path'];
        $pdfHash = $certificate['pdf_sha256'] ?? null;
        if ($pdfHash === null || $pdfHash === '') {
            if (!is_file($pdfPath)) {
                throw new RuntimeException("Cannot hash missing certificate PDF: {$pdfPath}");
            }
            $pdfHash = hash_file('sha256', $pdfPath);
        }

        if (!is_string($pdfHash) || !preg_match('/^[a-f0-9]{64}$/', $pdfHash)) {
            throw new InvalidArgumentException('Certificate PDF hash must be a lowercase SHA-256 digest.');
        }

        return [
            'certificate_number' => $certificate['certificate_number'],
            'recipient_identifier' => $certificate['recipient_identifier'],
            'pdf_sha256' => $pdfHash,
            'rendered_at' => is_string($certificate['rendered_at'] ?? null) ? $certificate['rendered_at'] : '',
        ];
    }

    /**
     * @param array<string, mixed> $value
     */
    private function canonicalJson(array $value): string
    {
        $normalized = $this->sortKeys($value);

        try {
            return json_encode($normalized, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        } catch (JsonException $exception) {
            throw new RuntimeException('Unable to encode certificate hash manifest.', 0, $exception);
        }
    }

    /**
     * @param mixed $value
     * @return mixed
     */
    private function sortKeys(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }

        if (array_is_list($value)) {
            return array_map(fn (mixed $item): mixed => $this->sortKeys($item), $value);
        }

        ksort($value);
        foreach ($value as $key => $item) {
            $value[$key] = $this->sortKeys($item);
        }

        return $value;
    }
}
