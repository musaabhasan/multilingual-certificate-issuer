# Certificate Template Asset Integrity Audit

Certificate templates depend on high-resolution backgrounds, fonts, seals, signatures, and QR overlays. If one asset changes after approval, the rendered certificate can become visually inconsistent, unverifiable, or legally difficult to defend.

The template asset integrity audit checks an approved manifest before a batch is released.

## What It Checks

- Expected and observed SHA-256 hashes are present and valid.
- Observed asset hashes match the approved template manifest.
- Required assets are embedded in the rendered PDF evidence path.
- High-resolution assets meet the 300 DPI review target.
- Required fonts are embedded.
- Arabic templates include an embedded RTL-capable font.
- License or usage-rights references are recorded.
- Asset review status is approved or approved with controls.

## Run The Audit

```bash
php bin/template-asset-audit-demo.php examples/template-asset-manifest-sample.json
```

The demo exits with `1` when high-severity integrity findings are present. Use this as a pre-render or pre-send gate alongside the batch release gate.

## Manifest Fields

Each asset should include:

- `asset_id`
- `type`
- `filename`
- `expected_sha256`
- `observed_sha256`
- `mime_type`
- `required`
- `embedded`
- `dpi`
- `width_px`
- `height_px`
- `license_reference`
- `rtl_capable`
- `review_status`

## Recommended Workflow

1. Hash every template asset when the template is approved.
2. Store the manifest with the template version and approval record.
3. Recompute observed hashes immediately before batch rendering.
4. Block release if a required asset is missing, mismatched, unapproved, or not embedded.
5. Store the audit report with the batch hash manifest and delivery release evidence.

## Review Questions

- Did any asset change after design approval?
- Can support teams prove which background, font, signature, seal, and QR overlay were used for a given certificate batch?
- Are Arabic ligatures and mixed RTL/LTR text supported by an embedded font?
- Are externally sourced fonts, icons, and signature scans licensed for credential issuance?
- Does the PDF/A renderer embed all assets needed for long-term verification?
