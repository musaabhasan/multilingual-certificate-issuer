<?php

declare(strict_types=1);

namespace CertificateIssuer\Certificate;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;
use JsonException;
use RuntimeException;

final class VerificationReceipt
{
    /**
     * @var list<string>
     */
    private const ALLOWED_STATUSES = ['valid', 'revoked', 'invalid', 'rate_limited'];

    /**
     * @param array<string, mixed> $lookup
     * @return array<string, mixed>
     */
    public function build(array $lookup, ?DateTimeImmutable $verifiedAt = null): array
    {
        $verifiedAt ??= new DateTimeImmutable('now');
        $status = $this->requiredString($lookup, 'status');
        if (!in_array($status, self::ALLOWED_STATUSES, true)) {
            throw new InvalidArgumentException('Verification status is not supported.');
        }

        $receipt = [
            'receipt_version' => '1.0',
            'status' => $status,
            'certificate_number' => $this->requiredString($lookup, 'certificate_number'),
            'verified_at' => $verifiedAt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z'),
            'verifier' => [
                'hash_algorithm' => 'sha256',
                'metadata_policy' => 'safe-public-fields-only',
            ],
        ];

        $certificate = $this->certificateSection($lookup);
        if ($certificate !== []) {
            $receipt['certificate'] = $certificate;
        }

        $revocation = $this->revocationSection($lookup);
        if ($revocation !== []) {
            $receipt['revocation'] = $revocation;
        }

        $lookupEvidence = $this->lookupSection($lookup);
        if ($lookupEvidence !== []) {
            $receipt['lookup'] = $lookupEvidence;
        }

        $receipt['receipt_sha256'] = hash('sha256', $this->canonicalJson($receipt));
        return $receipt;
    }

    /**
     * @param array<string, mixed> $receipt
     */
    public function verify(array $receipt): bool
    {
        if (!isset($receipt['receipt_sha256']) || !is_string($receipt['receipt_sha256'])) {
            return false;
        }

        $expected = $receipt['receipt_sha256'];
        $copy = $receipt;
        unset($copy['receipt_sha256']);

        return hash_equals($expected, hash('sha256', $this->canonicalJson($copy)));
    }

    /**
     * @param array<string, mixed> $lookup
     * @return array<string, string>
     */
    private function certificateSection(array $lookup): array
    {
        $section = [];

        foreach ([
            'recipient_display_name',
            'template_name',
            'rendered_at',
            'pdf_sha256',
            'batch_reference',
            'manifest_sha256',
        ] as $field) {
            $value = $this->optionalString($lookup, $field);
            if ($value === null) {
                continue;
            }

            if (str_ends_with($field, '_sha256') && !preg_match('/^[a-f0-9]{64}$/', $value)) {
                throw new InvalidArgumentException("{$field} must be a lowercase SHA-256 digest.");
            }

            $section[$field] = $value;
        }

        return $section;
    }

    /**
     * @param array<string, mixed> $lookup
     * @return array<string, string>
     */
    private function revocationSection(array $lookup): array
    {
        $section = [];

        foreach (['revoked_at', 'reason_category', 'replacement_certificate_number'] as $field) {
            $value = $this->optionalString($lookup, $field);
            if ($value !== null) {
                $section[$field] = $value;
            }
        }

        return $section;
    }

    /**
     * @param array<string, mixed> $lookup
     * @return array<string, string>
     */
    private function lookupSection(array $lookup): array
    {
        $section = [];

        foreach (['request_reference', 'source_channel', 'policy_decision'] as $field) {
            $value = $this->optionalString($lookup, $field);
            if ($value !== null) {
                $section[$field] = $value;
            }
        }

        return $section;
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
            throw new RuntimeException('Unable to encode verification receipt.', 0, $exception);
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

    /**
     * @param array<string, mixed> $source
     */
    private function requiredString(array $source, string $field): string
    {
        $value = $this->optionalString($source, $field);
        if ($value === null) {
            throw new InvalidArgumentException("Verification receipt missing {$field}.");
        }

        return $value;
    }

    /**
     * @param array<string, mixed> $source
     */
    private function optionalString(array $source, string $field): ?string
    {
        if (!isset($source[$field]) || !is_string($source[$field])) {
            return null;
        }

        $value = trim($source[$field]);
        return $value === '' ? null : $value;
    }
}
