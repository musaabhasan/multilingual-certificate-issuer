# Contributing

Contributions are welcome when they improve security, bilingual rendering, delivery reliability, or operational clarity.

## Good Contributions

- Additional PDF renderer integrations.
- Arabic font rendering tests.
- CSV validation improvements.
- Queue retry and observability improvements.
- Security hardening notes.
- Deployment examples for UAE-hosted infrastructure.

## Development Checks

```bash
composer validate
composer run lint
```

## Pull Request Checklist

- No real recipient data is included.
- No secrets are committed.
- New code validates untrusted input.
- Security-sensitive changes update documentation.
- Bilingual behavior is tested with Arabic and English samples where relevant.
