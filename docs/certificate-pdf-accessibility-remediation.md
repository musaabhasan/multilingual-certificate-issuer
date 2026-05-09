# Certificate PDF Accessibility Remediation Workflow

This workflow defines how generated certificate PDFs should be reviewed and remediated when accessibility issues are found. It applies to bilingual Arabic/English certificates, QR verification layouts, public verification fallback text, PDF/A exports, screen-reader behavior, printed certificates, and support evidence packages.

## Objectives

- Make digital certificates usable by recipients, employers, auditors, and verifiers who rely on assistive technology.
- Preserve bilingual Arabic/English readability, language metadata, and reading order.
- Ensure QR verification has visible fallback text and does not become the only verification path.
- Record remediation evidence before a batch is released, reissued, or archived.
- Avoid layout changes that invalidate certificate hashes without updating manifests and verification state.

## Accessibility Review Areas

| Area | Review Question | Evidence |
| --- | --- | --- |
| Reading order | Does assistive technology read certificate title, recipient name, credential, date, issuer, and verification text in the correct sequence? | Tagged PDF or manual QA notes |
| Language metadata | Are Arabic and English text runs marked or rendered in a way that preserves expected pronunciation and direction? | PDF metadata and proof output |
| Font embedding | Are Arabic and English fonts embedded and readable across viewers? | PDF properties and rendered proof |
| Contrast | Do text, seal, signature, and verification elements meet usable contrast? | Contrast check or visual QA |
| QR fallback | Is a visible certificate number or verification URL/code available when QR scanning fails? | Layout proof |
| Alternative text | Do meaningful images, seals, or QR elements have text equivalents where supported? | Tagged structure or support note |
| Zoom and reflow | Does the certificate remain readable at common zoom levels? | Viewer screenshots |
| Print usability | Is fallback verification text visible after printing or photocopying? | Print proof |

## Remediation Triggers

Remediate before release when:

- Arabic text is visually correct but read in the wrong order;
- English and Arabic fields overlap or become unreadable at normal zoom;
- QR code is present without visible fallback verification text;
- certificate number, issue date, issuer, or recipient name is not exposed in a usable order;
- signature, seal, or background reduces text contrast;
- PDF/A export strips embedded fonts or language metadata;
- accessibility remediation changes the visual layout or PDF hash;
- support teams cannot provide a non-QR verification route.

## Remediation Steps

### 1. Freeze The Batch

1. Hold delivery queue rows for the affected batch.
2. Record the batch ID, template version, layout hash, sample certificate numbers, and PDF hashes.
3. Identify whether the issue affects all certificates or only specific languages, names, templates, or background assets.

### 2. Correct Template Structure

| Issue | Remediation |
| --- | --- |
| Wrong reading order | Reorder template elements by semantic sequence, not only visual layering |
| Mixed RTL/LTR confusion | Set field direction explicitly and test Arabic names, English names, and mixed identifiers |
| Font substitution | Embed approved Arabic and Latin fonts and verify PDF/A export |
| Poor contrast | Adjust text color, shadow, background, or safe text zone |
| QR-only verification | Add visible certificate number, verification URL, or short fallback code |
| Overlapping elements | Adjust bounds and test longest expected names in both languages |

### 3. Re-render And Reconcile Evidence

If remediation changes the PDF:

- create new PDF hashes;
- update the batch hash manifest;
- update verification receipts where needed;
- decide whether prior files are revoked, superseded, or never released;
- record old and new template versions;
- attach before/after proof images or PDFs to the remediation record.

### 4. Support And Verification Updates

Support teams should receive:

- safe public verification metadata;
- fallback verification instructions;
- redaction rules for sharing certificate evidence;
- a list of affected certificate numbers or batch IDs;
- instructions for reissue, resend, or revocation when needed.

## Bilingual Test Set

Use a proof set that includes:

- short Arabic name;
- long Arabic name;
- short English name;
- long English name;
- mixed Arabic/English credential title;
- certificate number with Latin digits;
- date in configured format;
- QR plus fallback verification text;
- names with diacritics or punctuation where applicable.

## Remediation Evidence Record

| Field | Required Detail |
| --- | --- |
| Remediation ID | Stable issue or support reference |
| Batch ID | Affected certificate batch |
| Template version before and after | Layout or asset version references |
| Issue type | Reading order, RTL/LTR, contrast, font, QR fallback, overlap, metadata, print |
| Affected certificates | Certificate numbers or selection criteria |
| New PDF hash evidence | Manifest or receipt reference |
| Reviewer | Accessibility, operations, or QA owner |
| Release decision | Release / re-render / reissue / revoke / hold |
| Closure date | Date and approver |

## Metrics

| Metric | Purpose |
| --- | --- |
| Accessibility defects per template | Detects recurring layout problems |
| Re-render rate after accessibility QA | Measures late-stage correction burden |
| QR fallback missing count | Tracks verification usability risk |
| Arabic rendering defects | Monitors bilingual quality |
| Hash-manifest updates after remediation | Shows evidence reconciliation impact |
| Support cases related to verification usability | Reveals recipient or verifier friction |

## Closure Criteria

A remediated certificate batch is ready when reading order, bilingual rendering, font embedding, contrast, QR fallback, print proof, hash manifest, verification state, and support instructions are all reviewed and recorded.
