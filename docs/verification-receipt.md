# Verification Receipt Evidence

Verification receipts are tamper-evident JSON records for public certificate lookup outcomes. They give support teams, auditors, and recipients a stable artifact that proves what the verifier returned at a specific time without exposing private CSV fields.

## Why Receipts Matter

Certificate verification normally answers a live question: "Is this certificate valid now?" A receipt preserves the evidence behind that answer:

- the certificate number that was checked,
- the public status returned by policy,
- the verification timestamp in UTC,
- safe certificate metadata,
- PDF and manifest hashes when available,
- revocation context when policy permits disclosure,
- the channel or request reference used by the verifier,
- a receipt-level SHA-256 hash.

The receipt is not a replacement for database audit logs. It is a portable evidence artifact that can be attached to support tickets, recipient records, quality reviews, and incident investigations.

## Public Metadata Boundary

Receipts should include only safe public fields:

| Field | Include | Exclude |
| --- | --- | --- |
| Identity | Recipient display name | Email, phone, national ID, private CSV columns |
| Certificate | Certificate number, template name, rendered timestamp | Internal job ID, administrator names, raw template JSON |
| Integrity | PDF SHA-256, batch reference, manifest SHA-256 | File paths, object-storage credentials, signed URLs |
| Verification | Status, verification time, request reference | IP address, user agent, session ID |
| Revocation | Reason category, revoked timestamp, replacement certificate number | Free-text investigation notes, staff comments |

## Supported Statuses

| Status | Meaning |
| --- | --- |
| `valid` | Certificate number and token matched an active rendered certificate |
| `revoked` | Certificate was previously issued but withdrawn under policy |
| `invalid` | Certificate number or token did not validate |
| `rate_limited` | Lookup was blocked by abuse controls |

## Receipt Integrity

The `receipt_sha256` field is calculated over a canonical JSON representation of the receipt with `receipt_sha256` excluded. The canonical form sorts object keys recursively and preserves list order.

Recommended handling:

1. Build the receipt immediately after the verification decision.
2. Store the receipt JSON beside the verification event row or support case.
3. Return the receipt hash to the user interface for reference.
4. Recalculate the hash during audits to detect accidental or malicious edits.
5. Link receipt hashes to batch manifests for stronger end-to-end evidence.

## Demo

Run the local receipt demo:

```bash
php bin/verification-receipt-demo.php
```

The script emits a sample JSON receipt and verifies its hash before printing it.

## Operational Use Cases

| Use Case | Receipt Benefit |
| --- | --- |
| Recipient dispute | Shows what status and metadata were returned at the time of lookup |
| Revocation appeal | Preserves the public revocation category and replacement certificate reference |
| Storage migration | Links verifier output to preserved PDF and manifest hashes |
| Misuse investigation | Distinguishes valid lookups from invalid or rate-limited attempts |
| Quality assurance | Gives UAT testers deterministic evidence for bilingual certificate validation |

## Implementation Notes

- Use `CertificateIssuer\Certificate\VerificationReceipt` after the verifier determines status.
- Do not include raw request IP addresses in public receipts; keep them in private audit logs.
- Use generic `invalid` receipts for unknown certificate numbers and token mismatches to reduce enumeration risk.
- For revoked certificates, disclose only policy-approved categories, not internal investigation notes.
