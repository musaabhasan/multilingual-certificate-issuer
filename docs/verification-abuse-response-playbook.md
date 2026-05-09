# Public Verification Abuse Response Playbook

Use this playbook when the public certificate verification route shows suspicious lookup activity, token guessing, scraping, exposed QR links, repeated failed attempts, or attempts to infer private recipient information. The goal is to contain abuse without breaking legitimate certificate verification.

## Activation Triggers

| Trigger | Example |
| --- | --- |
| Failed lookup spike | Many invalid certificate/token combinations in a short period |
| Sequential enumeration | Repeated attempts across nearby certificate numbers |
| Token guessing | Many token attempts for the same certificate number |
| High-volume scraping | Excessive successful lookups from one network, user agent, or geography |
| Exposed QR link | Full verification URL appears in a public page, ticket, message, or search result |
| Suspicious support cases | Multiple requests for certificates that do not belong to the requester |
| Revoked certificate probing | Repeated lookups against revoked or replaced certificates |

## First 30 Minutes

| Step | Action | Owner | Evidence |
| --- | --- | --- | --- |
| Confirm signal | Review lookup logs, rate-limit events, user agents, IP ranges, and certificate numbers | Security owner | Lookup summary |
| Preserve evidence | Export relevant lookup windows, verification receipts, and support references | Security owner | Evidence package |
| Reduce exposure | Tighten rate limits, block obvious abusive sources, or enable temporary challenge controls | Operations owner | Control change |
| Protect affected records | Identify certificates with high failed attempts or exposed links | Records owner | Affected-scope list |
| Decide token rotation | Rotate exposed or heavily attacked verification tokens where needed | Records/security owner | Rotation record |
| Notify support | Provide safe response guidance and redaction rules | Support owner | Support note |

## Triage Questions

| Question | Decision |
| --- | --- |
| Is abuse targeting one certificate, one batch, or the whole verification route? |  |
| Are attempts mostly invalid, successful, or mixed? |  |
| Are certificate numbers being enumerated sequentially? |  |
| Were raw verification tokens or QR URLs exposed in support material or public pages? |  |
| Are revoked or replacement certificates involved? |  |
| Does the activity suggest a recipient dispute, credential fraud, scraping, or simple misconfiguration? |  |
| Is any personal data exposed beyond safe public metadata? |  |

## Containment Options

| Control | Use when | Caution |
| --- | --- | --- |
| IP or network throttling | Abuse is concentrated by source | Avoid blocking legitimate institutional networks without review |
| Per-certificate throttling | One certificate is being guessed repeatedly | May affect legitimate recipient troubleshooting |
| Token rotation | Token or QR link is exposed or heavily attacked | Coordinate support messaging and hash manifest impact |
| Temporary verification hold | Abuse creates privacy, fraud, or integrity risk | Provide safe support channel for legitimate verification |
| Revocation review | Certificate status may be disputed or fraudulent | Keep revocation separate from token rotation |
| Response minimization | Attackers are learning from error messages | Keep responses generic and safe |
| Support script update | Users or staff are sharing unsafe evidence | Apply redaction guide and remove raw tokens from replies |

## Evidence To Preserve

| Evidence | Notes |
| --- | --- |
| Lookup timestamps | Preserve time window before and after spike |
| Certificate numbers attempted | Store affected scope without unnecessary recipient data |
| Token-attempt patterns | Do not store raw tokens beyond required investigation evidence |
| Source IP or network category | Retain according to log retention policy |
| User agents | Useful for scripted scraping detection |
| Successful lookup receipts | Preserve canonical receipt hashes |
| Rate-limit events | Include rule, threshold, and action |
| Support cases | Redact before wider sharing |
| Token rotation records | Include old-token invalidation and validation result |

## Communications

| Audience | Message content |
| --- | --- |
| Support team | What to say, what not to share, and where to route escalations |
| Certificate owner | Affected scope, containment, token rotation, and any delivery or reissue impact |
| Security team | Abuse indicators, evidence package, containment decisions, and monitoring window |
| Recipients | Only if verification availability, token rotation, or replacement links affect them |
| External verifier | Provide a safe confirmation route without exposing private evidence |

## Recovery Criteria

| Criterion | Evidence |
| --- | --- |
| Failed lookup rate returns to expected baseline | Monitoring summary |
| No active token guessing or enumeration pattern remains | Lookup analysis |
| Exposed links are removed or rotated | Removal and rotation record |
| Legitimate verification succeeds | Sample lookup receipts |
| Support scripts and redaction guidance are updated | Support evidence |
| Incident or abuse record is closed with owner approval | Closure record |

## Post-Incident Review

After containment, review:

- whether public responses reveal too much about valid certificate numbers,
- whether rate limits are strict enough for token guessing and enumeration,
- whether QR links or support templates expose raw token material,
- whether verification receipts remain safe for external sharing,
- whether token rotation should be scheduled more often,
- whether revoked or replaced certificates need clearer public status handling.
