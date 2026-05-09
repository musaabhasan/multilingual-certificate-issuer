# Certificate Correction And Reissue Workflow

Use this workflow when a certificate must be corrected, re-rendered, reissued, or replaced after delivery. It separates routine text corrections from integrity-impacting changes that require revocation, token rotation, new hash manifests, recipient notification, or audit escalation.

## Workflow Header

| Field | Value |
| --- | --- |
| Case ID |  |
| Certificate number |  |
| Batch ID |  |
| Recipient |  |
| Correction type | Typographical / name / date / program / issuer / template / QR / revocation replacement |
| Requested by |  |
| Approved by |  |
| Review date |  |
| Evidence reference |  |

## 1. Intake And Classification

| Question | Decision |
| --- | --- |
| Is the request from the recipient, program owner, issuer, support, or audit team? |  |
| Is the change administrative, factual, design-related, or security-related? |  |
| Does the correction affect certificate validity or only presentation? |  |
| Does the correction require a new certificate number? |  |
| Does the old certificate need to be revoked, superseded, or left valid? |  |
| Does the verification token or QR link need rotation? |  |
| Does the recipient CSV or source-of-truth record need correction? |  |

## 2. Correction Severity

| Severity | Examples | Required controls |
| --- | --- | --- |
| Minor presentation correction | Spacing, typography, alignment, non-substantive layout issue | Template owner approval and re-render evidence |
| Recipient detail correction | Name spelling, email correction, title, affiliation | Data owner approval, source-of-truth check, re-render, updated hash |
| Award or program correction | Program name, completion date, level, score, issuer | Program owner approval, old certificate status decision, recipient notice |
| Integrity correction | Duplicate certificate number, wrong recipient, unauthorized issuance | Revocation review, replacement link, token rotation, incident or audit evidence |
| Security correction | Exposed token, unsafe QR link, incorrect public metadata | Token rotation, verification receipt testing, abuse monitoring review |

## 3. Pre-Reissue Checks

| Check | Evidence | Owner | Status |
| --- | --- | --- | --- |
| Requester identity and authority are confirmed | Support or approval record |  |  |
| Corrected data is verified against source of truth | Program or records evidence |  |  |
| Existing certificate status is reviewed | Verification or revocation record |  |  |
| Collision audit is rerun for changed identifiers | Collision audit result |  |  |
| Template and asset status are still approved | Template asset integrity result |  |  |
| Data minimization remains valid after correction | Recipient data audit result |  |  |
| Delivery suppression is checked before resending | Suppression check |  |  |

## 4. Reissue Procedure

| Step | Action | Evidence |
| --- | --- | --- |
| Freeze current case | Prevent parallel edits to the certificate record | Case note |
| Apply approved correction | Update only the approved fields | Change record |
| Re-render PDF | Generate corrected PDF using approved template | Render log |
| Compare hashes | Record old and new PDF SHA-256 values | Hash manifest diff |
| Decide old certificate status | Keep valid, mark superseded, or revoke | Status decision |
| Rotate verification token if needed | Generate new lookup token and QR link | Token rotation record |
| Generate receipt | Produce lookup receipt for corrected certificate | Receipt hash |
| Queue delivery | Send corrected certificate with controlled messaging | Queue evidence |
| Archive evidence | Store correction approval, render, hash, token, and delivery evidence | Evidence package |

## 5. Recipient And Stakeholder Communication

| Audience | Message requirements |
| --- | --- |
| Recipient | Explain correction, replacement link or attachment, and whether prior certificate should be discarded. |
| Program owner | Provide old/new certificate number, corrected fields, and status decision. |
| Support team | Provide safe metadata only, using the support-case redaction guide. |
| Verification users | Public lookup should show safe current status without exposing private correction detail. |
| Audit or records team | Provide approval, hash manifest, revocation or supersession evidence, and delivery result. |

## 6. Validation

| Test | Expected result | Evidence |
| --- | --- | --- |
| Corrected PDF opens and renders bilingual text correctly | Arabic/English layout remains correct |  |
| Certificate number lookup returns intended status | Valid, superseded, or revoked as approved |  |
| Old token behavior matches decision | Accepted, rejected, redirected, or rotated |  |
| New verification receipt is canonical and hashable | Receipt hash generated |  |
| Hash manifest explains old and new PDFs | Manifest diff stored |  |
| Delivery queue respects suppression and throttle | Queue row and delivery status recorded |  |
| Support evidence is redacted | Redaction checklist complete |  |

## 7. Closure Record

| Item | Status | Evidence reference |
| --- | --- | --- |
| Correction approved |  |  |
| Corrected data verified |  |  |
| PDF re-rendered |  |  |
| Hash manifest updated |  |  |
| Old certificate status recorded |  |  |
| Verification token decision completed |  |  |
| Corrected certificate delivered or made available |  |  |
| Support and audit evidence redacted |  |  |
| Follow-up dispute window set |  |  |

## Escalation Triggers

Escalate to security, privacy, legal, or executive review when a correction involves unauthorized issuance, suspected fraud, exposed tokens, public misinformation, sensitive recipient data, repeated batch defects, legal dispute, or records that cannot be reconciled with the source of truth.
