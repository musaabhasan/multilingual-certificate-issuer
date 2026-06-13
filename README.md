# Multilingual Automated Certificate Issuance And Distribution Platform

A secure PHP 8.3 and MySQL 8.0 platform for designing, generating, and distributing bilingual Arabic/English digital certificates at scale.

The platform replaces manual certificate creation with a controlled pipeline: template design, CSV data import, PDF/A generation, SMTP delivery, throttled queues, scheduling, MFA-protected administration, encrypted credentials, and audit logs.

## Core Capabilities

| Category | Capability | Implementation Direction |
| --- | --- | --- |
| Architecture | PHP 8.3 application with MySQL 8.0 | Composer autoloading, PDO, Docker, Apache, background worker |
| Bilingual logic | Arabic and English text in one certificate | UTF-8, `utf8mb4`, RTL/LTR element direction, mPDF Arabic shaping support |
| Design engine | Visual component builder | Background upload, canvas preview, X/Y text positioning, JSON layout export |
| Dynamic mapping | CSV fields to template elements | Header-based mapping, batch imports, validation before generation |
| PDF generation | PDF/A certificate output | mPDF renderer with embedded fonts, positioned HTML, deterministic storage paths |
| Bilingual rendering QA | Pre-release proofing workflow | Arabic shaping, RTL/LTR, mixed text, font embedding, PDF/A, QR placement, accessibility, and evidence checks |
| PDF accessibility remediation | Inclusive certificate repair workflow | Reading order, language metadata, contrast, QR fallback text, font embedding, print proof, hash reconciliation, and reissue evidence |
| Distribution | Secure SMTP delivery | PHPMailer, TLS/SSL, encrypted SMTP credentials, per-recipient queue rows |
| Throttling | Controlled sending speed | Queue worker with configurable delay, retry counters, scheduled delivery |
| Deliverability | Sender reputation and abuse controls | SPF/DKIM/DMARC readiness, bounce handling, suppression, approval gates |
| SMTP alignment audit | Sender-domain release gate | From-domain alignment, SPF, DKIM, DMARC, return-path, bounce/complaint handling, TLS, approval, and throttle checks |
| Delivery suppression audit | Bounce and complaint release gate | Hard-bounce, complaint, manual-hold, retry, suppression-release, and queue-readiness checks |
| Recipient privacy | Data minimization audit | CSV field dictionary review, high-risk field detection, retention, access, encryption, and sharing checks |
| Recipient integrity | Collision audit | Duplicate identifiers, repeated emails, certificate-number conflicts, and same-name/date ambiguity checks |
| Correction and reissue | Controlled certificate replacement | Workflow for correction intake, severity classification, source-of-truth checks, re-rendering, hash changes, revocation or supersession, token rotation, and delivery |
| Revocation and reissue operations | Credential withdrawal and replacement workflow | Revocation reasons, approval evidence, recipient notification, QR status handling, token rotation, replacement links, fraud response, and closure checks |
| Batch release control | Pre-send readiness gate | Template approval, queue/render counts, suppression checks, hash manifest verification, SMTP alignment, throttle, and schedule checks |
| Template asset integrity | Pre-render manifest audit | Background, font, seal, signature, and QR overlay hashes, embedding, DPI, license, approval, and Arabic font readiness checks |
| Verification | Certificate validation | Verification tokens, PDF hash storage, lookup audit events, QR-ready flow |
| Verification QR accessibility | Public lookup usability | QR scanning, visible fallback text, accessibility, revocation states, token rotation, and support evidence checks |
| Verification token rotation | Verification-link lifecycle control | Scheduled and incident-driven rotation for lookup tokens, QR secrets, receipts, support references, and audit logs |
| Verification abuse response | Public lookup protection | Response playbook for token guessing, scraping, enumeration, exposed QR links, suspicious support cases, and revoked-certificate probing |
| Verification enumeration resistance | Public lookup hardening | Token entropy, response normalization, rate limits, sequential probing detection, abuse evidence, and privacy-minimized logs |
| Revocation evidence | Ledger consistency audit | Status lifecycle, revocation authority, hash preservation, token rotation, notification, and replacement links |
| Evidence integrity | Tamper-evident batch manifests | Per-certificate PDF hashes, deterministic manifest hash, and audit-ready verification |
| Signing key custody | Certificate trust material governance | Signing-key ownership, generation ceremony, rotation, backup, access review, compromise response, and batch-use evidence |
| Batch evidence retention | Issuance evidence lifecycle | Retention, redaction, deletion, legal hold, and ownership rules for CSV files, PDFs, manifests, queues, receipts, revocations, and audit logs |
| Verification receipts | Portable lookup evidence | Safe public metadata, canonical JSON, receipt SHA-256, and support-case attachment |
| Delivery proof reconciliation | Batch closure and dispute evidence | Reconciles PDF hashes, queue rows, SMTP message IDs, bounces, suppression, verification receipts, support cases, and reissue decisions |
| Support case redaction | Safe evidence sharing | Redaction rules for verification tickets, delivery disputes, corrections, revocations, vendor support, and audit samples |
| Email templates | Dynamic message content | `{{tag}}` rendering, nested field lookup, and missing-variable validation |
| Import safety | Upload and CSV controls | MIME checks, size limits, required headers, formula-prefix neutralization |
| Security | MFA, password rotation, audit logs | TOTP-ready schema, password policy fields, administrative action logging |
| Deployment readiness | Production hosting guidance | Self-hosted deployment, MySQL encryption guidance, private storage controls |

