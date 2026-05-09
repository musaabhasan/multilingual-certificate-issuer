# Certificate Support Case Redaction Guide

Use this guide before attaching certificate evidence to helpdesk tickets, recipient replies, audit samples, dispute investigations, or vendor support cases. It helps support teams share enough information to resolve the issue without exposing unnecessary recipient data, verification tokens, private links, or internal delivery evidence.

## Support Case Header

| Field | Value |
| --- | --- |
| Case ID |  |
| Case type | Verification / delivery / correction / revocation / duplicate / privacy / abuse |
| Certificate number |  |
| Batch ID |  |
| Support owner |  |
| Data owner consulted? | Yes / No |
| Redaction reviewer |  |
| Evidence attached |  |

## Evidence Sharing Rules

| Evidence item | Share with recipient? | Share with internal support? | Share with external vendor? | Redaction rule |
| --- | --- | --- | --- | --- |
| Certificate number | Yes | Yes | If required | Keep full value if needed for lookup. |
| Recipient name | Yes | Yes | Usually no | Share only the name relevant to the case. |
| Recipient email | Partial | Yes | Usually no | Mask local part unless delivery troubleshooting requires it. |
| Verification token or QR URL | No | Restricted | No | Never include raw token or full verification URL in broad tickets. |
| Verification receipt | Yes, if safe | Yes | Redacted only | Use receipt with safe public metadata and canonical hash. |
| PDF file | Case-by-case | Restricted | Redacted or hash only | Prefer hash or watermarked sample unless PDF is required. |
| Hash manifest | No | Yes | Redacted summary | Share manifest hash or affected row only. |
| SMTP headers | No | Restricted | Redacted only | Remove recipient address, message IDs, internal hosts, and auth traces. |
| Bounce or complaint evidence | Summary only | Restricted | Redacted only | Share reason category, not unnecessary mailbox detail. |
| Recipient CSV row | No | Restricted | No | Do not attach raw CSV rows unless explicitly approved. |
| Revocation reason | Case-by-case | Yes | Redacted only | Avoid sensitive disciplinary or administrative detail. |
| Audit log | No | Restricted | Redacted only | Remove admin identifiers unless required for investigation. |

## Standard Redaction Patterns

| Data type | Example handling |
| --- | --- |
| Email address | `m***@example.edu` or domain-only when mailbox detail is not required |
| Phone number | Last 2 to 4 digits only |
| Verification token | Replace with `[verification-token-redacted]` |
| QR URL | Keep route path only; remove token query or path segment |
| Internal hostname | Replace with service category, such as `[smtp-relay]` |
| Certificate PDF | Prefer SHA-256 hash, receipt, or cropped non-sensitive excerpt |
| CSV row | Replace with field dictionary and affected field names |
| Admin user | Use role or team unless identity is needed for audit |
| IP address | Truncate or replace with network category unless needed for abuse review |

## Case Type Guidance

### Verification Issues

Include:

- certificate number,
- verification receipt hash,
- lookup status,
- safe public metadata,
- timestamp of the failed or successful lookup.

Do not include raw verification token, full QR URL, private CSV fields, or unrelated recipient rows.

### Delivery Issues

Include:

- delivery status,
- bounce category,
- scheduled and attempted timestamps,
- suppression status,
- SMTP domain alignment summary.

Do not include full SMTP authentication details, internal hostnames, raw queue payloads, or other recipients from the batch.

### Correction Or Reissue

Include:

- certificate number,
- corrected field name,
- approval reference,
- old and new PDF hash if the document changed,
- replacement or revocation reference if applicable.

Do not include full raw CSV unless required and approved.

### Revocation Or Abuse

Include:

- status,
- authority,
- public-safe reason category,
- replacement link status,
- verification token rotation status,
- lookup abuse summary if relevant.

Do not include sensitive disciplinary details, raw lookup tokens, or unnecessary recipient identifiers.

## Redaction Review Checklist

| Check | Status |
| --- | --- |
| Raw verification tokens are removed |  |
| Full QR URLs are removed or token-stripped |  |
| Recipient identifiers are minimized |  |
| Raw CSV rows are not attached unless approved |  |
| SMTP authentication and internal relay details are removed |  |
| PDFs are replaced with hashes or receipts where possible |  |
| Revocation reasons are safe for the audience |  |
| Other recipients from the batch are not exposed |  |
| Legal hold or incident evidence needs are considered before deletion |  |

## Closure Record

| Case ID | Redaction approved by | Evidence shared | Audience | Date | Notes |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |
