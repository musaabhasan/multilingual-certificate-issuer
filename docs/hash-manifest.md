# Tamper-Evident Certificate Hash Manifest

Certificate verification should not depend only on a public lookup page. Issuers also need a batch-level evidence artifact that proves which PDFs were generated, which certificate numbers were assigned, and whether the evidence record itself changed after issuance.

This guide defines a deterministic hash manifest for rendered certificate batches.

## Manifest Purpose

- Preserve per-certificate PDF SHA-256 hashes.
- Preserve the certificate number and recipient identifier used for each rendered PDF.
- Produce a manifest-level SHA-256 hash for the full batch evidence record.
- Support audit review, incident response, dispute handling, and re-verification after storage migration.
- Avoid exposing private CSV fields, email addresses, or full recipient profiles.

## Manifest Fields

| Field | Meaning |
| --- | --- |
| `manifest_version` | Contract version for the manifest format. |
| `batch_reference` | Human-readable batch or cohort reference. |
| `created_at` | UTC timestamp when the manifest was produced. |
| `hash_algorithm` | Hash algorithm used for PDFs and manifest integrity. |
| `certificate_count` | Number of certificate entries in the manifest. |
| `certificates` | Sorted list of certificate evidence entries. |
| `manifest_sha256` | SHA-256 digest of the canonical manifest content without this field. |

## Certificate Entry Fields

| Field | Meaning |
| --- | --- |
| `certificate_number` | Public certificate number. |
| `recipient_identifier` | Institutional recipient identifier or controlled pseudonymous identifier. |
| `pdf_sha256` | SHA-256 digest of the rendered PDF. |
| `rendered_at` | Timestamp when the certificate was rendered, if available. |

## Backend Component

`src/Certificate/CertificateHashManifest.php` provides:

- deterministic manifest creation,
- per-entry validation,
- optional PDF hashing when a stored `pdf_sha256` is not supplied,
- stable sorting by certificate number and recipient identifier,
- manifest-level hash generation,
- manifest integrity verification through `hash_equals`.

Example:

```php
$manifestBuilder = new CertificateHashManifest();
$manifest = $manifestBuilder->build('May 2026 Cohort', [
    [
        'certificate_number' => 'CERT-2026-001',
        'recipient_identifier' => 'STU-1001',
        'pdf_path' => '/private/certificates/CERT-2026-001.pdf',
        'pdf_sha256' => '9c2f0c0c57d0d3a6f1c8435d9338f0f0c8d6a4a4b4af3c181c8f6907f3b8e42d',
        'rendered_at' => '2026-05-08T12:00:00Z',
    ],
]);
```

## Operational Workflow

1. Render all certificates in the approved batch.
2. Store each PDF outside the public web root.
3. Calculate or retrieve each PDF SHA-256 hash.
4. Build the batch manifest.
5. Store the manifest in private storage with restricted access.
6. Record the manifest hash in the administrative audit log or batch record.
7. Recompute the manifest during audit review, dispute handling, storage migration, or suspected tampering.

## Privacy Rules

- Do not include recipient email addresses in the manifest.
- Do not include full CSV row data in the manifest.
- Use a controlled recipient identifier or pseudonymous identifier when possible.
- Treat the manifest as audit evidence because it can still reveal certificate issuance patterns.

## Verification Rules

| Check | Failure Meaning |
| --- | --- |
| PDF hash mismatch | The rendered PDF changed, was replaced, or was corrupted. |
| Missing certificate entry | A certificate was removed from the evidence record. |
| Extra certificate entry | A certificate may have been added outside the approved batch. |
| Manifest hash mismatch | The batch evidence record was edited after creation. |
| Certificate number mismatch | Public verification may be pointing to the wrong evidence record. |

## Retention Guidance

Retain hash manifests for at least the validity period of the issued credentials. If certificates are revoked or corrected, preserve the original manifest and link the replacement certificate batch rather than editing historical evidence.
