<?php

declare(strict_types=1);

use CertificateIssuer\Certificate\CertificateHashManifest;
use CertificateIssuer\Certificate\CertificateRenderer;
use CertificateIssuer\Certificate\TemplateLayout;

require_once __DIR__ . '/../vendor/autoload.php';

if (!extension_loaded('mbstring')) {
    throw new RuntimeException('The mbstring extension is required to render PDF visual regression samples with mPDF.');
}

$root = dirname(__DIR__);
$fixtureDir = $root . DIRECTORY_SEPARATOR . 'examples' . DIRECTORY_SEPARATOR . 'visual-regression';
$layoutPath = $fixtureDir . DIRECTORY_SEPARATOR . 'mixed-rtl-ltr-layout.json';
$recipientsPath = $fixtureDir . DIRECTORY_SEPARATOR . 'mixed-rtl-ltr-recipients.json';
$outputDir = isset($argv[1]) && trim((string) $argv[1]) !== ''
    ? absolutePath((string) $argv[1], getcwd() ?: $root)
    : $root . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'private' . DIRECTORY_SEPARATOR . 'pdf-visual-regression';

$fixture = readJsonFile($recipientsPath);
$layout = TemplateLayout::fromFile($layoutPath);
$renderer = new CertificateRenderer();

if (!is_dir($outputDir) && !mkdir($outputDir, 0750, true) && !is_dir($outputDir)) {
    throw new RuntimeException("Unable to create output directory: {$outputDir}");
}

$scenarios = is_array($fixture['scenarios'] ?? null) ? $fixture['scenarios'] : [];
if ($scenarios === []) {
    throw new RuntimeException('Visual regression fixture contains no scenarios.');
}

$scenarioResults = [];
$hashEntries = [];

foreach (array_values($scenarios) as $index => $scenario) {
    if (!is_array($scenario)) {
        throw new RuntimeException('Scenario entry must be an object.');
    }

    $scenarioId = stringField($scenario, 'id');
    $recipient = stringMap(is_array($scenario['recipient'] ?? null) ? $scenario['recipient'] : []);
    $fileBase = sprintf('%02d-%s', $index + 1, slug($scenarioId));
    $pdfPath = $outputDir . DIRECTORY_SEPARATOR . $fileBase . '.pdf';
    $htmlPath = $outputDir . DIRECTORY_SEPARATOR . $fileBase . '.html';

    $renderer->renderPdf($layout, $recipient, $pdfPath);
    file_put_contents($htmlPath, $renderer->html($layout, $recipient), LOCK_EX);

    $pdfBytes = file_get_contents($pdfPath);
    if ($pdfBytes === false || !str_starts_with($pdfBytes, '%PDF')) {
        throw new RuntimeException("Rendered proof is not a PDF: {$pdfPath}");
    }

    $pdfHash = (string) hash_file('sha256', $pdfPath);
    $htmlHash = (string) hash_file('sha256', $htmlPath);
    $pdfAIndicators = [
        'has_pdfa_schema' => str_contains($pdfBytes, 'pdfaid:part'),
        'has_output_intent' => str_contains($pdfBytes, '/OutputIntent'),
    ];

    $hashEntries[] = [
        'certificate_number' => $recipient['certificate_number'] ?? $scenarioId,
        'recipient_identifier' => $recipient['unique_identifier'] ?? $scenarioId,
        'pdf_path' => $pdfPath,
        'pdf_sha256' => $pdfHash,
        'rendered_at' => stringField($fixture, 'proof_generated_at'),
    ];

    $scenarioResults[] = [
        'id' => $scenarioId,
        'description' => stringField($scenario, 'description'),
        'expected_checks' => stringList($scenario['expected_checks'] ?? []),
        'recipient_identifier' => $recipient['unique_identifier'] ?? '',
        'certificate_number' => $recipient['certificate_number'] ?? '',
        'fixture_content_sha256' => hash('sha256', canonicalJson([
            'layout_sha256' => (string) hash_file('sha256', $layoutPath),
            'recipient' => $recipient,
            'expected_checks' => stringList($scenario['expected_checks'] ?? []),
        ])),
        'pdf_path' => relativePath($root, $pdfPath),
        'pdf_sha256' => $pdfHash,
        'html_path' => relativePath($root, $htmlPath),
        'html_sha256' => $htmlHash,
        'pdfa_indicators' => $pdfAIndicators,
    ];
}

