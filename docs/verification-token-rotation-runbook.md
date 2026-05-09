# Verification Token Rotation Runbook

Use this runbook when rotating certificate verification tokens, QR secrets, lookup salts, or public verification links. Rotation protects public verification from token leakage, accidental exposure, weak generation practices, and post-incident abuse while preserving recipient support and audit history.

## Rotation Header

| Field | Value |
| --- | --- |
| Rotation type | Scheduled / incident / batch-specific / algorithm change / support-case exposure |
| Affected certificate batch |  |
| Certificate count |  |
| Verification route |  |
| Requested by |  |
| Security owner |  |
| Effective date |  |
| Evidence package |  |

## 1. Rotation Triggers

| Trigger | Action |
| --- | --- |
| Verification token or QR URL was exposed | Rotate affected tokens immediately and preserve incident evidence. |
| Token generation logic changed | Rotate after validating entropy, uniqueness, and lookup compatibility. |
| Public support package included too much verification data | Rotate exposed records and update support handling guidance. |
| Batch was corrected, revoked, or reissued | Rotate old links when replacement certificates are published. |
| Scheduled key lifecycle review is due | Rotate according to the approved cadence and record evidence. |
| Suspicious lookup patterns are detected | Rate-limit, investigate, rotate affected tokens, and review abuse controls. |

## 2. Pre-Rotation Checks

| Check | Evidence | Owner | Status |
| --- | --- | --- | --- |
| Identify affected certificate numbers and batches | Batch manifest or certificate register |  |  |
| Confirm whether PDFs must be regenerated | PDF hash manifest review |  |  |
| Confirm whether QR overlays must be regenerated | Template asset or QR manifest |  |  |
| Confirm whether revoked certificates are in scope | Revocation ledger audit |  |  |
| Preserve current verification receipts if needed | Verification receipt export |  |  |
| Review notification obligations | Support or recipient communication plan |  |  |
| Confirm rollback approach | Rotation rollback note |  |  |

## 3. Rotation Procedure

| Step | Action | Evidence |
| --- | --- | --- |
| Freeze public verification updates | Prevent concurrent token edits during rotation | Change record |
| Generate replacement tokens | Use approved entropy and uniqueness checks | Token generation log |
| Store hashed tokens only | Keep raw tokens out of logs, exports, and support notes | Storage review |
| Update certificate records | Link new token hash to the certificate number and batch | Database change evidence |
| Regenerate QR links if needed | Ensure QR links point to current verification route | QR render sample |
| Rebuild affected PDFs only when required | Preserve original PDF hashes unless new QR or content is needed | Hash manifest diff |
| Update support references | Remove old token material from support templates | Support note |
| Unfreeze verification | Re-enable lookup after validation passes | Release note |

## 4. Validation

| Test | Expected result | Evidence |
| --- | --- | --- |
| New token lookup | Valid certificate returns safe public metadata |  |
| Old token lookup | Old token is rejected, redirected, or handled according to policy |  |
| Revoked certificate lookup | Revocation state remains accurate after rotation |  |
| Receipt generation | New lookup receipt has a fresh canonical hash |  |
| Rate limit | Repeated failed old-token attempts are throttled |  |
| Audit log | Rotation actor, time, batch, and record count are logged |  |
| Hash manifest | PDF hash preservation or regeneration is explained |  |

## 5. Incident-Specific Evidence

Capture this section when rotation follows a suspected or confirmed exposure.

| Evidence | Captured? | Reference |
| --- | --- | --- |
| Exposure timeline |  |  |
| Source of token leakage |  |  |
| Affected recipient or batch scope |  |  |
| Lookup logs around exposure window |  |  |
| Containment actions |  |  |
| Recipient or stakeholder communication |  |  |
| Follow-up control improvement |  |  |

## 6. Closure Record

| Item | Status | Evidence reference |
| --- | --- | --- |
| Replacement tokens generated and hashed |  |  |
| Old tokens invalidated or controlled |  |  |
| Verification receipts tested |  |  |
| QR/PDF impact resolved |  |  |
| Revocation state preserved |  |  |
| Support materials updated |  |  |
| Audit log complete |  |  |
| Next scheduled review set |  |  |

## Safety Rules

- Do not store raw verification tokens in CSV exports, emails, logs, support tickets, or public receipts.
- Keep public lookup responses limited to safe certificate metadata.
- Preserve evidence before deleting or overwriting exposed records.
- Treat token rotation and certificate revocation as separate decisions; rotation changes proof of possession, while revocation changes certificate validity.
- When a PDF changes because a QR code changes, update the hash manifest and explain the reason.