## Repository Structure

| Path | Purpose |
| --- | --- |
| `src/Certificate` | CSV mapping, template layout validation, PDF rendering |
| `src/Database` | PDO connection factory |
| `src/Mail` | Encrypted SMTP profile handling and certificate mailer |
| `src/Queue` | Throttled distribution worker |
| `src/Security` | Encryption, MFA/password policy helpers, audit logging |
| `public` | Dashboard, designer, import, queue, and verification UI surfaces |
| `database/schema.sql` | MySQL 8.0 schema with bilingual-safe collations |
| `docs` | Architecture, security model, deployment, and project plan |
| `examples` | Sample Arabic/English CSV and template layout |

## Documentation

| Document | Focus |
| --- | --- |
| [Architecture](docs/architecture.md) | Runtime components, data flow, and design decisions |
| [Security Model](docs/security-model.md) | Threats, roles, credential storage, upload controls, and hardening |
| [Database Design](docs/database-design.md) | Tables, lifecycle, retention, and privacy notes |
| [API Contracts](docs/api-contracts.md) | Stable request and response shapes for future controllers |
| [Project Plan](docs/project-plan.md) | Four-phase implementation plan with acceptance criteria |
| [Deployment](docs/deployment.md) | Hosting, worker, backup, and go-live guidance |
| [UAT Checklist](docs/uat-checklist.md) | Arabic/English acceptance tests and delivery checks |
| [Bilingual PDF Rendering QA Workflow](docs/bilingual-pdf-rendering-qa.md) | Release gate for Arabic/English proof batches, fonts, RTL/LTR behavior, PDF/A, QR verification, accessibility, and evidence retention |
| [Certificate PDF Accessibility Remediation Workflow](docs/certificate-pdf-accessibility-remediation.md) | Remediation workflow for reading order, bilingual metadata, font embedding, contrast, QR fallback text, print proof, hash manifests, and reissue evidence |
| [Deliverability And Abuse Prevention](docs/deliverability-abuse-prevention.md) | SMTP reputation, bounce handling, batch approval, and misuse controls |
| [SMTP Domain Alignment Audit](docs/smtp-domain-alignment-audit.md) | Sender-domain release checks for SPF, DKIM, DMARC, return-path, TLS, bounce handling, complaints, approval, and throttle |
| [Delivery Suppression And Bounce Governance Audit](docs/delivery-suppression-audit.md) | Pre-release checks for hard bounces, complaints, manual holds, retry limits, suppression release, and queued delivery readiness |
| [Recipient Data Minimization Audit](docs/recipient-data-minimization-audit.md) | Pre-processing privacy gate for CSV fields, retention, access control, encryption, and external sharing |
| [Recipient Collision Audit](docs/recipient-collision-audit.md) | Pre-render integrity gate for duplicate identifiers, certificate numbers, repeated emails, and ambiguous recipient rows |
| [Batch Release Gate](docs/batch-release-gate.md) | Executable pre-send readiness checks for certificate delivery batches |
| [Template Asset Integrity Audit](docs/template-asset-integrity-audit.md) | Pre-render manifest checks for asset hashes, embedding, DPI, licenses, approval state, and Arabic font readiness |
| [Verification And Revocation Controls](docs/verification-revocation.md) | Public verification, QR links, hash evidence, revocation workflow, and abuse monitoring |
| [Verification QR Accessibility Workflow](docs/verification-qr-accessibility-workflow.md) | QR and fallback verification release checks for print, mobile, accessibility, privacy, revocation, token rotation, and support evidence |
| [Revocation Ledger Audit](docs/revocation-ledger-audit.md) | Executable checks for revoked certificates, replacement links, timestamp order, preserved hashes, token handling, and notification evidence |
| [Tamper-Evident Hash Manifest](docs/hash-manifest.md) | Batch-level certificate evidence manifest with per-PDF hashes and manifest integrity checks |
| [Verification Receipt Evidence](docs/verification-receipt.md) | Tamper-evident JSON receipts for public lookup outcomes and support investigations |
| [Verification Token Rotation Runbook](docs/verification-token-rotation-runbook.md) | Scheduled and incident-driven rotation for verification tokens, QR links, lookup receipts, revocation state, support references, and audit evidence |
| [Verification Enumeration Resistance Workflow](docs/verification-enumeration-resistance-workflow.md) | Public lookup hardening workflow for token guessing, sequential probing, response normalization, rate limiting, abuse evidence, and privacy-minimized logs |
| [Certificate Signing Key Custody Runbook](docs/certificate-signing-key-custody-runbook.md) | Key custody, generation, rotation, backup, access review, compromise response, and batch-use evidence for certificate signing and verification trust material |
| [Batch Evidence Retention Schedule](docs/batch-evidence-retention-schedule.md) | Retention, redaction, deletion, legal hold, and ownership rules for issuance evidence across CSV files, PDFs, manifests, SMTP queues, verification receipts, revocations, and audit logs |
| [Certificate Delivery Proof Reconciliation Workflow](docs/certificate-delivery-proof-reconciliation.md) | Batch closure workflow for reconciling PDF hashes, queue state, SMTP message IDs, bounces, suppression, verification receipts, support disputes, and reissue evidence |
| [Support Case Redaction Guide](docs/support-case-redaction-guide.md) | Redaction rules for sharing certificate evidence in verification, delivery, correction, revocation, vendor-support, and audit cases |
| [Public Verification Abuse Response Playbook](docs/verification-abuse-response-playbook.md) | Response workflow for lookup spikes, token guessing, scraping, enumeration, exposed QR links, support-case abuse, containment, communications, and recovery |
| [Certificate Correction And Reissue Workflow](docs/certificate-correction-reissue-workflow.md) | Controlled workflow for certificate corrections, re-rendering, hash changes, revocation or supersession decisions, verification-token impact, delivery, and audit closure |
| [Certificate Revocation And Reissue Workflow](docs/certificate-revocation-reissue-workflow.md) | Revocation and replacement workflow for incorrect credentials, fraud reports, exposed verification tokens, public status handling, recipient notification, and closure evidence |

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

