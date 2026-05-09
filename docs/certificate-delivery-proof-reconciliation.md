# Certificate Delivery Proof Reconciliation Workflow

This workflow reconciles generated certificate evidence with SMTP delivery evidence before a batch is closed, audited, or used to resolve a recipient dispute. It is intended for high-volume bilingual certificate campaigns where administrators must prove whether a PDF was generated, queued, transmitted, bounced, suppressed, reissued, or corrected.

## Objectives

- Tie each delivery claim to a certificate number, recipient row, PDF hash, queue record, SMTP response, and verification state.
- Separate successful delivery from accepted-for-delivery SMTP responses, deferred messages, bounces, complaints, and manual suppression.
- Preserve enough evidence to investigate disputes without exposing unnecessary recipient data.
- Identify certificates that require resend, reissue, revocation, correction, or support escalation.
- Close the batch with a defensible exception register and owner-assigned remediation actions.

## Required Inputs

| Evidence Source | Required Fields |
| --- | --- |
| Batch approval record | Batch ID, approver, approved template version, approved CSV hash, scheduled send window |
| Certificate manifest | Certificate number, recipient reference, PDF SHA-256, template hash, generated timestamp |
| Queue table | Queue ID, recipient reference, status, attempts, scheduled_at, sent_at, message_id, error code |
| SMTP provider log | Message ID, envelope sender, recipient, accepted timestamp, delivery event, bounce code, complaint flag |
| Suppression records | Hashed email, suppression reason, source event, release approval, expiry where applicable |
| Verification ledger | Token hash, certificate status, revocation or supersession state, lookup receipts |
| Support cases | Recipient dispute, address correction, resend request, complaint, or data correction reference |

## Reconciliation Steps

### 1. Establish Batch Scope

1. Confirm the batch ID, template version, CSV source hash, and generation window.
2. Freeze the reconciliation snapshot time so repeated reviews use the same evidence boundary.
3. Count source recipient rows, generated PDF records, hash-manifest entries, queue rows, and SMTP message IDs.
4. Record any known exclusions, such as test recipients, withdrawn rows, duplicate recipients, or manual holds.

### 2. Match Certificate Evidence to Queue Evidence

| Check | Expected Result | Escalation |
| --- | --- | --- |
| Every approved recipient has a certificate record or documented exclusion | No orphan approved rows | Batch owner |
| Every generated PDF appears in the hash manifest | No unmanifested PDF | Security or audit owner |
| Every queued message maps to one generated PDF hash | No queue rows without render evidence | Operations owner |
| Every message ID is unique within the batch | No reused or missing message IDs | Mail administrator |
| Every reissued certificate references the superseded certificate | Clear lifecycle chain | Certificate owner |

### 3. Classify Delivery Outcomes

Use consistent delivery classes so reports do not overstate success.

| Class | Meaning | Typical Evidence |
| --- | --- | --- |
| Delivered | Provider reports final delivery or internal SMTP relay confirms downstream delivery | Delivered event, message ID, timestamp |
| Accepted | SMTP server accepted the message but final mailbox delivery is not confirmed | `250` response, message ID |
| Deferred | Provider or receiving server temporarily delayed delivery | `4xx` code, retry schedule |
| Bounced | Delivery failed permanently | `5xx` code, bounce reason |
| Suppressed | Message was not sent because suppression controls blocked it | Suppression list match |
| Held | Message was not sent because an operator, policy, or approval gate held it | Manual hold or release record |
| Disputed | Recipient reports non-receipt, wrong recipient, wrong data, or suspected misuse | Support case |
| Reissued | Original certificate was corrected, revoked, superseded, or replaced | Reissue record and replacement hash |

### 4. Resolve Evidence Gaps

| Gap | Investigation Path | Closure Requirement |
| --- | --- | --- |
| Generated PDF without queue row | Check batch filters, suppression rules, queue creation logs | Document exclusion or create corrected queue item |
| Queue row without PDF hash | Check render failure, storage path, manifest rebuild | Regenerate or mark failed with owner approval |
| SMTP accepted but no provider event | Wait for provider event window, check relay logs, verify message ID | Classify as accepted, not delivered |
| Bounce without suppression update | Confirm bounce parser and suppression policy | Add suppression evidence before resend |
| Complaint without batch lock | Freeze further sends to the address and review abuse controls | Record complaint handling and release decision |
| Recipient dispute without verification receipt | Export safe receipt or support evidence package | Attach redacted receipt to case |
| Reissue without revocation or supersession | Review correction severity and verification impact | Update ledger and notify recipient if required |

### 5. Recipient Dispute Handling

For non-receipt, wrong-recipient, incorrect-name, or duplicate-certificate disputes:

1. Verify the requester using a support-approved identity check.
2. Locate the certificate number, message ID, queue record, verification token status, and current certificate state.
3. Determine whether the issue is delivery-only, data-quality, template-rendering, or verification-state related.
4. Redact unrelated recipients, raw CSV exports, SMTP credentials, and private verification tokens from the support package.
5. Decide one of: resend same PDF, reissue corrected PDF, revoke, suppress future sends, or close as delivered/accepted with evidence.
6. Attach closure evidence to the support case and batch exception register.

## Exception Register

| Field | Description |
| --- | --- |
| Exception ID | Stable ID for the reconciliation issue |
| Batch ID | Certificate batch under review |
| Certificate number | Affected certificate or range |
| Recipient reference | Internal reference, not raw personal data when avoidable |
| Exception type | Missing render, missing queue, bounce, complaint, dispute, reissue, suppression, verification mismatch |
| Severity | Low / medium / high / critical |
| Owner | Person responsible for closure |
| Evidence location | Manifest, SMTP event, support case, queue row, receipt, revocation ledger |
| Decision | Resend / reissue / revoke / suppress / accept residual risk / no action |
| Closure date | Date and reviewer |

## Batch Closure Criteria

A batch can be closed only when:

- source row count, generated PDF count, manifest count, and queue count are reconciled or documented as exceptions;
- all hard bounces, complaints, and manual holds have suppression evidence;
- disputed certificates have a support-case decision and safe evidence package;
- reissued certificates have updated hash, verification, revocation, or supersession evidence;
- any accepted-but-not-confirmed messages are labelled accurately;
- the batch owner signs the exception register and retention schedule.

## Metrics

| Metric | Why It Matters |
| --- | --- |
| Generated-to-queued match rate | Detects missing delivery records or unintended exclusions |
| Queue-to-message-ID match rate | Confirms SMTP handoff traceability |
| Delivered, accepted, deferred, bounced, suppressed, and disputed counts | Prevents inflated delivery claims |
| Average dispute resolution time | Measures support quality |
| Reissue rate by template and source CSV | Reveals data or rendering quality problems |
| Bounce and complaint rate by domain | Supports sender reputation and abuse prevention |
| Missing evidence rate | Shows audit readiness before retention decisions |

## Privacy And Retention Notes

- Store recipient email addresses as hashes in reconciliation exports unless raw addresses are required for delivery support.
- Keep raw CSV files, SMTP logs, PDF files, receipts, and support packages under the approved batch retention schedule.
- Do not send raw SMTP logs, private verification tokens, or full CSV files to recipients.
- Preserve legal-hold records before deleting delivery evidence.
- Record who exported, viewed, or shared reconciliation evidence.
