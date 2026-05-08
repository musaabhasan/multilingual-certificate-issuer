# Recipient Collision Audit

The recipient collision audit is a pre-render control for certificate batches. It detects recipient records that can produce duplicate credentials, ambiguous identities, support disputes, or accidental disclosure through incorrect email delivery.

## What It Detects

| Check | Severity | Reason |
| --- | --- | --- |
| Duplicate `unique_identifier` | High | The same recipient or award identifier can produce conflicting certificates. |
| Duplicate `certificate_number` | High | Public verification cannot be reliable when a certificate number points to more than one row. |
| Duplicate `email` | High | Delivery to a repeated address may disclose one recipient's certificate to another. |
| Empty uniqueness values | High or Medium | Missing identifiers weaken audit, verification, and revocation. |
| Same email with multiple recipient names | High | Shared inboxes need explicit approval; accidental collisions must be corrected. |
| Same name and issue date with different identities | Medium | The rows may be legitimate, but the batch owner should confirm they are not duplicate awards or replacement records. |

## Demo Command

```bash
php bin/recipient-collision-audit-demo.php examples/recipient-collision-sample.csv
```

The command exits with status `1` when high-risk findings are present, making it suitable for CI, upload pipelines, and approval workflows.

Custom uniqueness fields can be passed as a comma-separated second argument:

```bash
php bin/recipient-collision-audit-demo.php recipients.csv unique_identifier,certificate_number,email
```

## Output Contract

The audit returns:

- `passed`: whether there are no high-risk findings.
- `risk_level`: `low`, `medium`, or `high`.
- `score`: a simple readiness score from 0 to 100.
- `row_count`: total data rows reviewed.
- `unique_fields`: uniqueness fields applied to the batch.
- `summary`: finding counts by severity.
- `findings`: actionable findings with field names, CSV line numbers, messages, and recommendations.

## Operational Placement

Run this audit after CSV syntax validation and before:

- template mapping approval,
- PDF rendering,
- hash manifest generation,
- queue creation,
- SMTP release approval,
- certificate replacement or resend operations.

The audit complements the recipient data minimization audit. Data minimization controls whether the batch contains appropriate fields; collision auditing controls whether the approved fields describe a clean and unambiguous recipient set.
