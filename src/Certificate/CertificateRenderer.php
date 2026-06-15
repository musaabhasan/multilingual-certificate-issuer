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
        $mpdf->SetAutoPageBreak(false, 0);
        $mpdf->AddPage();
        $this->writePdfPage($mpdf, $layout, $recipient);

        $directory = dirname($outputPath);
        if (!is_dir($directory)) {
            mkdir($directory, 0750, true);
        }

        $mpdf->Output($outputPath, 'F');
    }

    /**
     * @param array<string, string> $recipient
     */
    private function writePdfPage(Mpdf $mpdf, TemplateLayout $layout, array $recipient): void
    {
        if ($layout->background !== null && trim($layout->background) !== '') {
            $safePath = str_replace('\\', '/', (string) $layout->background);
            $source = $this->imageSource($safePath);
            if ($source !== null) {
                $frame = $this->backgroundFrame($layout, $safePath);
                $mpdf->Image($source, $frame['left'], $frame['top'], $frame['width'], $frame['height'], '', '', true, false);
            }
        }

        foreach ($layout->elements as $element) {
            if (!is_array($element)) {
                continue;
            }

            $type = (string) ($element['type'] ?? 'csv_text');
            if ($type === 'verification_qr') {
                $this->writeVerificationQr($mpdf, $element, $recipient, $layout);
                continue;
            }

            if ($type === 'image') {
                $this->writeImage($mpdf, $element, $layout);
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
            $whiteSpace = $type === 'static_text' ? 'pre-wrap' : 'nowrap';
            $overflow = $type === 'static_text' ? 'hidden' : 'visible';
            $frame = $type === 'static_text'
                ? $this->elementFrame($element, $layout, 2.4, 1.6)
                : $this->singleLineTextFrame($element, $layout, (string) $value, 2.4, 1.6);
            $html = sprintf(
                '<div style="width:100%%; height:100%%; overflow:%s; font-family:%s, dejavusans, sans-serif; font-size:%spx; line-height:1.2; text-align:%s; direction:%s; color:%s; white-space:%s;">%s</div>',
                $overflow,
                $font,
                (float) ($element['fontSize'] ?? 18),
                $align,
                $direction,
                $color,
                $whiteSpace,
                htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
            );
            $mpdf->WriteFixedPosHTML($html, $frame['left'], $frame['top'], $frame['width'], $frame['height'], $overflow);
        }
    }

    /**
     * @param array<string, string> $recipient
     */
    public function html(TemplateLayout $layout, array $recipient): string
    {
        $parts = [
            '<html><head><meta charset="UTF-8"><style>',
            '@page { margin: 0; }',
            'html, body { margin: 0; padding: 0; width: ' . $layout->width() . 'mm; height: ' . $layout->height() . 'mm; overflow: hidden; font-family: dejavusans, sans-serif; }',
            '.element { position: fixed; overflow: hidden; white-space: pre-wrap; line-height: 1.2; }',
            '.background-element { z-index: 0; }',
            '.text-element { z-index: 2; display: block; }',
            '</style></head><body>',
        ];

        if ($layout->background !== null && trim($layout->background) !== '') {
            $parts[] = $this->backgroundElement($layout);
        }

        foreach ($layout->elements as $element) {
            $type = (string) ($element['type'] ?? 'csv_text');
            if ($type === 'verification_qr') {
                $parts[] = $this->verificationQrElement($element, $recipient, $layout);
                continue;
            }

            if ($type === 'image') {
                $parts[] = $this->imageElement($element, $layout);
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
            $frame = $this->elementFrame($element, $layout, 2.4, 1.6);

            $style = sprintf(
                'left:%smm; top:%smm; width:%smm; height:%smm; font-family:%s, dejavusans, sans-serif; font-size:%spx; text-align:%s; direction:%s; color:%s;',
                $frame['left'],
                $frame['top'],
                $frame['width'],
                $frame['height'],
                $font,
                (float) ($element['fontSize'] ?? 18),
                $align,
                $direction,
                $color
            );

            $parts[] = '<div class="element text-element" style="' . $style . '">' . htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</div>';
        }

        $parts[] = '</body></html>';
        return implode('', $parts);
    }

    /**
     * @param array<string, mixed> $element
     * @param array<string, string> $recipient
     */
    private function verificationQrElement(array $element, array $recipient, TemplateLayout $layout): string
    {
        $src = trim((string) ($recipient['verification_qr_data_uri'] ?? ''));
        $frame = $this->elementFrame($element, $layout);
        $style = sprintf(
            'left:%smm; top:%smm; width:%smm; height:%smm; background:#ffffff; text-align:center;',
            $frame['left'],
            $frame['top'],
            $frame['width'],
            $frame['height']
        );

        if ($src === '') {
            return '<div class="element" style="' . $style . ' font-size:7pt; text-align:center; color:#536275;">Verification QR unavailable</div>';
        }

        return '<div class="element" style="' . $style . '"><img src="' . htmlspecialchars($src, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '" style="width:100%; height:100%;" alt="Certificate verification QR"></div>';
    }

    /**
     * @param array<string, mixed> $element
     * @param array<string, string> $recipient
     */
    private function writeVerificationQr(Mpdf $mpdf, array $element, array $recipient, TemplateLayout $layout): void
    {
        $src = trim((string) ($recipient['verification_qr_data_uri'] ?? ''));
        $frame = $this->elementFrame($element, $layout);

        if ($src === '') {
            $mpdf->WriteFixedPosHTML(
                '<div style="width:100%; height:100%; overflow:hidden; font-size:7pt; text-align:center; color:#536275;">Verification QR unavailable</div>',
                $frame['left'],
                $frame['top'],
                $frame['width'],
                $frame['height'],
                'hidden'
            );
            return;
        }

        $html = '<div style="width:100%; height:100%; overflow:hidden; background:#ffffff;"><img src="'
            . htmlspecialchars($src, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
            . '" style="width:100%; height:100%;" alt="Certificate verification QR"></div>';
        $mpdf->WriteFixedPosHTML($html, $frame['left'], $frame['top'], $frame['width'], $frame['height'], 'hidden');
    }

    /**
     * @param array<string, mixed> $element
     */
    private function imageElement(array $element, TemplateLayout $layout): string
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
        $source = $this->imageSource($safePath);
        if ($source === null) {
            return '';
        }
        $frame = $this->elementFrame($element, $layout);
        $style = sprintf(
            "left:%smm; top:%smm; width:%smm; height:%smm; background-image:url('%s'); background-repeat:no-repeat; background-position:center; background-size:%s;",
            $frame['left'],
            $frame['top'],
            $frame['width'],
            $frame['height'],
            htmlspecialchars($source, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
            $size
        );

        return '<div class="element" style="' . $style . '"></div>';
    }

    /**
     * @param array<string, mixed> $element
     */
    private function writeImage(Mpdf $mpdf, array $element, TemplateLayout $layout): void
    {
        $src = trim((string) ($element['src'] ?? ''));
        if ($src === '') {
            return;
        }

        $fitValue = (string) ($element['fit'] ?? 'contain');
        $fit = in_array($fitValue, ['cover', 'contain', 'stretch'], true) ? $fitValue : 'contain';
        $safePath = str_replace('\\', '/', $src);
        $source = $this->imageSource($safePath);
        if ($source === null) {
            return;
        }
        $frame = $this->elementFrame($element, $layout);
        if ($fit !== 'stretch') {
            $frame = $this->fittedImageFrame($frame, $safePath, $fit);
        }

        $mpdf->Image($source, $frame['left'], $frame['top'], $frame['width'], $frame['height'], '', '', true, false);
    }

    private function backgroundElement(TemplateLayout $layout): string
    {
        $safePath = str_replace('\\', '/', (string) $layout->background);
        $source = $this->imageSource($safePath);
        if ($source === null) {
            return '';
        }
        $frame = $this->backgroundFrame($layout, $safePath);
        $style = sprintf(
            "left:%smm; top:%smm; width:%smm; height:%smm; background-image:url('%s'); background-repeat:no-repeat; background-position:center; background-size:100%% 100%%;",
            $frame['left'],
            $frame['top'],
            $frame['width'],
            $frame['height'],
            htmlspecialchars($source, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
        );

        return '<div class="element background-element" style="' . $style . '"></div>';
    }

    /**
     * @return array{left: float, top: float, width: float, height: float}
     */
    private function backgroundFrame(TemplateLayout $layout, string $path): array
    {
        $pageWidth = $layout->width();
        $pageHeight = $layout->height();
        $fit = $layout->normalizedBackgroundFit();

        if ($fit === 'stretch') {
            return ['left' => 0.0, 'top' => 0.0, 'width' => $pageWidth, 'height' => $pageHeight];
        }

        $imageSize = $this->imageSize($path);
        if ($imageSize === null) {
            return ['left' => 0.0, 'top' => 0.0, 'width' => $pageWidth, 'height' => $pageHeight];
        }

        [$imageWidth, $imageHeight] = $imageSize;
        if ($imageWidth <= 0 || $imageHeight <= 0) {
            return ['left' => 0.0, 'top' => 0.0, 'width' => $pageWidth, 'height' => $pageHeight];
        }

        $scale = $fit === 'cover'
            ? max($pageWidth / $imageWidth, $pageHeight / $imageHeight)
            : min($pageWidth / $imageWidth, $pageHeight / $imageHeight);
        $width = $imageWidth * $scale;
        $height = $imageHeight * $scale;

        return [
            'left' => ($pageWidth - $width) / 2,
            'top' => ($pageHeight - $height) / 2,
            'width' => $width,
            'height' => $height,
        ];
    }

    /**
     * @param array{left: float, top: float, width: float, height: float} $box
     * @return array{left: float, top: float, width: float, height: float}
     */
    private function fittedImageFrame(array $box, string $path, string $fit): array
    {
        $imageSize = $this->imageSize($path);
        if ($imageSize === null) {
            return $box;
        }

        [$imageWidth, $imageHeight] = $imageSize;
        if ($imageWidth <= 0 || $imageHeight <= 0 || $box['width'] <= 0 || $box['height'] <= 0) {
            return $box;
        }

        $scale = $fit === 'cover'
            ? max($box['width'] / $imageWidth, $box['height'] / $imageHeight)
            : min($box['width'] / $imageWidth, $box['height'] / $imageHeight);
        $width = $imageWidth * $scale;
        $height = $imageHeight * $scale;

        return [
            'left' => $box['left'] + (($box['width'] - $width) / 2),
            'top' => $box['top'] + (($box['height'] - $height) / 2),
            'width' => $width,
            'height' => $height,
        ];
    }

    /**
     * @return null|array{0: int, 1: int}
     */
    private function imageSize(string $path): ?array
    {
        foreach ($this->imagePathCandidates($path) as $candidate) {
            $size = @getimagesize($candidate);
            if (is_array($size) && isset($size[0], $size[1])) {
                return [(int) $size[0], (int) $size[1]];
            }
        }

        return null;
    }

    private function imageSource(string $path): ?string
    {
        $path = trim($path);
        if ($this->isMissingImagePath($path)) {
            return null;
        }

        if (preg_match('/^data:image\/[a-zA-Z0-9.+-]+;base64,/', $path) === 1) {
            return $path;
        }

        foreach ($this->imagePathCandidates($path) as $candidate) {
            $resolved = realpath($candidate);
            if ($resolved !== false && is_file($resolved)) {
                return str_replace('\\', '/', $resolved);
            }
        }

        return null;
    }

    private function isMissingImagePath(string $path): bool
    {
        $value = strtolower(trim($path));
        return in_array($value, ['', 'undefined', 'null', 'false', '#'], true);
    }

    /**
     * @param array<string, mixed> $element
     * @return array{left: float, top: float, width: float, height: float}
     */
    private function elementFrame(array $element, TemplateLayout $layout, float $paddingX = 0.0, float $paddingY = 0.0): array
    {
        $left = max(0.0, (float) ($element['x'] ?? 0) + $paddingX);
        $top = max(0.0, (float) ($element['y'] ?? 0) + $paddingY);
        $width = max(1.0, (float) ($element['width'] ?? 1) - ($paddingX * 2));
        $height = max(1.0, (float) ($element['height'] ?? 1) - ($paddingY * 2));

        return [
            'left' => $left,
            'top' => $top,
            'width' => min($width, max(1.0, $layout->width() - $left)),
            'height' => min($height, max(1.0, $layout->height() - $top)),
        ];
    }

    /**
     * @param array<string, mixed> $element
     * @return array{left: float, top: float, width: float, height: float}
     */
    private function singleLineTextFrame(array $element, TemplateLayout $layout, string $value, float $paddingX, float $paddingY): array
    {
        $frame = $this->elementFrame($element, $layout, $paddingX, $paddingY);
        $text = trim($value);
        if ($text === '') {
            return $frame;
        }

        $fontSizeMm = max(1.0, ((float) ($element['fontSize'] ?? 18)) * 0.264583);
        $characters = function_exists('mb_strlen') ? max(1, mb_strlen($text, 'UTF-8')) : max(1, strlen($text));
        $estimatedWidth = min($layout->width(), max($frame['width'], $characters * $fontSizeMm * 0.58));
        if ($estimatedWidth <= $frame['width']) {
            return $frame;
        }

        $alignValue = (string) ($element['align'] ?? 'left');
        $align = in_array($alignValue, ['left', 'right', 'center'], true) ? $alignValue : 'left';
        $left = match ($align) {
            'center' => $frame['left'] + ($frame['width'] / 2) - ($estimatedWidth / 2),
            'right' => $frame['left'] + $frame['width'] - $estimatedWidth,
            default => $frame['left'],
        };
        $left = min(max(0.0, $left), max(0.0, $layout->width() - $estimatedWidth));

        return [
            'left' => $left,
            'top' => $frame['top'],
            'width' => min($estimatedWidth, max(1.0, $layout->width() - $left)),
            'height' => $frame['height'],
        ];
    }

    /**
     * @return list<string>
     */
    private function imagePathCandidates(string $path): array
    {
        if ($this->isMissingImagePath($path) || preg_match('/^data:/', $path) === 1) {
            return [];
        }

        $candidates = [$path];
        if (!preg_match('/^[A-Za-z]:[\\\\\\/]/', $path) && !str_starts_with($path, '/')) {
            $relativePath = str_replace('/', DIRECTORY_SEPARATOR, $path);
            $candidates[] = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . $relativePath;
            $candidates[] = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . $relativePath;
        }

        return $candidates;
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
