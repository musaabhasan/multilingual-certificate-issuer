# Revocation Ledger Audit

The revocation ledger audit checks whether withdrawn certificates have enough evidence to support public verification, support investigations, replacement issuance, and audit review.

## What The Audit Checks

| Check | Purpose |
| --- | --- |
| Duplicate certificate numbers | Prevents public verification ambiguity. |
| Approved status values | Keeps the certificate lifecycle consistent with the verification model. |
| Revocation timestamp, approver, and reason | Ensures each withdrawal is authorized and explainable. |
| Render and revocation ordering | Detects impossible timelines such as revocation before rendering. |
| Original PDF and manifest hashes | Preserves evidence even after a certificate is withdrawn. |
| Token rotation or disablement | Prevents stale QR links or public tokens from remaining active after revocation. |
| Recipient notification | Confirms the recipient was told about withdrawal or replacement when required. |
| Replacement link integrity | Confirms corrected certificates are present in the ledger and do not self-reference. |

## Demo Command

```bash
php bin/revocation-ledger-audit-demo.php examples/revocation-ledger-sample.json
```

The sample contains one clean revocation chain and one intentionally problematic withdrawal. The command exits with status `1` when high-risk findings are present.

## Operational Placement

Run this audit:

- before publishing a revocation report,
- after issuing replacement certificates,
- before external audit sampling,
- after bulk correction of recipient data,
- when support teams investigate a disputed certificate,
- before migrating verification data between environments.

The audit complements the hash manifest and verification receipt controls. The manifest preserves batch integrity, receipts preserve lookup outcomes, and the revocation ledger preserves the reason and authority for status changes.