Open:

- Application: <http://localhost:8080>
- Designer: <http://localhost:8080/designer.html>
- CSV import: <http://localhost:8080/import.html>
- Queue monitor: <http://localhost:8080/queue.html>
- Verification: <http://localhost:8080/verify.php>
- Mailpit SMTP viewer: <http://localhost:8025>
- MySQL: `localhost:3307`

Run the worker once:

```bash
docker compose run --rm worker php bin/queue-worker.php --once
```

Run PHP syntax checks:

```bash
composer run lint
```

Run the batch release readiness demo:

```bash
php bin/batch-release-gate-demo.php examples/batch-release-readiness.json
```

Run the recipient data minimization audit:

```bash
php bin/recipient-data-audit-demo.php examples/recipient-data-minimization-policy.json
```

Run the recipient collision audit:

```bash
php bin/recipient-collision-audit-demo.php examples/recipient-collision-sample.csv
```

Run the revocation ledger audit:

```bash
php bin/revocation-ledger-audit-demo.php examples/revocation-ledger-sample.json
```

Run the template asset integrity audit:

```bash
php bin/template-asset-audit-demo.php examples/template-asset-manifest-sample.json
```

Run the SMTP domain alignment audit:

```bash
php bin/smtp-domain-alignment-audit-demo.php examples/smtp-domain-alignment-sample.json
```

Run the delivery suppression audit:

```bash
php bin/delivery-suppression-audit-demo.php examples/delivery-suppression-sample.json
```

## Certificate Template Model

Templates are stored as JSON-backed rows and rendered into PDF/A. Each text element declares a CSV source column, position, font size, alignment, color, and direction.

```json
{
  "page": { "width": 297, "height": 210, "orientation": "landscape" },
  "background": "storage/uploads/backgrounds/sample-certificate.png",
  "elements": [
    {
      "key": "recipient_name_ar",
      "label": "Arabic recipient name",
      "source": "name_ar",
      "x": 148.5,
      "y": 82,
      "width": 180,
      "height": 16,
      "font": "amiri",
      "fontSize": 24,
      "align": "center",
      "direction": "rtl",
      "color": "#111827"
    }
  ]
}
```

