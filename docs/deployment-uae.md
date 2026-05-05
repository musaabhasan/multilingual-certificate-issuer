# UAE Deployment Guide

This guide describes a production deployment pattern for organizations that require UAE-based hosting and controlled data residency.

## Recommended Topology

| Layer | Recommendation |
| --- | --- |
| Hosting | UAE region cloud, UAE data center, or approved institutional infrastructure |
| Web | PHP 8.3 with Apache or Nginx + PHP-FPM |
| Database | Managed MySQL 8.0 or hardened self-hosted MySQL |
| Storage | Encrypted local disk or approved object storage in UAE region |
| SMTP | Institutional mail server with TLS |
| Queue | CRON or supervisor-managed PHP worker |
| Backups | Encrypted and stored in approved UAE location |

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
* * * * * cd /var/www/certificate-issuer && php bin/queue-worker.php >> storage/logs/worker.log 2>&1
```

Supervisor example:

```ini
[program:certificate-worker]
command=php /var/www/certificate-issuer/bin/queue-worker.php
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/certificate-issuer/storage/logs/worker.log
```

## Backup Requirements

- MySQL dump or managed backup.
- Generated certificate storage.
- Uploaded backgrounds.
- Encrypted SMTP profiles.
- Application key backup in a secure vault.

The application key is required to decrypt SMTP credentials. Store it separately from database backups.

## Go-Live Checklist

- HTTPS configured.
- MFA tested.
- SMTP test message sent.
- Arabic PDF rendering verified.
- English PDF rendering verified.
- Queue throttle tested.
- Audit logs reviewed.
- Backup and restore tested.
- VAPT complete.
- Data residency reviewed and approved.
