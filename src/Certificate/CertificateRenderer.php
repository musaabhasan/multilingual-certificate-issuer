<?php

declare(strict_types=1);

namespace CertificateIssuer\Certificate;

use Mpdf\Config\ConfigVariables;
use Mpdf\Config\FontVariables;
use Mpdf\Mpdf;
use RuntimeException;

final class CertificateRenderer
{
    private const FONT_FILES = [
        'bukra_slanted' => '29LTBukra-Sl.ttf',
        'bukra_book_slanted' => '29LTBukra-BkSl.ttf',
        'bukra_light_slanted' => '29LTBukra-LtSl.ttf',
        'bukra_extralight_slanted' => '29LTBukra-ExLtSl.ttf',
        'bukra_thin_slanted' => '29LTBukra-TnSl.ttf',
        'bukra_hairline_slanted' => '29LTBukra-HrSl.ttf',
        'bukra_medium_slanted' => '29LTBukra-MdSl.ttf',
        'bukra_semibold_slanted' => '29LTBukra-SmBdSl.ttf',
        'bukra_bold_slanted' => '29LTBukra-BdSl.ttf',
        'bukra_extrabold_slanted' => '29LTBukra-ExBdSl.ttf',
    ];

    private const BUILT_IN_FONTS = [
        'dejavusans',
        'dejavuserif',
        'dejavusansmono',
        'freesans',
        'freeserif',
        'freemono',
        'lateef',
        'xbriyaz',
        'kfgqpcuthmantahanaskh',
    ];

    private const SYSTEM_FONT_FILES = [
        'arial' => ['R' => 'arial.ttf', 'B' => 'arialbd.ttf', 'I' => 'ariali.ttf', 'BI' => 'arialbi.ttf'],
        'arial_narrow' => ['R' => 'ARIALN.TTF', 'B' => 'ARIALNB.TTF', 'I' => 'ARIALNI.TTF', 'BI' => 'ARIALNBI.TTF'],
        'tahoma' => ['R' => 'tahoma.ttf', 'B' => 'tahomabd.ttf'],
        'times_new_roman' => ['R' => 'times.ttf', 'B' => 'timesbd.ttf', 'I' => 'timesi.ttf', 'BI' => 'timesbi.ttf'],
        'calibri' => ['R' => 'calibri.ttf', 'B' => 'calibrib.ttf', 'I' => 'calibrii.ttf', 'BI' => 'calibriz.ttf'],
        'segoe_ui' => ['R' => 'segoeui.ttf', 'B' => 'segoeuib.ttf', 'I' => 'segoeuii.ttf', 'BI' => 'segoeuiz.ttf'],
        'verdana' => ['R' => 'verdana.ttf', 'B' => 'verdanab.ttf', 'I' => 'verdanai.ttf', 'BI' => 'verdanaz.ttf'],
        'georgia' => ['R' => 'georgia.ttf', 'B' => 'georgiab.ttf', 'I' => 'georgiai.ttf', 'BI' => 'georgiaz.ttf'],
        'trebuchet_ms' => ['R' => 'trebuc.ttf', 'B' => 'trebucbd.ttf', 'I' => 'trebucit.ttf', 'BI' => 'trebucbi.ttf'],
        'courier_new' => ['R' => 'cour.ttf', 'B' => 'courbd.ttf', 'I' => 'couri.ttf', 'BI' => 'courbi.ttf'],
        'noto_sans' => ['R' => 'NotoSans-Regular.ttf', 'B' => 'NotoSans-Bold.ttf', 'I' => 'NotoSans-Italic.ttf', 'BI' => 'NotoSans-BoldItalic.ttf'],
        'noto_serif' => ['R' => 'NotoSerif-Regular.ttf', 'B' => 'NotoSerif-Bold.ttf', 'I' => 'NotoSerif-Italic.ttf', 'BI' => 'NotoSerif-BoldItalic.ttf'],
        'noto_sans_arabic' => ['R' => 'NotoSansArabic-Regular.ttf', 'B' => 'NotoSansArabic-Bold.ttf'],
        'noto_naskh_arabic' => ['R' => 'NotoNaskhArabic-Regular.ttf', 'B' => 'NotoNaskhArabic-Bold.ttf'],
        'noto_kufi_arabic' => ['R' => 'NotoKufiArabic-Regular.ttf', 'B' => 'NotoKufiArabic-Bold.ttf'],
        'traditional_arabic' => ['R' => 'trado.ttf', 'B' => 'tradbdo.ttf'],
        'arabic_typesetting' => ['R' => 'arabtype.ttf'],
        'sakkal_majalla' => ['R' => 'majalla.ttf', 'B' => 'majallab.ttf'],
        'simplified_arabic' => ['R' => 'simpo.ttf', 'B' => 'simpbdo.ttf'],
    ];

