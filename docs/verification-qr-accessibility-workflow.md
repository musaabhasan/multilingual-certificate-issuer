# Verification QR Accessibility Workflow

Digital certificates are only useful when recipients, employers, auditors, and support teams can verify them reliably. This workflow checks whether QR codes, visible verification text, public lookup pages, revocation states, and support evidence remain accessible across printed certificates, mobile scanning, screen readers, email clients, and archived PDFs.

## Release Objectives

- Ensure QR codes scan from screen and print.
- Provide a visible fallback verification URL and certificate number.
- Keep verification usable for Arabic and English certificate layouts.
- Avoid exposing private recipient data through public verification.
- Confirm revoked, reissued, expired, and superseded certificates produce clear lookup outcomes.
- Preserve evidence for support cases and audit reviews.

## Required Verification Elements

| Element | Minimum Requirement | Evidence |
| --- | --- | --- |
| QR code | Points to HTTPS verification route with a non-guessable token | Scan receipt |
| Visible certificate number | Printed near QR or verification area | Proof render |
| Visible verification URL | Short, readable, and manually typeable | Proof render |
| Token policy | Random, rotated on reissue where required, and stored hashed | Token record |
| Public response | Shows only safe metadata needed to confirm validity | Lookup receipt |
| Revocation response | Distinguishes revoked, superseded, expired, and invalid states | Lookup receipt |
| Support reference | Enables helpdesk lookup without exposing raw recipient CSV data | Support guide |

## QR Design Checks

| Check | Pass Criteria |
| --- | --- |
| Size | QR remains scannable on the smallest intended certificate format |
| Quiet zone | Sufficient white space surrounds the QR code |
| Contrast | Dark foreground and light background meet scanner expectations |
| Placement | QR does not overlap seal, signature, background texture, fold line, or crop edge |
| Distortion | QR is not stretched, skewed, compressed, or filtered |
| Resolution | Export keeps enough pixels for print and screen scanning |
| Branding | Decorative styling does not reduce scanner reliability |

Test with:

- at least two phone camera applications,
- printed proof under normal lighting,
- PDF opened on desktop,
- PDF opened on mobile,
- email attachment preview where supported.

## Accessibility Checks

| Area | Expected Result | Notes |
| --- | --- | --- |
| Fallback text | Certificate number and verification URL are readable without scanning the QR code |  |
| Text extraction | PDF text extraction includes certificate number and verification URL |  |
| Reading order | Verification area appears in a reasonable reading sequence |  |
| Language context | Arabic and English layouts keep verification text understandable |  |
| Color contrast | Verification text is readable against the background |  |
| Link target | Digital PDF link target matches the QR destination where links are embedded |  |
| Support path | Recipient can contact support when QR scanning fails |  |

QR codes should not be the only verification mechanism. A printed credential must remain verifiable when a scanner is unavailable, the QR is damaged, or assistive technology cannot interpret the code.

## Public Lookup Privacy Rules

| Data Item | Public Response Guidance |
| --- | --- |
| Certificate status | Show active, revoked, superseded, expired, or not found |
| Recipient name | Show only if approved by policy and expected by credential purpose |
| Program title | Safe when needed to verify credential context |
| Issue date | Safe when needed for verification |
| Expiry date | Safe when credential has a validity period |
| Email, phone, national ID, internal ID | Do not show |
| Raw CSV fields | Do not show |
| Support notes | Do not show |
| Audit metadata | Do not show except safe receipt reference |

## State Transition Tests

| Scenario | Expected Lookup Result | Evidence |
| --- | --- | --- |
| Active certificate | Valid status with safe credential metadata | Receipt |
| Revoked certificate | Revoked status and safe reason category, if policy allows | Receipt |
| Reissued certificate | Superseded status with replacement guidance or support route | Receipt |
| Expired certificate | Expired status with issue and expiry context | Receipt |
| Rotated token | Old token rejected or routed according to policy | Receipt |
| Invalid token | Generic invalid response without enumeration detail | Receipt |
| Rate-limited lookup | Safe error response and audit event | Log reference |

## Batch Test Procedure

1. Render a proof batch with Arabic, English, and mixed-language certificate examples.
2. Scan every QR code in the proof batch and save verification receipts.
3. Manually type the visible verification URL and certificate number for at least one sample per template.
4. Test active, revoked, reissued, expired, invalid, and rotated-token states.
5. Confirm public lookup responses expose only approved metadata.
6. Extract PDF text and confirm verification fallback text is present.
7. Print at the smallest expected size and rescan under normal lighting.
8. Record findings, owner, remediation, and retest evidence.

## Findings

| Severity | Examples | Required Action |
| --- | --- | --- |
| Critical | QR resolves to wrong certificate, exposes private data, or validates revoked credential as active | Stop release and fix before distribution |
| High | QR unreadable, token predictable, visible fallback missing, or invalid token leaks enumeration details | Hold release until corrected |
| Medium | Weak contrast, difficult manual URL entry, incomplete receipt evidence, or support path unclear | Correct before high-volume batch |
| Low | Minor wording, alignment, or nonblocking layout issue | Track for next template update |

## Approval Record

| Field | Response |
| --- | --- |
| Template ID and version |  |
| Verification route version |  |
| Token policy version |  |
| Proof batch ID |  |
| QR scan evidence location |  |
| Accessibility evidence location |  |
| Public lookup privacy review | Pass / gap |
| Revocation and reissue state test | Pass / gap |
| Approval decision | Approve / approve with conditions / hold |
| Reviewer |  |

## Evidence Retention

Retain QR scan receipts, proof PDFs, text extraction samples, public lookup receipts, revocation or reissue test results, and reviewer approval with the batch evidence package. Redact private recipient data from shared QA summaries unless full records are required for an authorized audit.