## Security Baseline

- Store application secrets outside Git.
- Generate a 32-byte sodium key for `APP_KEY`.
- Encrypt SMTP passwords before database storage.
- Enforce MFA for administrators.
- Rotate passwords every 90 days.
- Validate uploaded CSV, image, and font files by MIME type and size.
- Remediate PDF accessibility defects before release, and reconcile any resulting PDF hash or verification changes.
- Reject CSV files with empty headers, duplicate headers, or excessive recipient row counts.
- Audit recipient CSV fields against an approved data dictionary before generation or delivery.
- Block recipient collision findings before rendering certificates or creating delivery queue rows.
- Confirm retention, access role, storage encryption, and sharing evidence before processing recipient data.
- Keep generated PDFs outside the public web root.
- Issue verification receipts with only safe public metadata and canonical receipt hashes.
- Harden public verification against enumeration with high-entropy tokens, normalized responses, rate limits, and privacy-minimized abuse evidence.
- Govern certificate signing keys, QR secrets, verification-token secrets, and manifest sealing keys with custody, rotation, backup, and compromise-response evidence.
- Reconcile certificate hashes, queue records, SMTP events, bounces, suppression entries, and support disputes before batch closure.
- Audit revoked certificates for reason, authority, timestamp order, hash preservation, token handling, and replacement links.
- Record revocation and reissue decisions with source-of-truth evidence, recipient notification, public verification state, token impact, and closure proof.
- Log authentication, template, SMTP, CSV, generation, and delivery actions.
- Use TLS for SMTP and HTTPS for the application.
- Verify sender domains with SPF, DKIM, and DMARC before bulk delivery.
- Check hashed suppression records before sending to hard-bounced, complained, or manually held recipients.
- Audit delivery suppression, retry, complaint, and release evidence before resuming or approving high-volume batches.
- Run background delivery through CRON or a process supervisor.

## CRON Scheduling

Example CRON entry for a queue worker every minute:

```cron
* * * * * cd /var/www/certificate-issuer && php bin/queue-worker.php >> storage/logs/worker.log 2>&1
```

Each queue item has `scheduled_at`, `attempts`, `next_attempt_at`, `updated_at`, and `sent_at` fields. Delivery speed is controlled by `QUEUE_THROTTLE_SECONDS`. Jobs left in `processing` after a worker crash are recovered after `QUEUE_STALE_PROCESSING_MINUTES` minutes, then retried or marked failed according to the attempt counter.

## Verification Flow

Generated certificate jobs can store a public certificate number, a PDF SHA-256 hash, and a hashed verification token. The public verification page accepts the certificate number and token, then returns only safe certificate metadata.

Recommended production additions:

- QR code pointing to the verification route.
- Rate limits on verification attempts.
- Public response that confirms validity without exposing private CSV data.
- Administrative report of verification lookups.
- Revocation workflow for withdrawn, corrected, duplicate, or unauthorized certificates.
- Revocation ledger audit before publishing replacement or withdrawal evidence.
- Batch hash manifest for audit evidence, storage migration, and tamper investigation.
- Verification receipt export for support cases, recipient disputes, and audit sampling.
- Verification token rotation runbook for scheduled lifecycle review, exposed links, reissued certificates, and abuse investigations.
- Verification enumeration resistance workflow for token guessing, sequential probing, normalized lookup responses, and privacy-minimized abuse evidence.
- Certificate signing key custody runbook for signing material ownership, generation ceremony, access review, backup, rotation, compromise response, and batch evidence.
- Batch evidence retention schedule for raw CSV, rendered PDF, hash manifest, SMTP delivery, revocation, and support evidence lifecycle decisions.
- Certificate delivery proof reconciliation for batch closure, delivery disputes, resend decisions, and reissue evidence.
- Support case redaction guide for verification receipts, delivery disputes, corrections, revocations, and vendor support tickets.
- Public verification abuse response playbook for lookup spikes, token guessing, scraping, exposed QR links, and recovery evidence.
- Certificate correction and reissue workflow for recipient disputes, data corrections, re-rendering, hash-manifest changes, replacement delivery, and audit closure.
- Recipient data minimization audit output attached to the batch approval record.
- Recipient collision audit output attached to the batch approval record.

## Project Phases

1. Core infrastructure, database, authentication, MFA, SMTP encryption.
2. Visual template designer and bilingual PDF rendering.
3. CSV import, dynamic mapping, email template editor, throttled queue.
4. UAT, hardening, vulnerability assessment, and production deployment.

