# Bilingual PDF Rendering QA Workflow

This workflow verifies that Arabic/English certificates are visually correct, searchable, verifiable, accessible, and audit-ready before bulk generation or SMTP distribution. Use it after template approval, font changes, background asset updates, renderer upgrades, CSV schema changes, or reissue events.

## Release Gate Summary

| Gate | Required Evidence | Release Decision |
| --- | --- | --- |
| Font readiness | Font manifest, license record, embedding test, Arabic shaping sample | Block if missing or substituted |
| Layout accuracy | Rendered proof pages, coordinate overlay, safe-zone screenshot | Block for clipping, overlap, or incorrect placement |
| RTL/LTR behavior | Arabic, English, mixed-name, numeric, and punctuation samples | Block for broken shaping or reversed semantic order |
| PDF/A and metadata | Renderer output profile, document metadata, embedded fonts, stable hashes | Block for missing embedded fonts or non-deterministic output |
| QR and verification | QR scan result, token format, lookup response, revoked/reissued state | Block for unreadable, clipped, or stale verification links |
| Accessibility | Text extract, reading order sample, contrast check, language metadata | Block for unreadable text or inaccessible critical fields |
| Evidence retention | Proof set, batch manifest, approval record, renderer version, asset hashes | Block when approval evidence cannot be reproduced |

## 1. QA Inputs

| Input | Owner | Evidence Location | Status |
| --- | --- | --- | --- |
| Approved certificate template JSON |  |  | Ready / gap |
| Background image and asset manifest |  |  | Ready / gap |
| Arabic and Latin font files |  |  | Ready / gap |
| Sample CSV with edge cases |  |  | Ready / gap |
| Renderer version and configuration |  |  | Ready / gap |
| Verification URL and QR token policy |  |  | Ready / gap |
| Batch release gate output |  |  | Ready / gap |

Minimum sample CSV rows:

- Arabic-only recipient name.
- English-only recipient name.
- Mixed Arabic/English name.
- Long Arabic name with spaces.
- Long English name.
- Name with numerals and punctuation.
- Right-to-left title with left-to-right certificate number.
- Recipient with diacritics.
- Reissued certificate with replacement number.
- Revoked certificate excluded from active delivery.

## 2. Font and Text Rendering Checks

| Check | Expected Result | Evidence |
| --- | --- | --- |
| Arabic shaping | Letters join correctly and ligatures render in the approved font | Screenshot and extracted text |
| Direction handling | Arabic fields use RTL and English fields use LTR without reversing numbers | Proof render |
| Mixed text | Arabic name with English acronym or certificate number remains readable | Proof render |
| Font embedding | PDF includes approved Arabic and Latin fonts without fallback substitution | PDF inspection output |
| Searchable text | Recipient name, certificate number, date, and issuer text can be extracted | Text extraction sample |
| Diacritic handling | Diacritics do not collide with adjacent text or exceed bounding boxes | Proof render |
| Color contrast | Foreground text remains readable against the background in print and screen view | Contrast check |

Blocking findings:

- Arabic text appears disconnected, reversed, or substituted with boxes.
- Certificate numbers or dates move to the wrong side of the Arabic line.
- Renderer silently falls back to an unapproved font.
- Critical fields are flattened into an unreadable image when searchable text is required.

## 3. Coordinate, Safe-Zone, and Asset Checks

| Area | Test | Pass Criteria |
| --- | --- | --- |
| Background | Confirm DPI, dimensions, orientation, and hash match the approved manifest | Rendered PDF aligns with template canvas |
| Text boxes | Overlay X/Y coordinates on proof render | No clipping, overlap, or field drift |
| Margins | Review print and screen safe zones | No critical content near bleed/crop edges |
| Signatures and seals | Confirm asset hashes and placement | No distortion, opacity loss, or scaling artifacts |
| QR code | Scan from screen and printed proof | Verification route opens and returns expected metadata |
| Long values | Render longest expected names and titles | Text wraps or scales according to the approved template rule |
| Reissue label | Render corrected/reissued status where applicable | Status label and replacement reference are visible |

## 4. PDF/A, Hash, and Verification Checks

| Check | Expected Result | Evidence |
| --- | --- | --- |
| PDF/A profile | Output matches the selected archival profile | Validator output |
| Metadata | Title, issuer, language, creation date, and template version are populated | PDF properties screenshot or export |
| Deterministic rendering | Re-rendering the same input produces the same content hash when timestamps are controlled | Hash comparison |
| Hash manifest | Each PDF hash is included in the batch manifest | Manifest reference |
| Verification link | QR and visible certificate number resolve to active certificate metadata | Lookup receipt |
| Revocation state | Revoked and superseded certificates do not validate as active | Lookup receipt |
| Token rotation | Reissued certificates receive updated verification tokens where policy requires it | Rotation record |

## 5. Accessibility and Recipient Experience

| Review Item | Expected Result | Notes |
| --- | --- | --- |
| Reading order | Extracted text follows a reasonable sequence for assistive tools |  |
| Language metadata | Arabic and English content are identified where supported by renderer configuration |  |
| Visual hierarchy | Recipient name, program title, issuer, date, and verification data are easy to scan |  |
| Mobile verification | QR code scans on common mobile devices under normal lighting |  |
| Email attachment name | Filename is meaningful, safe, and does not expose excessive personal data |  |
| File size | PDF remains suitable for email delivery and institutional archiving |  |

## 6. Batch QA Procedure

1. Export the approved template JSON and asset manifest.
2. Render the edge-case CSV as a proof batch.
3. Compare proof PDFs against the visual canvas and safe-zone overlay.
4. Inspect embedded fonts and text extraction for Arabic, English, mixed, numeric, and punctuation samples.
5. Scan every QR code in the proof batch and save verification receipts.
6. Run PDF/A and metadata validation for at least one certificate per template variant.
7. Generate the hash manifest and confirm the manifest references the rendered proof files.
8. Record findings, owner, severity, remediation, and retest evidence.
9. Attach QA evidence to the batch approval record before queue release.

## 7. Finding Classification

| Severity | Examples | Required Action |
| --- | --- | --- |
| Critical | Wrong recipient, wrong certificate number, invalid QR, confidential data exposed, unapproved font substitution | Stop release and regenerate proof batch |
| High | Arabic shaping failure, clipped name, unreadable verification area, missing PDF/A evidence, hash mismatch | Hold release until corrected and retested |
| Medium | Minor spacing issue, weak contrast in noncritical text, missing screenshot evidence | Correct before large batch or document acceptance |
| Low | Cosmetic issue with no data, readability, verification, or compliance impact | Track for next template improvement |

## 8. Approval Record

| Field | Response |
| --- | --- |
| Template ID and version |  |
| Batch or proof ID |  |
| Renderer version |  |
| Font package and version |  |
| Asset manifest hash |  |
| Proof batch hash manifest |  |
| QA reviewer |  |
| Approval decision | Approve / approve with conditions / hold |
| Conditions or remediation |  |
| Next review trigger | Template change / renderer change / font change / asset change / policy change |

## 9. Evidence Retention

Retain the following with the batch evidence package:

- approved template JSON,
- source sample CSV or redacted proof CSV,
- rendered proof PDFs,
- screenshots of Arabic, English, and mixed-text cases,
- font embedding or PDF/A validation output,
- QR scan receipts,
- batch hash manifest,
- finding log and retest evidence,
- approval record and reviewer identity.

Do not retain full recipient CSV files longer than the approved retention schedule requires. Use redacted proof datasets for long-term QA evidence whenever possible.
