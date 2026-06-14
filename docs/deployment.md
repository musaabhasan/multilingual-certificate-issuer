# Deployment Guide

This guide describes a production deployment pattern for organizations that need controlled hosting, secure storage, and reliable SMTP delivery.

## Recommended Topology

| Layer | Recommendation |
| --- | --- |
| Hosting | Approved cloud, institutional infrastructure, or private data center |
| Web | PHP 8.3 with Apache or Nginx + PHP-FPM |
| Database | Managed MySQL 8.0 or hardened self-hosted MySQL |
| Storage | Encrypted local disk or approved object storage |
| SMTP | Institutional mail server with TLS |
| Queue | CRON or supervisor-managed PHP worker |
| Backups | Encrypted and stored in approved backup locations |

## Environment Setup

1. Generate `APP_KEY`.
2. Create a dedicated MySQL user with least privilege.
3. Configure HTTPS certificates.
4. Set `APP_DEBUG=false`.
5. Configure storage permissions so the web server can write only to approved directories.
6. Configure a worker process for scheduled delivery.
7. Restrict outbound network traffic to approved SMTP hosts.

## Apache/Nginx Hardening

- Serve only the `public` directory.
- Deny direct access to `.env`, `storage`, `database`, `docs`, and `vendor`.
- Enable security headers.
- Enforce HTTPS.
- Limit upload size.

## Worker Deployment

CRON example:

```cron
* * * * * cd /var/www/certificate-issuer && php bin/platform-worker.php --once >> storage/logs/worker.log 2>&1
```

Supervisor example:

```ini
[program:certificate-worker]
command=php /var/www/certificate-issuer/bin/platform-worker.php --sleep=10
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/certificate-issuer/storage/logs/worker.log
```

## Backup Requirements

- MySQL dump or managed backup.
- `storage/app` for platform settings, users, encrypted SMTP passwords, state, audit logs, and rate limits.
- Generated certificate storage.
- Uploaded backgrounds.
- Encrypted SMTP profiles.
- Application key backup in a secure vault.

The application key is required to decrypt SMTP credentials. Store it separately from database backups.

## Queue Concurrency

The queue worker claims one ready message inside a database transaction using row-level locking. This allows a supervisor or CRON deployment to run more than one worker process without two workers sending the same queue item.

Keep the throttle aligned with the number of workers. For example, two workers with a 60-second throttle can send up to two messages per minute.

Set `QUEUE_STALE_PROCESSING_MINUTES` to the longest expected SMTP delivery window plus operational margin. If a worker exits after claiming a job but before recording the send result, the next worker run moves stale `processing` rows back to `pending` or to `failed` when the retry limit has been reached.

## Go-Live Checklist

- HTTPS configured.
- Administrator setup, password policy, and MFA enrollment tested.
- SMTP test message sent.
- Arabic PDF rendering verified.
- English PDF rendering verified.
- Queue throttle tested.
- Audit logs reviewed.
- Backup and restore tested.
- VAPT complete.
- Hosting, backup, and privacy requirements reviewed and approved.