$createdAt = new DateTimeImmutable(stringField($fixture, 'proof_generated_at'));
$pdfManifest = (new CertificateHashManifest())->build(stringField($fixture, 'batch_reference'), $hashEntries, $createdAt);
$manifest = [
    'manifest_version' => '1.0',
    'fixture_version' => stringField($fixture, 'fixture_version'),
    'batch_reference' => stringField($fixture, 'batch_reference'),
    'generated_at' => $createdAt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z'),
    'layout_path' => relativePath($root, $layoutPath),
    'layout_sha256' => (string) hash_file('sha256', $layoutPath),
    'recipients_path' => relativePath($root, $recipientsPath),
    'recipients_sha256' => (string) hash_file('sha256', $recipientsPath),
    'output_directory' => relativePath($root, $outputDir),
    'renderer' => CertificateRenderer::class,
    'pdf_profile' => 'PDF/A via mPDF PDFA auto mode',
    'determinism' => [
        'stable_fixture_inputs' => true,
        'stable_output_names' => true,
        'stable_html_snapshots' => true,
        'pdf_hash_scope' => 'per-render evidence; mPDF metadata and embedded font subsets can vary by runtime environment',
    ],
    'scenarios' => $scenarioResults,
    'pdf_hash_manifest' => $pdfManifest,
];
$manifest['manifest_sha256'] = hash('sha256', canonicalJson($manifest));

$manifestPath = $outputDir . DIRECTORY_SEPARATOR . 'pdf-visual-regression-manifest.json';
file_put_contents($manifestPath, json_encode($manifest, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL, LOCK_EX);

echo "Rendered " . count($scenarioResults) . " PDF visual regression samples.\n";
echo 'Output: ' . relativePath($root, $outputDir) . "\n";
echo 'Manifest: ' . relativePath($root, $manifestPath) . "\n";

function readJsonFile(string $path): array
{
    $json = file_get_contents($path);
    if ($json === false) {
        throw new RuntimeException("Unable to read fixture: {$path}");
    }

    $data = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
    if (!is_array($data)) {
        throw new RuntimeException("Fixture must decode to an object: {$path}");
    }

    return $data;
}

function stringField(array $data, string $key): string
{
    $value = $data[$key] ?? '';
    return is_scalar($value) ? trim((string) $value) : '';
}

function stringMap(array $data): array
{
    $result = [];
    foreach ($data as $key => $value) {
        if (is_string($key) && is_scalar($value)) {
            $result[$key] = (string) $value;
        }
    }

    return $result;
}

function stringList(mixed $value): array
{
    if (!is_array($value)) {
        return [];
    }

    return array_values(array_filter(array_map(
        static fn (mixed $item): string => is_scalar($item) ? trim((string) $item) : '',
        $value
    ), static fn (string $item): bool => $item !== ''));
}

function slug(string $value): string
{
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $value) ?? ''));
    $slug = trim($slug, '-');
    return $slug !== '' ? $slug : 'scenario';
}

function absolutePath(string $path, string $base): string
{
    if (preg_match('/^[A-Za-z]:[\/\\\\]/', $path) === 1 || str_starts_with($path, DIRECTORY_SEPARATOR)) {
        return $path;
    }

    return $base . DIRECTORY_SEPARATOR . $path;
}

function relativePath(string $root, string $path): string
{
    $root = rtrim(str_replace('\\', '/', realpath($root) ?: $root), '/') . '/';
    $realPath = str_replace('\\', '/', realpath($path) ?: $path);

    return str_starts_with($realPath, $root) ? substr($realPath, strlen($root)) : $realPath;
}

function canonicalJson(array $value): string
{
    $normalized = sortKeys($value);
    return json_encode($normalized, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function sortKeys(mixed $value): mixed
{
    if (!is_array($value)) {
        return $value;
    }

    if (array_is_list($value)) {
        return array_map(static fn (mixed $item): mixed => sortKeys($item), $value);
    }

    ksort($value);
    foreach ($value as $key => $item) {
        $value[$key] = sortKeys($item);
    }

    return $value;
}
