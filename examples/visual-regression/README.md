# PDF Visual Regression Fixtures

This directory contains deterministic source fixtures for bilingual certificate proof renders. The fixture set exercises:

- Arabic-only text,
- English-only text,
- mixed Arabic/English acronyms and certificate numbers,
- long Arabic and English values,
- Arabic diacritics with punctuation and numerals.

Generate the local review PDFs and manifest with:

```bash
php bin/pdf-visual-regression-samples.php
```

The command writes PDFs, renderer HTML snapshots, and `pdf-visual-regression-manifest.json` to `storage/private/pdf-visual-regression/` by default. The output directory is intentionally ignored by Git because PDF metadata and embedded font subsets can vary by renderer environment. The tracked fixtures keep the source data, layout, output names, HTML snapshots, scenario order, and expected visual checks stable.
