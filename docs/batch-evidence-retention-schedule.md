# Certificate Batch Evidence Retention Schedule

Use this schedule to define how long issuance evidence is retained after a certificate batch is rendered, approved, delivered, corrected, revoked, or archived. It balances auditability, recipient privacy, storage cost, and the need to prove certificate integrity over time.

## Schedule Header

| Field | Value |
| --- | --- |
| Batch ID or campaign |  |
| Program or event |  |
| Data owner |  |
| Evidence owner |  |
| Delivery owner |  |
| Retention policy reference |  |
| Legal hold active? | Yes / No |
| Last reviewed |  |
| Next review due |  |

## Evidence Retention Matrix

| Evidence category | Examples | Suggested retention | Owner | Storage expectation | Deletion trigger |
| --- | --- | --- | --- | --- | --- |
| Batch approval | Approval record, release gate output, approver notes | 3 years | Program owner | Controlled evidence folder or ticket | Audit window closed |
| Recipient CSV | Uploaded CSV, normalized import copy, mapping preview | Shortest approved period, often 30 to 180 days | Data owner | Encrypted private storage | Batch delivered and disputes window closed |
| Data minimization audit | Field dictionary, sensitivity flags, retention decision | 3 years | Privacy owner | Evidence folder with restricted access | Audit window closed |
| Collision audit | Duplicate identifier findings, resolution notes | 3 years | Certificate operations | Evidence folder or ticket | Audit window closed |
| Template layout | Approved JSON layout, text positions, RTL/LTR settings | Life of template plus 3 years | Template owner | Versioned template repository | Template retired and audit window closed |
| Template asset manifest | Background/font/seal/signature/QR hashes and approvals | Life of template plus 3 years | Template owner | Versioned evidence repository | Template retired and audit window closed |
| Rendered PDFs | Final certificate PDFs | Per institutional credential policy | Program owner | Private object storage, not public web root | Retention met or certificate reissued |
| Hash manifest | Per-PDF hashes and manifest hash | Life of certificate plus 3 years | Security or records owner | Immutable evidence archive | Certificate retention met |
| SMTP delivery evidence | Queue rows, delivery status, bounce/complaint records, throttle settings | 1 to 3 years | Delivery owner | Mail evidence repository | Disputes window and audit period closed |
| Verification receipts | Public lookup receipts and support-case receipts | 1 to 3 years | Support owner | Support evidence system | Case closed and retention met |
| Revocation evidence | Revocation reason, authority, replacement link, timestamp order | Life of certificate plus 3 years | Records owner | Revocation ledger evidence | Certificate retention met |
| Administrative audit logs | Authentication, template, SMTP, CSV, generation, delivery actions | 1 to 3 years or policy | Security owner | Central audit log store | Log retention met unless legal hold applies |

## Privacy And Redaction Rules

- Keep raw recipient data only as long as it is needed for delivery, correction, dispute handling, or legal retention.
- Store certificate numbers, hashes, status, and safe metadata separately from unnecessary personal fields.
- Do not retain CSV formulas, extra identifiers, or unused columns after import validation unless required for an approved evidence purpose.
- Redact email addresses, phone numbers, and internal notes before attaching evidence to broad support cases.
- Use hashed suppression records rather than retaining unnecessary bounce or complaint details in operational views.
- Apply legal hold before normal deletion when there is an investigation, complaint, audit, or dispute.

## Evidence Package Checklist

| Item | Included? | Evidence reference |
| --- | --- | --- |
| Batch release gate output |  |  |
| Recipient data minimization audit |  |  |
| Recipient collision audit |  |  |
| Template asset integrity audit |  |  |
| SMTP domain alignment audit |  |  |
| Suppression check summary |  |  |
| Queue and throttle summary |  |  |
| Hash manifest |  |  |
| Verification receipt sample |  |  |
| Revocation ledger audit, if applicable |  |  |
| Token rotation record, if applicable |  |  |
| Retention and deletion decision |  |  |

## Deletion Review

| Question | Decision |
| --- | --- |
| Is the batch fully delivered, failed, cancelled, or corrected? |  |
| Are recipient disputes or support cases still open? |  |
| Are revocations, replacements, or token rotations still pending? |  |
| Is any evidence under legal hold or audit request? |  |
| Can PDF hashes and safe metadata prove integrity without retaining full raw CSV? |  |
| Has deletion been approved by the data owner and evidence owner? |  |

## Closure Record

| Evidence category | Retention met? | Deleted, archived, or retained | Owner | Date | Reference |
| --- | --- | --- | --- | --- | --- |
| Recipient CSV |  |  |  |  |  |
| Rendered PDFs |  |  |  |  |  |
| Hash manifest |  |  |  |  |  |
| SMTP delivery evidence |  |  |  |  |  |
| Verification receipts |  |  |  |  |  |
| Revocation evidence |  |  |  |  |  |
| Administrative logs |  |  |  |  |  |

Review this schedule at least annually and after a major change to certificate retention, verification policy, SMTP provider, storage architecture, privacy notice, or dispute-handling process.
