# Recipient Data Minimization Audit

Certificate issuance uses personal data before any PDF is generated or email is sent. The recipient data minimization audit gives operators a repeatable pre-processing gate for CSV uploads and mapped recipient fields.

The control is designed for institutions that need to prove that certificate batches only use the personal data needed for rendering, delivery, verification, and audit evidence.

## What The Audit Checks

| Area | Control |
| --- | --- |
| Approved data dictionary | Flags fields outside the approved field list |
| High-risk fields | Blocks unapproved identifiers, address data, phone numbers, health notes, biometric references, device IDs, and similar data |
| Required fields | Confirms the fields needed for certificate rendering and verification are present |
| Processing purpose | Requires an explicit certificate-processing purpose |
| Retention | Requires a retention period and warns when retention exceeds two years |
| Access control | Requires a lowest-privilege role for raw recipient data |
| Storage security | Requires encryption confirmation for databases, backups, and private object storage |
| External sharing | Requires an agreement reference when recipient data leaves the institution |
| Raw CSV download | Warns when operators can export raw CSV data without an approval reference |

## CLI Usage

Run the sample audit:

```bash
php bin/recipient-data-audit-demo.php examples/recipient-data-minimization-policy.json
```

The command returns JSON and exits with a non-zero status when any record has high-risk findings. This makes it suitable for release gates, CI checks, or manual go-live review.

## Input Format

Each audit record can point to a CSV file:

```json
{
  "label": "approved certificate import",
  "csv_path": "recipients-ar-en.csv",
  "policy": {
    "purpose": "Render bilingual certificates, deliver messages, support verification, and retain audit evidence.",
    "allowed_fields": ["unique_identifier", "email", "name_en", "name_ar", "issue_date"],
    "required_fields": ["unique_identifier", "email", "name_en", "issue_date"],
    "retention_days": 365,
    "access_role": "certificate_operator",
    "encrypted_at_rest": true,
    "external_sharing": false,
    "allow_raw_csv_download": false
  }
}
```

It can also define headers directly for design review before a source system export exists:

```json
{
  "label": "proposed export",
  "headers": ["unique_identifier", "email", "name_en", "issue_date", "phone", "national_id"],
  "policy": {
    "purpose": "Certificate delivery",
    "allowed_fields": ["unique_identifier", "email", "name_en", "issue_date"],
    "retention_days": 365,
    "access_role": "certificate_operator",
    "encrypted_at_rest": true
  }
}
```

## Recommended Release Workflow

1. Approve the recipient data dictionary for each certificate template.
2. Run the audit when a CSV is uploaded or when a source-system export is proposed.
3. Block batches with high-risk findings until unneeded fields are removed or formally approved.
4. Store the JSON audit output with the batch approval record.
5. Re-run the audit whenever template fields, CSV mappings, retention periods, or sharing arrangements change.

## Evidence To Retain

- approved field list,
- template version and mapped fields,
- audit JSON output,
- retention period,
- access role,
- storage encryption evidence,
- external sharing agreement reference when applicable,
- raw CSV export approval reference when applicable.

This audit complements upload validation, suppression checks, batch release gating, hash manifests, and verification receipts. Upload validation protects file shape, while this control protects data necessity and privacy posture before processing begins.
