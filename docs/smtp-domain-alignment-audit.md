# SMTP Domain Alignment Audit

Certificate delivery is transactional, but it still depends on domain reputation, sender authentication, bounce handling, complaint handling, and secure transport. A certificate batch should not be released through an unapproved or weakly aligned SMTP profile.

The SMTP domain alignment audit checks whether a sending profile is ready for production certificate delivery.

## What It Checks

- From domain matches the approved institutional sending domain.
- SPF alignment evidence is present.
- DKIM configuration and selector are present.
- DMARC policy is `quarantine` or `reject`.
- Return-path alignment is documented.
- Bounce and complaint handlers are enabled.
- TLS is required for SMTP transport.
- Sender profile is approved or approved with controls.
- Throttle is present and within the safe default range.

## Run The Audit

```bash
php bin/smtp-domain-alignment-audit-demo.php examples/smtp-domain-alignment-sample.json
```

The command exits with `1` when high-severity sender findings are present. Use it before enabling a new sender domain, changing SMTP providers, or releasing a high-volume certificate batch.

## Recommended Workflow

1. Record the approved sending domain and sender profile evidence.
2. Verify SPF, DKIM, DMARC, return-path, TLS, bounce, and complaint handling before launch.
3. Set a conservative throttle for the provider and recipient volume.
4. Store the audit report with the batch release gate evidence.
5. Re-run the audit after DNS, provider, sender, or institutional domain changes.

## Review Questions

- Can operators prove that the sender domain belongs to the issuing institution?
- Will failed delivery and complaints update suppression records before retries continue?
- Is DMARC strong enough to reduce spoofing and protect recipient trust?
- Is TLS required for certificate attachments and recipient metadata?
- Are sender-domain changes routed through the same approval path as template and batch changes?