Detailed phase actions are documented in [docs/project-plan.md](docs/project-plan.md).

## Compliance And Operational Notes

The repository is designed for institutions that need controlled digital credential issuance. It does not include a legal compliance opinion. Before production use, perform:

- security architecture review,
- vulnerability assessment and penetration testing,
- SMTP deliverability testing,
- Arabic/English rendering UAT,
- backup and restore testing,
- hosting and privacy review,
- privacy and retention review.

Use the recipient data minimization audit before production imports to catch over-collected identifiers, sensitive fields, weak retention rules, and unapproved sharing paths.
Use the recipient collision audit before rendering or delivery to catch duplicate certificate identifiers, repeated email addresses, certificate-number conflicts, and ambiguous same-name/date recipient rows.

## License

MIT

<!-- portfolio:start -->
## Portfolio and Professional Profile

This repository is part of the professional portfolio of [Musaab Hasan](https://musaab.info), focused on cybersecurity, digital forensics, technology governance, EdTech, secure platforms, and research-driven digital transformation.

### Digital Forensics and Security Research Labs

- [Android Digital Forensics Lab](https://github.com/musaabhasan/android-forensics-lab) - Advanced Android forensics workbench for acquisition planning, anti-forensics evaluation, memory triage, evidence integrity, and case reconstruction.
- [Humanoid Robot Forensics Lab](https://github.com/musaabhasan/humanoid-robot-forensics-lab) - PHP/MySQL forensic casework platform for humanoid robot, companion app, and IoT evidence triage.
- [Smart Metering Security Lab](https://github.com/musaabhasan/smart-metering-security-lab) - Research portal based on smart metering security analysis for cyber-physical and smart-grid environments.
- [Drive-by Download ML Lab](https://github.com/musaabhasan/driveby-download-ml-lab) - Machine learning research portal for detecting drive-by download attacks and web-based malware delivery.
- [SQL Injection ML Detection Lab](https://github.com/musaabhasan/sqli-ml-detection-lab) - Research portal for SQL injection detection using machine learning and security telemetry.
- [IoT Board SSH Hardening Lab](https://github.com/musaabhasan/iot-board-ssh-hardening-lab) - SSH exposure assessment and hardening portal for IoT development boards and embedded Linux systems.
- [ZigBee WHAS Design Lab](https://github.com/musaabhasan/zigbee-whas-design-lab) - Research portal for designing and evaluating ZigBee wireless home automation systems.
- [Mammogram Fourier Analysis Lab](https://github.com/musaabhasan/mammogram-fourier-analysis-lab) - Medical image-processing research portal based on Fourier transform analysis for mammography.

### Security Culture and Transformation Platforms

- [Human Factors Risk Profiler](https://github.com/musaabhasan/human-factors-risk-profiler) - Human-centered security risk profiling portal for targeted interventions and behavior-aware controls.
- [Security Champion Network Portal](https://github.com/musaabhasan/security-champion-network-portal) - Platform for managing security champion networks, missions, recognition, and measurable impact.
- [Crisis Simulation Command Portal](https://github.com/musaabhasan/crisis-simulation-command-portal) - Cyber crisis simulation planning, scoring, and improvement platform for resilience exercises.
- [Behavioral Security Metrics Portal](https://github.com/musaabhasan/behavioral-security-metrics-portal) - Evidence-based security awareness metrics portal focused on behavior, culture, and intervention outcomes.
- [Security Culture Heatmap Portal](https://github.com/musaabhasan/security-culture-heatmap-portal) - Security culture maturity heatmap for norms, leadership signals, and organizational readiness.
- [Emerging Technology Security Culture Portal](https://github.com/musaabhasan/emerging-technology-security-culture-portal) - Adoption-readiness portal for emerging technology, governance, and security culture alignment.
- [Transformation Roadmap Portal](https://github.com/musaabhasan/transformation-roadmap-portal) - Roadmap platform for moving security culture programs from compliance orientation to resilience and measurable change.

### Governance, Education, and Secure Enablement

- [Professional Development Registration System Framework](https://github.com/musaabhasan/pdrs-framework) - Secure registration and Moodle enrollment automation framework for professional development programs.
- [Multilingual Certificate Issuer](https://github.com/musaabhasan/multilingual-certificate-issuer) - Arabic/English certificate design, PDF generation, and throttled SMTP distribution platform.
Professional profile and research portfolio: [https://musaab.info](https://musaab.info)
<!-- portfolio:end -->
