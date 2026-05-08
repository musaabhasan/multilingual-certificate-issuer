<?php

declare(strict_types=1);

namespace CertificateIssuer\Mail;

final class EmailTemplateRenderer
{
    /**
     * @param array<string, mixed> $data
     */
    public function render(string $template, array $data, bool $escapeHtml = true): string
    {
        return preg_replace_callback('/{{\s*([A-Za-z0-9_.-]+)\s*}}/', function (array $matches) use ($data, $escapeHtml): string {
            $value = $this->resolveValue($data, $matches[1]) ?? '';
            return $escapeHtml ? htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : $value;
        }, $template) ?? $template;
    }

    /**
     * @return array<int, string>
     */
    public function variables(string $template): array
    {
        preg_match_all('/{{\s*([A-Za-z0-9_.-]+)\s*}}/', $template, $matches);
        return array_values(array_unique($matches[1] ?? []));
    }

    /**
     * @param array<string, mixed> $data
     * @return array<int, string>
     */
    public function missingVariables(string $template, array $data): array
    {
        return array_values(array_filter(
            $this->variables($template),
            fn (string $variable): bool => $this->resolveValue($data, $variable) === null
        ));
    }

    /**
     * @param array<string, mixed> $data
     */
    private function resolveValue(array $data, string $variable): ?string
    {
        if (array_key_exists($variable, $data)) {
            return $this->stringValue($data[$variable]);
        }

        $current = $data;
        foreach (explode('.', $variable) as $part) {
            if (!is_array($current) || !array_key_exists($part, $current)) {
                return null;
            }

            $current = $current[$part];
        }

        return $this->stringValue($current);
    }

    private function stringValue(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        if (is_scalar($value)) {
            return (string) $value;
        }

        return '';
    }
}
