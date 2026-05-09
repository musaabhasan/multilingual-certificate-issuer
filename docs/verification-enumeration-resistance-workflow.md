# Verification Enumeration Resistance Workflow

This workflow defines controls for protecting public certificate verification pages from certificate-number enumeration, token guessing, scraping, bulk lookup, and inference attacks. It complements verification receipts, token rotation, abuse response, and delivery proof reconciliation by focusing on how the lookup surface behaves before, during, and after suspicious traffic.

## Objectives

- Make valid and invalid lookup responses difficult to distinguish beyond the intended verification result.
- Prevent attackers from discovering certificate numbers, recipient names, issue dates, or revocation states through high-volume probing.
- Preserve safe evidence for abuse investigations without exposing raw recipient data.
- Keep legitimate QR and fallback-code verification usable for employers, institutions, auditors, and recipients.
- Define thresholds for rate limiting, alerting, token rotation, and incident response.

## Public Lookup Risk Scenarios

| Scenario | Risk | Control Focus |
| --- | --- | --- |
| Sequential certificate-number guessing | Attacker discovers issued certificates | Non-sequential IDs, token requirement, rate limit |
| Token brute force | Attacker confirms valid verification links | High entropy, hashed tokens, lockout, monitoring |
| Response timing differences | Attacker infers valid records from latency | Response normalization and bounded timing |
| Revocation probing | Attacker maps revoked or corrected certificates | Minimal status details, support escalation |
| QR scraping | Public images expose reusable verification links | Token rotation, short display codes, monitoring |
| Bulk employer lookup misuse | Legitimate verifier exceeds intended scope | API throttles, justification, support workflow |
| Support-channel social engineering | Attacker requests hidden verification data | redacted evidence package and requester checks |

## Token And Identifier Requirements

| Control | Minimum Standard |
| --- | --- |
| Certificate number format | Avoid simple sequential public identifiers where possible |
| Verification token | At least 128 bits of randomness before encoding |
| Token storage | Store only a keyed hash or strong one-way hash, not raw tokens |
| QR content | Link to verification route with token or one-time lookup code |
| Fallback text | Provide a human-readable code that does not reveal issuance volume |
| Token rotation | Support scheduled, incident-driven, and reissue-driven rotation |
| Revocation state | Show only the minimum status required for public trust |

## Response Normalization

Public verification should avoid leaking unnecessary signals.

| Area | Recommended Behavior |
| --- | --- |
| Invalid certificate number | Return a generic "not verified" result without confirming number existence |
| Invalid token | Use the same generic result as unknown record |
| Revoked certificate | Show status only when the token and certificate number are valid |
| Corrected or superseded certificate | Direct verifier to the current certificate only when authorized by valid token |
| Error messages | Avoid stack traces, SQL errors, provider errors, or field-level hints |
| Timing | Keep lookup timing within a bounded window where practical |
| Public metadata | Return only certificate title, issuer, issue date, status, and safe recipient display name where policy allows |

## Rate Limiting And Detection

| Signal | Suggested Threshold | Action |
| --- | --- | --- |
| Failed lookups per IP | More than 10 in 5 minutes | Slow response and log event |
| Distinct certificate numbers per IP | More than 20 in 15 minutes | Challenge, temporary block, or support handoff |
| Token failures per certificate | More than 5 in 15 minutes | Flag certificate for token review |
| High-volume valid lookups | Unusual spike above baseline | Review verifier source and purpose |
| Lookups across sequential IDs | Pattern detected | Treat as enumeration attempt |
| Repeated revoked-status checks | Repeated checks for revoked records | Review for misuse or dispute |
| QR referrer anomaly | Many QR lookups from unexpected referrers | Investigate exposed image or scraping |

Tune thresholds to local traffic, but document the baseline and approval owner before increasing limits.

## Abuse Investigation Evidence

| Evidence | Retention Note |
| --- | --- |
| Timestamp and route | Keep for security review period |
| Source IP hash and user-agent hash | Prefer hashes in routine reports |
| Certificate number hash | Avoid exposing raw certificate numbers in abuse dashboards |
| Token hash prefix or lookup category | Never store raw tokens in abuse reports |
| Result class | Valid, invalid, revoked, superseded, rate-limited, blocked |
| Rate-limit decision | Policy, threshold, and enforcement result |
| Support case reference | Link only to redacted support package |

## Operational Workflow

1. Establish baseline verification traffic by channel, verifier type, geography, and event batch.
2. Confirm token entropy, hashed storage, non-sequential identifiers, and QR fallback behavior.
3. Test invalid, expired, revoked, superseded, and corrected certificate responses for information leakage.
4. Configure rate limits for IP, certificate number, token failures, and source pattern.
5. Review logs for sequential lookup patterns and repeated revoked-status probing.
6. Trigger token rotation when a QR image, email, PDF, support attachment, or public page exposes reusable verification links.
7. Create a redacted abuse evidence package for incidents that require security, legal, or issuer review.

## Release Checklist

| Check | Status | Evidence |
| --- | --- | --- |
| Tokens are generated with sufficient entropy | Pass / gap |  |
| Raw verification tokens are not stored | Pass / gap |  |
| Invalid number and invalid token responses are normalized | Pass / gap |  |
| Revocation details require a valid token | Pass / gap |  |
| Sequential or bulk lookup detection is enabled | Pass / gap |  |
| Rate-limit thresholds are documented and approved | Pass / gap |  |
| Abuse logs avoid raw recipient data and raw tokens | Pass / gap |  |
| Token rotation runbook is linked to abuse response | Pass / gap |  |
| Support staff have a safe verification evidence package | Pass / gap |  |

## Metrics

| Metric | Purpose |
| --- | --- |
| Invalid lookup rate | Detects probing and usability issues |
| Token failure rate | Identifies guessing or broken QR links |
| Unique certificate numbers per source | Detects enumeration |
| Rate-limited requests | Shows enforcement activity |
| Valid lookup baseline by batch | Supports anomaly detection |
| Token rotations after exposure | Measures containment workload |
| Support verification disputes | Reveals response or lookup clarity issues |

## Closure Criteria

Verification enumeration resistance is ready when public lookup behavior is normalized, token entropy is documented, abuse thresholds are approved, logs are privacy-minimized, token rotation is operational, and support teams can resolve legitimate verification questions without exposing sensitive certificate or recipient data.
