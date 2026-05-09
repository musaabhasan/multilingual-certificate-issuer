<?php

declare(strict_types=1);

namespace CertificateIssuer\Certificate;

use RuntimeException;

final class TemplateAssetIntegrityAudit
{
    private const SHA256_PATTERN = '/^[a-f0-9]{64}$/';
    private const HIGH_RESOLUTION_ASSET_TYPES = ['background', 'seal', 'signature', 'qr_overlay'];

    /**
     * @return array<string, mixed>
     */
    public function auditFile(string $path): array
    {
        if (!is_file($path)) {
            throw new RuntimeException("Template asset manifest not found: {$path}");
        }

        $payload = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($payload)) {
            throw new RuntimeException('Template asset manifest must be a JSON object.');
        }

        return $this->audit($payload);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function audit(array $payload): array
    {
        $assets = $payload['assets'] ?? [];
        if (!is_array($assets)) {
            throw new RuntimeException('Template asset manifest must include an assets array.');
        }

        $findings = [];
        $rows = [];
        $requiresArabic = $this->boolValue($payload, 'requires_arabic');
        $hasEmbeddedRtlFont = false;

        foreach ($assets as $index => $asset) {
            if (!is_array($asset)) {
                $findings[] = $this->finding('high', 'invalid_asset_record', "assets[{$index}]", 'Asset record must be an object.');
                continue;
            }

            array_push($findings, ...$this->auditAsset($asset, $index));
            if ($this->assetType($asset) === 'font' && $this->boolValue($asset, 'embedded') && $this->boolValue($asset, 'rtl_capable')) {
                $hasEmbeddedRtlFont = true;
            }

            $rows[] = [
                'asset_id' => $this->assetId($asset, $index),
                'type' => $this->assetType($asset),
                'filename' => $this->stringValue($asset, 'filename'),
                'review_status' => strtolower($this->stringValue($asset, 'review_status')),
                'embedded' => $this->boolValue($asset, 'embedded'),
            ];
        }

        if ($requiresArabic && !$hasEmbeddedRtlFont) {
            $findings[] = $this->finding(
                'high',
                'arabic_font_not_embedded',
                (string) ($payload['template_id'] ?? 'template'),
                'Template requires Arabic text but no embedded RTL-capable font is approved.'
            );
        }

        $summary = $this->summary($findings, count($assets));

        return [
            'passed' => $summary['high'] === 0,
            'summary' => $summary,
            'assets' => $rows,
            'findings' => $findings,
            'review_questions' => [
                'Can the renderer prove that every background, seal, signature, font, and QR overlay matches the approved hash?',
                'Are Arabic and English fonts embedded so recipients see the same layout on every device?',
                'Are high-resolution image assets suitable for PDF/A rendering and print inspection?',
                'Is every externally sourced asset licensed for the certificate use case?',
                'Can operators block a batch if a template asset changed after approval?',
            ],
        ];
    }

    /**
     * @param array<string, mixed> $asset
     * @return list<array<string, mixed>>
     */
    private function auditAsset(array $asset, int $index): array
    {
        $findings = [];
        $target = $this->assetId($asset, $index);
        $type = $this->assetType($asset);
        $expectedHash = strtolower($this->stringValue($asset, 'expected_sha256'));
        $observedHash = strtolower($this->stringValue($asset, 'observed_sha256'));

        if ($this->boolValue($asset, 'required') && $observedHash === '') {
            $findings[] = $this->finding('high', 'required_asset_missing', $target, 'Required asset has no observed hash evidence.');
        }

        if ($expectedHash === '' || preg_match(self::SHA256_PATTERN, $expectedHash) !== 1) {
            $findings[] = $this->finding('high', 'expected_hash_invalid', $target, 'Expected SHA-256 hash is missing or invalid.');
        }

        if ($observedHash !== '' && preg_match(self::SHA256_PATTERN, $observedHash) !== 1) {
            $findings[] = $this->finding('high', 'observed_hash_invalid', $target, 'Observed SHA-256 hash is invalid.');
        }

        if ($expectedHash !== '' && $observedHash !== '' && preg_match(self::SHA256_PATTERN, $expectedHash) === 1 && $expectedHash !== $observedHash) {
            $findings[] = $this->finding('high', 'hash_mismatch', $target, 'Observed asset hash does not match the approved template manifest.');
        }

        if ($this->boolValue($asset, 'required') && !$this->boolValue($asset, 'embedded')) {
            $findings[] = $this->finding('medium', 'required_asset_not_embedded', $target, 'Required asset is not marked as embedded in the rendered PDF.');
        }

        if (in_array($type, self::HIGH_RESOLUTION_ASSET_TYPES, true)) {
            $dpi = $this->intValue($asset, 'dpi');
            if ($dpi > 0 && $dpi < 300) {
                $findings[] = $this->finding('medium', 'low_resolution_asset', $target, 'Image asset is below 300 DPI.');
            }
        }

        if ($type === 'font' && $this->boolValue($asset, 'required') && !$this->boolValue($asset, 'embedded')) {
            $findings[] = $this->finding('high', 'required_font_not_embedded', $target, 'Required font is not embedded.');
        }

        if ($this->stringValue($asset, 'license_reference') === '') {
            $findings[] = $this->finding('medium', 'license_reference_missing', $target, 'Asset license or usage-rights reference is missing.');
        }

        $status = strtolower($this->stringValue($asset, 'review_status'));
        if (!in_array($status, ['approved', 'approved_with_controls'], true)) {
            $findings[] = $this->finding('medium', 'asset_not_approved', $target, 'Asset review status is not approved.');
        }

        return $findings;
    }

    /**
     * @param list<array<string, mixed>> $findings
     * @return array<string, int>
     */
    private function summary(array $findings, int $assetCount): array
    {
        $summary = [
            'assets' => $assetCount,
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
     * @param array<string, mixed> $asset
     */
    private function assetId(array $asset, int $index): string
    {
        return $this->stringValue($asset, 'asset_id') ?: 'asset-' . ($index + 1);
    }

    /**
     * @param array<string, mixed> $asset
     */
    private function assetType(array $asset): string
    {
        return strtolower($this->stringValue($asset, 'type'));
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
}
