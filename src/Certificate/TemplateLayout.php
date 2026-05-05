<?php

declare(strict_types=1);

namespace CertificateIssuer\Certificate;

use InvalidArgumentException;

final class TemplateLayout
{
    /**
     * @param array<string, mixed> $page
     * @param array<int, array<string, mixed>> $elements
     */
    public function __construct(
        public readonly array $page,
        public readonly ?string $background,
        public readonly array $elements
    ) {
        $this->validate();
    }

    public static function fromJson(string $json): self
    {
        $data = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        if (!is_array($data)) {
            throw new InvalidArgumentException('Template layout JSON must decode to an object.');
        }

        return new self(
            page: is_array($data['page'] ?? null) ? $data['page'] : [],
            background: isset($data['background']) ? (string) $data['background'] : null,
            elements: is_array($data['elements'] ?? null) ? $data['elements'] : []
        );
    }

    public static function fromFile(string $path): self
    {
        $json = file_get_contents($path);
        if ($json === false) {
            throw new InvalidArgumentException('Template layout file could not be read.');
        }

        return self::fromJson($json);
    }

    public function width(): float
    {
        return (float) ($this->page['width'] ?? 297);
    }

    public function height(): float
    {
        return (float) ($this->page['height'] ?? 210);
    }

    public function orientation(): string
    {
        $orientation = strtolower((string) ($this->page['orientation'] ?? 'landscape'));
        return in_array($orientation, ['portrait', 'landscape'], true) ? $orientation : 'landscape';
    }

    private function validate(): void
    {
        foreach ($this->elements as $element) {
            foreach (['key', 'source', 'x', 'y', 'width', 'height'] as $required) {
                if (!array_key_exists($required, $element)) {
                    throw new InvalidArgumentException(sprintf('Template element is missing "%s".', $required));
                }
            }
        }
    }
}