    private const FONT_ALIASES = [
        'bukra_regular' => 'bukra_book_slanted',
        'bukra_medium' => 'bukra_medium_slanted',
        'bukra_semibold' => 'bukra_semibold_slanted',
        'bukra_bold' => 'bukra_bold_slanted',
        'times' => 'times_new_roman',
        'courier' => 'courier_new',
        'uthman' => 'kfgqpcuthmantahanaskh',
        'xb_riyaz' => 'xbriyaz',
        'noto_arabic' => 'noto_naskh_arabic',
    ];

    /**
     * @param array<string, string> $recipient
     */
    public function renderPdf(TemplateLayout $layout, array $recipient, string $outputPath): void
    {
        if (!class_exists(Mpdf::class)) {
            throw new RuntimeException('mPDF is not installed. Run composer install.');
        }

        $fontConfig = $this->fontConfig();
        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => [$layout->width(), $layout->height()],
            'PDFA' => true,
            'PDFAauto' => true,
            'autoScriptToLang' => true,
            'autoLangToFont' => true,
            'tempDir' => sys_get_temp_dir(),
            'margin_left' => 0,
            'margin_right' => 0,
            'margin_top' => 0,
            'margin_bottom' => 0,
            'margin_header' => 0,
            'margin_footer' => 0,
            'default_font' => 'dejavusans',
            'fontDir' => $fontConfig['fontDir'],
            'fontdata' => $fontConfig['fontdata'],
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
        $background = $layout->background !== null ? $this->backgroundCss($layout->background, $layout->normalizedBackgroundFit()) : '';
        $parts = [
            '<html><head><meta charset="UTF-8"><style>',
            '@page { margin: 0; }',
            'body { margin: 0; padding: 0; font-family: dejavusans, sans-serif; }',
            '.page { position: relative; width: ' . $layout->width() . 'mm; height: ' . $layout->height() . 'mm; overflow: hidden; ' . $background . ' }',
            '.element { position: absolute; white-space: pre-wrap; line-height: 1.2; }',
            '</style></head><body><div class="page">',
        ];

        foreach ($layout->elements as $element) {
            $type = (string) ($element['type'] ?? 'csv_text');
            if ($type === 'verification_qr') {
                $parts[] = $this->verificationQrElement($element, $recipient);
                continue;
            }

            if ($type === 'image') {
                $parts[] = $this->imageElement($element);
                continue;
            }

            $value = $type === 'static_text'
                ? (string) ($element['text'] ?? $element['label'] ?? '')
                : ($recipient[(string) ($element['source'] ?? '')] ?? '');
            $directionValue = (string) ($element['direction'] ?? 'ltr');
            $alignValue = (string) ($element['align'] ?? 'left');
            $direction = in_array($directionValue, ['rtl', 'ltr'], true) ? $directionValue : 'ltr';
            $align = in_array($alignValue, ['left', 'right', 'center'], true) ? $alignValue : 'left';
            $color = preg_match('/^#[0-9A-Fa-f]{6}$/', (string) ($element['color'] ?? '')) ? $element['color'] : '#111111';
            $font = $this->fontFamily((string) ($element['font'] ?? 'dejavusans'));

            $style = sprintf(
                'left:%smm; top:%smm; width:%smm; height:%smm; font-family:%s, dejavusans, sans-serif; font-size:%spt; text-align:%s; direction:%s; color:%s;',
                (float) $element['x'],
                (float) $element['y'],
                (float) $element['width'],
                (float) $element['height'],
                $font,
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

    /**
     * @param array<string, mixed> $element
     * @param array<string, string> $recipient
     */
    private function verificationQrElement(array $element, array $recipient): string
    {
        $src = trim((string) ($recipient['verification_qr_data_uri'] ?? ''));
        $style = sprintf(
            'left:%smm; top:%smm; width:%smm; height:%smm; background:#ffffff; text-align:center;',
            (float) $element['x'],
            (float) $element['y'],
            (float) $element['width'],
            (float) $element['height']
        );

        if ($src === '') {
            return '<div class="element" style="' . $style . ' font-size:7pt; text-align:center; color:#536275;">Verification QR unavailable</div>';
        }

        return '<div class="element" style="' . $style . '"><img src="' . htmlspecialchars($src, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '" style="width:100%; height:100%;" alt="Certificate verification QR"></div>';
    }

    /**
     * @param array<string, mixed> $element
     */
    private function imageElement(array $element): string
    {
        $src = trim((string) ($element['src'] ?? ''));
        if ($src === '') {
            return '';
        }

        $fitValue = (string) ($element['fit'] ?? 'contain');
        $fit = in_array($fitValue, ['cover', 'contain', 'stretch'], true) ? $fitValue : 'contain';
        $size = match ($fit) {
            'cover' => 'cover',
            'stretch' => '100% 100%',
            default => 'contain',
        };
        $safePath = str_replace('\\', '/', $src);
        $style = sprintf(
            "left:%smm; top:%smm; width:%smm; height:%smm; background-image:url('%s'); background-repeat:no-repeat; background-position:center; background-size:%s;",
            (float) $element['x'],
            (float) $element['y'],
            (float) $element['width'],
            (float) $element['height'],
            htmlspecialchars($safePath, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
            $size
        );

        return '<div class="element" style="' . $style . '"></div>';
    }

    private function backgroundCss(string $backgroundPath, string $fit): string
    {
        $safePath = str_replace('\\', '/', $backgroundPath);
        $size = match ($fit) {
            'cover' => 'cover',
            'contain' => 'contain',
            default => '100% 100%',
        };

        return "background-image: url('" . htmlspecialchars($safePath, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "'); background-repeat: no-repeat; background-position: center; background-size: " . $size . ';';
    }

    /**
     * @return array{fontDir: array<int, string>, fontdata: array<string, array<string, string>>}
     */
    private function fontConfig(): array
    {
        $configVariables = new ConfigVariables();
        $fontVariables = new FontVariables();
        $fontDirs = $configVariables->getDefaults()['fontDir'];
        $fontData = $fontVariables->getDefaults()['fontdata'];
        $fontDirectory = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'fonts' . DIRECTORY_SEPARATOR . 'bukra';

        if (is_dir($fontDirectory)) {
            $fontDirs[] = $fontDirectory;
            foreach (self::FONT_FILES as $fontName => $fileName) {
                if (is_file($fontDirectory . DIRECTORY_SEPARATOR . $fileName)) {
                    $fontData[$fontName] = ['R' => $fileName];
                }
            }
        }

        $systemFontDirectory = $this->systemFontDirectory();
        if ($systemFontDirectory !== null) {
            $fontDirs[] = $systemFontDirectory;
            foreach (self::SYSTEM_FONT_FILES as $fontName => $files) {
                $fontSet = $this->availableSystemFontSet($systemFontDirectory, $files);
                if ($fontSet !== []) {
                    $fontData[$fontName] = $fontSet;
                }
            }
        }

        return ['fontDir' => $fontDirs, 'fontdata' => $fontData];
    }

    private function fontFamily(string $font): string
    {
        $resolved = self::FONT_ALIASES[$font] ?? $font;
        if (in_array($resolved, self::BUILT_IN_FONTS, true)
            || array_key_exists($resolved, self::FONT_FILES)
            || array_key_exists($resolved, self::SYSTEM_FONT_FILES)
        ) {
            return $resolved;
        }

        return 'dejavusans';
    }

    private function systemFontDirectory(): ?string
    {
        $candidates = array_filter([
            getenv('WINDIR') !== false ? getenv('WINDIR') . DIRECTORY_SEPARATOR . 'Fonts' : null,
            getenv('SystemRoot') !== false ? getenv('SystemRoot') . DIRECTORY_SEPARATOR . 'Fonts' : null,
            'C:' . DIRECTORY_SEPARATOR . 'Windows' . DIRECTORY_SEPARATOR . 'Fonts',
        ]);

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && is_dir($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * @param array<string, string> $files
     * @return array<string, string>
     */
    private function availableSystemFontSet(string $fontDirectory, array $files): array
    {
        if (!isset($files['R']) || !is_file($fontDirectory . DIRECTORY_SEPARATOR . $files['R'])) {
            return [];
        }

        $available = ['R' => $files['R']];
        foreach (['B', 'I', 'BI'] as $style) {
            if (isset($files[$style]) && is_file($fontDirectory . DIRECTORY_SEPARATOR . $files[$style])) {
                $available[$style] = $files[$style];
            }
        }

        return $available;
    }
}
