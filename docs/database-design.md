# Database Design

The database is designed around explicit approval, traceable batch processing, and bilingual recipient data.

## Encoding

All tables use:

```sql
DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci
```

This supports Arabic, English, symbols, and mixed-direction text. Application responses should also use UTF-8 headers.

## Key Tables

| Table | Purpose |
| --- | --- |
| `users` | Administrative accounts, roles, MFA state, password age |
| `mfa_secrets` | Encrypted TOTP secrets |
| `smtp_profiles` | Institutional SMTP settings with encrypted passwords |
| `certificate_templates` | Approved and draft template layouts |
| `recipient_batches` | CSV upload batches linked to a template |
| `recipients` | Recipient rows with normalized fields and full JSON payload |
| `certificate_jobs` | Rendering state and PDF path per recipient |
| `email_templates` | Bilingual email bodies and dynamic tags |
| `mail_queue` | Scheduled, throttled, retryable email delivery |
| `audit_log` | Administrative and system activity |

## Certificate Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DraftTemplate
    DraftTemplate --> ApprovedTemplate
    ApprovedTemplate --> BatchUploaded
    BatchUploaded --> RecipientsValidated
    RecipientsValidated --> PdfRendering
    PdfRendering --> PdfRendered
    PdfRendered --> Queued
    Queued --> Sent
    Queued --> Failed
    Failed --> Queued: retry
```

## Data Retention

Recommended defaults:

| Data | Retention |
| --- | --- |
| CSV upload source | Delete after validation unless policy requires retention |
| Recipient rows | Retain according to certificate verification and privacy policy |
| Generated PDFs | Retain for the certificate validity period or institutional policy |
| Audit logs | Minimum 1 year; longer for regulated environments |
| SMTP test logs | 30 to 90 days |

## Privacy Notes

Recipient data can include names, email addresses, program names, and identifiers. Treat it as personal data. Access should be role-limited and logged.
