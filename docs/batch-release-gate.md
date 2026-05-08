# Batch Release Gate

The batch release gate converts delivery approval guidance into an executable readiness check. It is designed to run before a certificate batch is released to the SMTP queue or before a paused batch is resumed.

## What The Gate Checks

| Check | Purpose |
| --- | --- |
| Batch reference | Confirms a stable release identifier exists for audit and support cases. |
| Template approval | Blocks delivery from draft or retired certificate templates. |
| Batch approval | Requires approver identity and approval timestamp before release. |
| Rendered count | Confirms every approved recipient has a rendered certificate. |
| Queue count | Confirms every approved recipient has one queued delivery row. |
| Hash manifest | Requires certificate PDF hash manifest verification before attachments are sent. |
| Suppression check | Confirms hard-bounce, complaint, manual-hold, and policy suppressions were checked. |
| SMTP profile | Confirms an active sender profile is selected. |
| Domain alignment | Requires SPF, DKIM, and DMARC readiness for the sending domain. |
| Throttle | Enforces a minimum send interval to protect deliverability. |
| Schedule | Requires a valid scheduled release timestamp. |
| Delivery mode | Requires explicit use of attachment, verification link, or both. |

## Demo Command

```bash
php bin/batch-release-gate-demo.php examples/batch-release-readiness.json
```

The demo returns one readiness report per batch:

- `release_allowed`: whether the batch can be released.
- `risk_level`: `low`, `medium`, or `high`.
- `failed_checks`: number of blocking checks.
- `checks`: pass/fail details with evidence and recommended correction.

## Operational Use

Run the gate before:

- first queue release,
- manual resume after a pause,
- re-send after a delivery incident,
- SMTP profile change,
- template version change,
- bulk recipient-list replacement.

The release gate should be treated as a control point, not only a report. Batches with failed checks should remain paused until the owner fixes the evidence gap or records a formal override through the audit log.

## Suggested Future Integration

In a production controller, collect the readiness fields from database records:

- `recipient_batches`
- `certificate_templates`
- `certificate_jobs`
- `mail_queue`
- `smtp_profiles`
- `email_suppressions`
- hash manifest storage
- batch approval records

Then write the release decision into the audit log with the full readiness report hash so future investigators can prove what was checked before delivery.
