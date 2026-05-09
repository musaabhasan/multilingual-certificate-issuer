# Delivery Suppression And Bounce Governance Audit

Certificate delivery can damage recipient trust and institutional sender reputation when failed sends are retried without governance. Hard bounces, complaints, recipient requests, manual holds, and correction holds should stop future delivery until an accountable reviewer releases the suppression.

This audit turns delivery suppression into a repeatable pre-release control for certificate batches.

## What The Audit Checks

The auditor reviews:

- hard-bounce, complaint, manual-hold, queue-check, and release-approval policy settings,
- retry limit and retry backoff configuration,
- hard-bounce and complaint rates against release thresholds,
- suppression entries for hashed identity, masked identity, reason, source, timestamp, and approval evidence,
- released suppressions for release timestamp and release approval,
- queue rows for suppression-check evidence before delivery,
- active suppressions that are still queued,
- queue rows that exceeded retry limits,
- failed rows without error evidence,
- scheduled rows without scheduled delivery evidence.

## Run The Audit

```bash
php bin/delivery-suppression-audit-demo.php
```

Use a custom batch file:

```bash
php bin/delivery-suppression-audit-demo.php path/to/delivery-suppression.json
```

The command returns exit code `0` when the batch passes high-severity release checks and exit code `1` when delivery should be blocked.

## Input Shape

```json
{
  "batch_id": "batch-2026-credentialing-042",
  "release_status": "approved_with_controls",
  "suppression_policy": {
    "hard_bounce_suppresses": true,
    "complaint_suppresses": true,
    "manual_hold_blocks_delivery": true,
    "suppression_checked_before_queueing": true,
    "release_requires_approval": true,
    "retry_limit": 3,
    "retry_backoff_minutes": 60,
    "max_hard_bounce_rate": 0.02,
    "max_complaint_rate": 0.001
  },
  "delivery_metrics": {
    "total_recipients": 1200,
    "hard_bounces": 4,
    "complaints": 0,
    "suppressed_recipients": 7,
    "retry_queue": 18,
    "failed_after_retries": 1
  }
}
```

## Finding Types

| Finding | Severity | Meaning |
| --- | --- | --- |
| `hard_bounce_suppresses_missing` | High | Hard bounces do not automatically suppress future sends |
| `complaint_suppresses_missing` | High | Complaints do not automatically suppress future sends |
| `manual_hold_blocks_delivery_missing` | High | Manual holds do not block delivery |
| `suppression_checked_before_queueing_missing` | High | Queue rows can be created without suppression checks |
| `release_requires_approval_missing` | High | Suppressions can be released without approval |
| `retry_limit_out_of_range` | Medium | Retry limit is missing or outside safe bounds |
| `retry_backoff_too_short` | Medium | Retry backoff allows rapid repeated delivery attempts |
| `hard_bounce_rate_exceeded` | High | Hard-bounce rate exceeds release threshold |
| `complaint_rate_exceeded` | High | Complaint rate exceeds release threshold |
| `suppression_identity_gap` | High | Suppression lacks hashed or masked recipient identity |
| `suppression_reason_unknown` | Medium | Suppression reason is outside the approved reason set |
| `manual_hold_approval_gap` | Medium | Manual or correction hold lacks approval evidence |
| `suppression_release_evidence_gap` | High | Released suppression lacks timestamp or approval evidence |
| `queue_without_suppression_check` | High | Deliverable queue item lacks suppression-check evidence |
| `suppressed_recipient_queued` | High | Active suppressed recipient is still queued |
| `retry_limit_exceeded` | High | Queue item exceeded retry policy without final state |
| `failed_error_gap` | Medium | Failed row lacks delivery error evidence |
| `scheduled_at_gap` | Medium | Scheduled row lacks scheduled delivery timestamp |

## Operating Use

Run this audit before:

- releasing a large certificate batch,
- resuming delivery after a provider outage,
- reissuing corrected certificates,
- clearing manual holds,
- responding to recipient complaints,
- exporting evidence for an audit or support case.

For each release, preserve the JSON report with the batch evidence package. It should sit next to the CSV intake evidence, template approval, PDF hash manifest, SMTP alignment audit, suppression records, queue export, and final delivery metrics.
