# Security Policy

## Supported Use

This project is intended for defensive, administrative, and educational certificate issuance workflows. It should be deployed only by authorized teams.

## Reporting Security Issues

Do not open public issues for vulnerabilities that could expose credentials, private recipient data, certificate URLs, or institutional infrastructure. Use private reporting channels or contact the maintainer through the GitHub profile.

## Sensitive Data Rules

- Do not commit SMTP passwords, application keys, CSV files with real recipients, or generated certificates.
- Use synthetic Arabic and English samples for testing.
- Store generated PDFs outside the public web root.
- Encrypt SMTP credentials before writing to the database.
- Redact recipient email addresses before sharing logs.

## Production Requirements

- HTTPS-only application access.
- MFA for all administrators.
- Strong password hashing with PHP `password_hash`.
- Password rotation policy for privileged users.
- Database backups encrypted at rest.
- Restricted outbound SMTP access.
- Audit logs retained according to institutional policy.
- VAPT before production launch.
