# Certificate Signing Key Custody Runbook

This runbook defines how signing keys, verification-token secrets, QR signing material, and certificate integrity keys should be generated, stored, rotated, backed up, used, and retired. It applies to certificate batches that rely on digital signatures, QR verification links, hash manifests, verification receipts, token hashes, or signed evidence packages.

## Objectives

- Keep certificate trust material under named ownership and least-privilege access.
- Preserve evidence that keys were generated, rotated, backed up, and used through an approved process.
- Separate production signing material from development, staging, test, and support workflows.
- Define compromise response for exposed QR secrets, leaked tokens, stolen keys, unauthorized signing, or suspicious verification activity.
- Ensure certificate reissue, revocation, and verification receipt workflows use current key state.

## Key Classes

| Key Class | Purpose | Custody Requirement |
| --- | --- | --- |
| PDF signing key | Signs certificate PDFs or batch evidence packages | Hardware-backed or encrypted private storage |
| Verification token secret | Generates or validates public lookup tokens | Stored only as secret material, never in logs |
| QR signing key | Protects QR payload integrity or short lookup codes | Rotation-aware and scoped by batch |
| Manifest integrity key | Signs or seals hash manifests and receipts | Restricted to batch closure workflow |
| SMTP credential encryption key | Encrypts SMTP profiles at rest | Separate from certificate signing material |
| Support evidence export key | Protects redacted support or audit packages | Limited to authorized support/audit owners |

## Custody Roles

| Role | Responsibility |
| --- | --- |
| Key custodian | Owns generation, backup, access review, and rotation evidence |
| Batch approver | Confirms correct key version before certificate release |
| Security reviewer | Reviews access, storage, compromise signals, and audit logs |
| Certificate operations owner | Executes batch signing, verification setup, and release |
| Support owner | Uses only redacted evidence packages and never receives raw private keys |
| Incident owner | Coordinates containment, token rotation, revocation, and communication |

## Generation Ceremony

Record the following for each production key or secret:

| Field | Required Detail |
| --- | --- |
| Key ID | Stable identifier used in manifests and audit logs |
| Purpose | PDF signing, QR signing, token generation, manifest sealing, evidence export |
| Environment | Production / staging / test / development |
| Algorithm and length | Example: Ed25519, RSA-3072, AES-256-GCM, HMAC-SHA-256 |
| Generation location | HSM, cloud KMS, secret manager, offline workstation, or approved host |
| Custodian | Named accountable owner |
| Backup location | Encrypted backup, escrow, KMS replica, or not backed up by design |
| Access policy | Roles or service accounts permitted to use key |
| Evidence reference | Ticket, change record, or ceremony record |

Do not reuse development or test keys for production certificates. Do not store private signing material in Git, public web roots, support tickets, email, or exported certificate packages.

## Usage Controls

| Control | Minimum Expectation |
| --- | --- |
| Key version pinning | Each batch records the key ID and version used |
| Service account scope | Signing service can use the key but cannot export private material |
| Dual approval | Production key creation, rotation, and retirement require approval |
| Separation of duties | Template designers and CSV uploaders do not control production keys |
| Audit logging | Signing, token generation, receipt sealing, and key changes are logged |
| Rate limiting | Signing endpoints and verification-token generation cannot be abused for bulk unauthorized output |
| Evidence retention | Ceremony records and key-use logs are retained with batch evidence |

## Rotation Triggers

Rotate or replace signing material when:

- a scheduled rotation date is reached;
- a custodian changes role or leaves the organization;
- a QR link, token, private key, backup, or evidence export is exposed;
- verification abuse suggests token guessing or bulk replay;
- a certificate batch is corrected, reissued, or revoked at scale;
- algorithm, provider, storage, or compliance requirements change;
- logs show signing outside approved release windows.

## Compromise Response

| Step | Required Action |
| --- | --- |
| Contain | Disable affected signing or token generation path |
| Preserve | Export audit logs, key-use records, affected batch IDs, and verification events |
| Scope | Identify impacted certificates, QR codes, tokens, receipts, and manifests |
| Rotate | Create replacement key or secret through the generation ceremony |
| Reissue | Re-render, re-sign, rotate tokens, or reissue certificates where required |
| Revoke | Mark affected certificates, tokens, or receipts as revoked or superseded |
| Notify | Inform batch owners, support, verifiers, and affected recipients according to policy |
| Close | Document root cause, evidence package, residual risk, and monitoring window |

## Backup And Recovery

- Backups must be encrypted and access-controlled separately from live signing services.
- Backup restore must be tested without exposing private material to operators.
- Recovery evidence should include backup ID, restore time, custodian, reason, and validation result.
- If a key is intentionally non-recoverable, document the reissue path for lost or unavailable signing material.
- Production keys should not be copied into troubleshooting environments.

## Batch Release Checks

Before releasing a certificate batch:

1. Confirm the approved key ID and version.
2. Verify the signing service or token generator uses the expected environment.
3. Confirm key access review is current.
4. Attach key-use evidence to the batch release record.
5. Confirm verification receipts and hash manifests identify the correct key or secret version.
6. Confirm revocation and token rotation procedures can handle this key version.

## Metrics

| Metric | Purpose |
| --- | --- |
| Keys past rotation date | Detects stale trust material |
| Signing events outside release window | Detects misuse or automation failure |
| Failed signing attempts | Shows operational or abuse issues |
| Key access exceptions | Highlights custody drift |
| Token rotations by cause | Measures exposure and reissue workload |
| Batch records missing key ID | Measures audit readiness |
| Time to contain key compromise | Measures incident response maturity |

## Closure Criteria

Key custody is ready when every production key has a named custodian, approved purpose, access policy, rotation date, backup decision, ceremony evidence, batch-use logging, compromise response path, and retirement plan.
