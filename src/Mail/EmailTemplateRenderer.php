<?php

declare(strict_types=1);

namespace CertificateIssuer\Mail;

final class EmailTemplateRenderer
{
    /**
     * @param array<string, string> $data
     */
    public function render(string $template, array $data, bool $escapeHtml = true): string
    {
        return preg_replace_callback('/{{\s*([A-Za-z0-9_.-]+)\s*}}/', function (array $matches) use ($data, $escapeHtml): string {
            $value = $data[$matches[1]] ?? '';
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
}
