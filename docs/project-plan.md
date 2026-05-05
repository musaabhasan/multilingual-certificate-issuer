# Multi-Phase Project Plan

## Phase 1: Core Infrastructure And Database Design

| Action | Deliverable | Acceptance Criteria |
| --- | --- | --- |
| Configure PHP 8.3 and MySQL 8.0 | Docker runtime, Composer project, schema | App starts locally, database initializes with `utf8mb4` |
| Develop SMTP configuration module | Encrypted SMTP profile storage | Passwords are encrypted before database write |
| Implement authentication and MFA | Users, roles, TOTP, password rotation | Administrators require MFA and password age is enforced |
| Add audit foundation | `audit_log` table and logger | Security-sensitive actions create audit records |

## Phase 2: Visual Designer And Template Engine

| Action | Deliverable | Acceptance Criteria |
| --- | --- | --- |
| Build drag-and-drop interface | Canvas designer prototype | Elements export X/Y coordinates in layout JSON |
| Support backgrounds | PNG/JPG upload flow | Images are stored outside public root and previewed safely |
| Integrate PDF renderer | mPDF rendering service | Arabic and English names render in one PDF/A |
| Add local export | Individual and bulk PDF export | Operators can generate PDFs without sending email |

## Phase 3: Data Integration And Distribution Logic

| Action | Deliverable | Acceptance Criteria |
| --- | --- | --- |
| CSV upload and mapping | Header parser and validation | Required columns are detected before generation |
| Email template editor | Dynamic tags for name, identifier, date | Preview shows resolved tags for sample recipient |
| Queue system | MySQL-backed mail queue | Delivery respects throttle interval and scheduled time |
| Retry strategy | Attempts and next-attempt fields | Failed sends retry and eventually mark failed |
| Verification flow | Certificate number, hashed token, and lookup events | Public verification returns safe certificate metadata |

## Phase 4: Testing, Hardening, And Deployment

| Action | Deliverable | Acceptance Criteria |
| --- | --- | --- |
| UAT with Arabic and English data | Test scripts and sign-off checklist | Mixed RTL/LTR certificates pass user review |
| Security hardening | VAPT, input validation, secrets review | Critical and high findings remediated |
| Deployment | Hardened production environment | Data, backups, logs, and SMTP traffic follow approved hosting policy |
| Operations handover | Runbook and admin training | Team can operate, recover, and audit the platform |

## Definition Of Done

- MFA enforced for administrators.
- SMTP credentials encrypted.
- PDF files generated outside public root.
- Arabic and English samples pass visual inspection.
- Queue throttling works at 1 email per 60 seconds or configured rate.
- Certificate verification works without exposing private recipient data.
- Audit trail covers template, CSV, PDF, and email actions.
- Backup and restore are tested.
- VAPT is completed before production release.
