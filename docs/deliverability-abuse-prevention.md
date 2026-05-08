# Email Deliverability and Abuse Prevention

Certificate delivery is usually transactional, but the platform still sends
attachments to many recipients. Production deployments should protect sender
reputation, prevent misuse, and preserve enough evidence to investigate failed,
fraudulent, or unauthorized delivery.

## Delivery Control Objectives

| Objective | Control expectation |
| --- | --- |
| Sender authenticity | Use verified sending domains with SPF, DKIM, and DMARC alignment. |
| Authorized campaigns | Require an approved certificate batch, template, sender profile, and recipient source before queue release. |
| Recipient protection | Validate addresses, suppress repeated failures, and avoid sending private certificate data to unverified recipients. |
| Reputation protection | Throttle delivery, monitor bounces, and pause batches when failure rates exceed thresholds. |
| Abuse prevention | Prevent administrators from using the platform as a general bulk mailer. |
| Auditability | Preserve who approved, scheduled, paused, resumed, retried, and cancelled each batch. |

## SMTP Domain Readiness

Before production sending, confirm the sending domain has:

- SPF records that include the approved SMTP provider or institutional mail host.
- DKIM signing enabled for certificate messages.
- DMARC policy configured with reporting addresses monitored by the owner.
- A dedicated sender address such as `certificates@example.org`.
- TLS enforced between the application and SMTP server.
- Clear ownership for DNS, SMTP credentials, and deliverability monitoring.

For institutional deployments, avoid using personal mailboxes or shared
administrator accounts as sender identities. Use a controlled service mailbox or
transactional sender profile with a documented owner.

## Batch Approval Gate

Each delivery batch should be reviewed before release.

| Review item | Required evidence |
| --- | --- |
| Certificate template | Approved template ID and version. |
| Recipient source | CSV filename, uploader, row count, header validation result, and upload hash. |
| Sender profile | Approved SMTP profile and sender address. |
| Email template | Subject, language, dynamic tags, and attachment policy. |
| Schedule | Intended start time, throttle, retry policy, and maximum daily volume. |
| Data sensitivity | Classification of certificate data and attachment handling decision. |
| Approval | Approver, approval timestamp, and any release conditions. |

The queue worker should only process rows from approved batches. Pausing a batch
should stop new sends without deleting historical queue and audit records.

## Bounce and Failure Handling

Track failed delivery with structured reason categories.

| Category | Examples | Platform response |
| --- | --- | --- |
| Hard bounce | Mailbox does not exist, invalid domain | Suppress the address for the batch and require operator review. |
| Soft bounce | Temporary mailbox issue, greylisting, rate limit | Retry with backoff until the configured attempt limit is reached. |
| Authentication failure | SPF/DKIM/DMARC or relay error | Pause the batch and alert the SMTP profile owner. |
| Attachment rejection | PDF blocked, size limit exceeded | Review PDF size, attachment policy, and recipient domain constraints. |
| Policy rejection | Recipient domain blocks bulk or automated mail | Pause affected domain sends and review deliverability guidance. |

Recommended batch pause thresholds:

- hard bounce rate greater than 5% after at least 100 attempts,
- authentication failures greater than 1%,
- repeated SMTP 5xx responses from the same domain,
- sudden queue retry growth above the normal baseline.

## Abuse-Prevention Rules

The application should reject or require additional approval for:

- batches without certificate attachments or verification links,
- subjects unrelated to certificate issuance,
- recipient lists not tied to an approved CSV import,
- sender profiles owned by inactive users,
- throttles set below the institutional minimum,
- attempts to reuse a verification token across recipients,
- excessive retries to the same failed address,
- manual edits to generated PDFs after hash creation.

## Recipient Privacy

Certificate emails should avoid exposing unnecessary personal data. Recommended
practice:

- put one recipient per message,
- avoid CC and BCC for certificate delivery,
- keep private data out of the subject line,
- include only the minimum certificate fields needed in the email body,
- prefer a verification link when attachments are not required,
- expire or rotate verification tokens according to retention policy,
- log message metadata without storing full email bodies unless required.

## Operational Dashboard Signals

A production dashboard should show:

- queued, sent, failed, suppressed, and paused counts by batch,
- delivery rate against the configured throttle,
- bounce rate by domain,
- authentication failure count,
- retry backlog age,
- top failure reasons,
- last successful SMTP connection,
- batches waiting for approval,
- certificate verification lookups after delivery.

These signals help operators distinguish normal throttled sending from a broken
SMTP profile, a poor recipient list, or a potentially abusive batch.

## Incident Triggers

Open a security or operational incident when:

- a batch is sent without approval,
- a sender profile is changed immediately before a large batch,
- generated PDFs are publicly accessible outside the verification flow,
- a certificate is delivered to the wrong recipient,
- SMTP credentials are exposed or suspected to be exposed,
- verification lookup activity suggests enumeration,
- the queue worker sends faster than the configured throttle,
- email authentication failures appear after DNS or SMTP changes.

## Implementation Notes

Useful future database fields include `approved_by`, `approved_at`,
`pause_reason`, `suppressed_at`, `suppression_reason`, `smtp_response_code`,
`smtp_response_text`, `bounce_category`, and `recipient_domain`.

Queue logic should treat deliverability failures as operational evidence, not
only transient errors. This allows the platform to pause risky delivery, protect
sender reputation, and give auditors a complete view of certificate distribution.
