# Security Model

## Threats

| Threat | Control |
| --- | --- |
| Stolen administrator password | Strong password policy, mandatory administrator MFA, password rotation, session timeout, rate limits, audit logs |
| SMTP credential leakage | Sodium encryption, `.env` key separation, restricted database access |
| CSV injection or malformed data | Header validation, row limits, formula-prefix neutralization before export |
| Over-collected recipient personal data | Approved data dictionary, recipient data minimization audit, retention review |
| Unauthorized certificate generation | Role-based access, template approval, audit logging |
| Certificate tampering | Private storage, PDF hash logging, optional future digital signatures |
| Verification endpoint abuse | Hashed tokens, lookup logging, rate limiting, safe metadata responses |
| Bulk email abuse | Queue throttling, suppression list checks, role separation, SMTP profile approval |
| Unapproved storage or processing location | Approved hosting policy, controlled backups, no third-party storage by default |
| Public exposure of generated PDFs | Storage outside web root, signed download routes only |

## Roles

| Role | Permissions |
| --- | --- |
| Administrator | Manage users, SMTP profiles, system settings |
| Designer | Create and update certificate templates |
| Operator | Upload CSV files, generate certificates, schedule delivery |
| Auditor | Read-only access to audit logs, batches, and delivery reports |

## Authentication Requirements

- Administrator accounts must use the enforced password policy.
- Administrator accounts must enroll TOTP MFA before accessing protected management pages.
- MFA recovery codes are shown once, stored as hashes, and consumed after use.
- Passwords must be hashed with `password_hash`.
- Privileged passwords rotate every 90 days.
- Sessions expire after inactivity.
- Failed login attempts are rate-limited and should be reviewed in audit logs.

## Credential Storage

SMTP passwords are encrypted before database storage:

```php
$encrypted = SmtpProfile::encryptedPassword($plainTextPassword);
```

The application key must be a 32-byte random key encoded as base64:

```bash
php -r "echo 'base64:' . base64_encode(random_bytes(32)) . PHP_EOL;"
```

Keep `APP_KEY` outside the repository and back it up securely. If it is lost, encrypted SMTP passwords cannot be recovered.

## Audit Events

At minimum, log:

- login success and failure,
- MFA enrollment, verification, recovery-code use, and recovery-code regeneration,
- SMTP profile create/update/test,
- template create/update/approve/retire,
- CSV upload and mapping,
- recipient data minimization audit output,
- PDF generation,
- queue schedule, pause, resume,
- message sent, failed, retried,
- address suppressed or released from suppression,
- certificate verification lookups,
- administrator user changes.

## File Upload Controls

- Restrict background uploads to PNG/JPG by MIME type and extension.
- Limit upload size.
- Reject CSV files with empty or duplicate header names before mapping.
- Compare CSV fields with the approved data dictionary before processing.
- Remove high-risk fields that are not required for rendering, delivery, verification, or audit evidence.
- Apply a configured recipient row limit to reduce accidental oversized imports.
- Store uploads outside the public root.
- Randomize storage names.
- Strip or ignore original file paths.
- Generate preview derivatives rather than serving originals directly.

## Production Hardening

- Force HTTPS and secure cookies.
- Set `APP_DEBUG=false`.
- Disable directory listing.
- Use a low-privilege database account.
- Restrict worker host outbound traffic to approved SMTP servers.
- Enable database backups with encryption.
- Monitor queue failure spikes.
- Perform vulnerability scanning and penetration testing before launch.
