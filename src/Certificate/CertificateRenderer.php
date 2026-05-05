<?php

declare(strict_types=1);

namespace CertificateIssuer\Certificate;

use Mpdf\Mpdf;
use RuntimeException;

final class CertificateRenderer
{
    /**
     * @param array<string, string> $recipient
     */
    public function renderPdf(TemplateLayout $layout, array $recipient, string $outputPath): void
    {
        if (!class_exists(Mpdf::class)) {
            throw new RuntimeException('mPDF is not installed. Run composer install.');
        }

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => [$layout->width(), $layout->height()],
            'orientation' => $layout->orientation() === 'landscape' ? 'L' : 'P',
            'PDFA' => true,
            'PDFAauto' => true,
            'autoScriptToLang' => true,
            'autoLangToFont' => true,
            'tempDir' => sys_get_temp_dir(),
            'default_font' => 'dejavusans',
        ]);

        $mpdf->SetTitle('Digital Certificate');
        $mpdf->SetAuthor('Certificate Issuance Platform');
        $mpdf->WriteHTML($this->html($layout, $recipient));

        $directory = dirname($outputPath);
        if (!is_dir($directory)) {
            mkdir($directory, 0750, true);
        }

        $mpdf->Output($outputPath, 'F');
    }

    /**
     * @param array<string, string> $recipient
     */
    public function html(TemplateLayout $layout, array $recipient): string
    {
        $background = $layout->background !== null ? $this->backgroundCss($layout->background) : '';
        $parts = [
            '<html><head><meta charset="UTF-8"><style>',
            '@page { margin: 0; }',
            'body { margin: 0; padding: 0; font-family: dejavusans, sans-serif; }',
            '.page { position: relative; width: ' . $layout->width() . 'mm; height: ' . $layout->height() . 'mm; overflow: hidden; ' . $background . ' }',
            '.element { position: absolute; white-space: pre-wrap; line-height: 1.2; }',
            '</style></head><body><div class="page">',
        ];

        foreach ($layout->elements as $element) {
            $source = (string) $element['source'];
            $value = $recipient[$source] ?? '';
            $direction = in_array(($element['direction'] ?? 'ltr'), ['rtl', 'ltr'], true) ? $element['direction'] : 'ltr';
            $align = in_array(($element['align'] ?? 'left'), ['left', 'right', 'center'], true) ? $element['align'] : 'left';
            $color = preg_match('/^#[0-9A-Fa-f]{6}$/', (string) ($element['color'] ?? '')) ? $element['color'] : '#111111';

            $style = sprintf(
                'left:%smm; top:%smm; width:%smm; height:%smm; font-size:%spt; text-align:%s; direction:%s; color:%s;',
                (float) $element['x'],
                (float) $element['y'],
                (float) $element['width'],
                (float) $element['height'],
                (float) ($element['fontSize'] ?? 18),
                $align,
                $direction,
                $color
            );

            $parts[] = '<div class="element" style="' . $style . '">' . htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</div>';
        }

        $parts[] = '</div></body></html>';
        return implode('', $parts);
    }

    private function backgroundCss(string $backgroundPath): string
    {
        $safePath = str_replace('\\', '/', $backgroundPath);
        return "background-image: url('" . htmlspecialchars($safePath, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "'); background-size: 100% 100%;";
    }
}
