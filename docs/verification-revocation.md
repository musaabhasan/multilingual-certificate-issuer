# Verification And Revocation Controls

Digital certificates need a verification lifecycle, not only a PDF generation workflow. This guide defines the controls for public validation, QR links, certificate hash evidence, and revocation handling.

## Verification Principles

- Public verification must confirm only safe metadata: certificate number, recipient display name, template name, rendered timestamp, and PDF SHA-256 hash.
- Verification tokens must be stored as hashes, not reusable plaintext values.
- Generated PDFs should stay outside the public web root.
- Batch-level hash manifests should be retained so PDF hashes can be checked independently of the application database.
- Verification receipts should preserve the safe public lookup outcome and a receipt-level hash for support and audit evidence.
- The verification page should not reveal private CSV fields, email addresses, internal batch IDs, administrator names, or delivery details.
- Every lookup should be logged for abuse detection and certificate-support investigations.
- Repeated failed lookups should be rate-limited and monitored for enumeration attempts.

## Certificate Status Model

| Status | Meaning | Public Verification Behavior |
| --- | --- | --- |
| `pending` | Job has not rendered yet | Not valid |
| `rendering` | Renderer is processing the job | Not valid |
| `rendered` | Certificate PDF and verification token are active | Valid if token matches |
| `failed` | Rendering failed | Not valid |
| `revoked` | Certificate was withdrawn after issuance | Not valid; return a safe revoked response if policy allows |

## QR Link Pattern

Recommended QR payload:

```text
https://example.edu/verify.php?certificate_number=CERT-2026-001&token=<public-token>
```

Operational rules:

- Generate a unique token per certificate job.
- Rotate the token if a QR link is exposed before approval.
- Do not encode private recipient data into the QR payload.
- Use HTTPS only.
- Keep the certificate number non-sequential where enumeration risk is high.

## Revocation Triggers

| Trigger | Example |
| --- | --- |
| Recipient data error | Incorrect name, identifier, course, grade, date, or credential title |
| Duplicate issuance | Same credential issued more than once with conflicting metadata |
| Unauthorized issuance | Certificate generated from an unapproved template or batch |
| Template error | Logo, signature, scope, date, or legal text is incorrect |
| Fraud or misuse | Certificate was altered, shared deceptively, or requested fraudulently |
| Policy decision | Credential withdrawn by the issuing institution |

## Revocation Workflow

1. Record the revocation request and reason.
2. Confirm authority to revoke the certificate.
3. Change the certificate job status to `revoked`.
4. Store `revoked_at`, `revoked_by`, and `revocation_reason`.
5. Disable or rotate the verification token if policy requires.
6. Notify the recipient and relevant internal owner where required.
7. Preserve the original PDF hash and audit evidence for investigation.
8. Issue a corrected certificate through a new certificate job when needed.

## Public Response Rules

| Scenario | Recommended Response |
| --- | --- |
| Valid certificate and token | Return safe certificate metadata and PDF hash |
| Unknown certificate number | Return generic invalid response |
| Token mismatch | Return generic invalid response and log failed lookup |
| Revoked certificate | Return revoked status only if institutional policy permits public disclosure |
| Excessive attempts | Return rate-limit response without revealing which field failed |

## Verification Receipts

Generate a receipt after the verifier decides whether a lookup is valid, revoked, invalid, or rate-limited. The receipt should contain safe public metadata, the verification timestamp, certificate and manifest hashes when available, and a `receipt_sha256` value calculated from canonical JSON.

Use receipts when:

- a recipient needs evidence that a certificate was valid at a point in time,
- a support team investigates a disputed certificate,
- a revocation decision needs a public but privacy-preserving record,
- an auditor samples verification outcomes against batch hash manifests,
- UAT testers need deterministic evidence for Arabic and English certificate checks.

See [Verification Receipt Evidence](verification-receipt.md) for the JSON artifact model and operational rules.

## Administrative Evidence

Retain:

- original certificate number,
- PDF SHA-256 hash,
- batch manifest SHA-256 hash,
- verification token hash,
- rendered timestamp,
- revocation timestamp,
- revoking administrator or service account,
- reason category and free-text rationale,
- replacement certificate number where applicable,
- verification lookup history.

Use [Tamper-Evident Hash Manifest](hash-manifest.md) for the batch-level evidence artifact that links certificate numbers, recipient identifiers, PDF hashes, and the manifest hash.

## Abuse Monitoring

Monitor for:

- high failed-lookup volume,
- many certificate numbers tested from one IP range,
- repeated token mismatches for the same certificate,
- verification of certificates shortly after bulk delivery,
- lookups from unexpected countries or networks,
- revoked certificate lookups after recipient notification.
