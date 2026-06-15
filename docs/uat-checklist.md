# User Acceptance Testing Checklist

## Test Data

Use synthetic Arabic and English recipient records. Do not use real student or participant data during initial UAT.

## Template Design

| Test | Expected Result | Pass |
| --- | --- | --- |
| Upload PNG background | Background is accepted and previewed |  |
| Upload JPG background | Background is accepted and previewed |  |
| Add Arabic name field | RTL text appears in correct direction |  |
| Add English name field | LTR text appears in correct direction |  |
| Export layout JSON | Coordinates and fields are saved |  |
| Reopen template | Layout matches saved version |  |

## CSV Import

| Test | Expected Result | Pass |
| --- | --- | --- |
| Upload valid CSV | Rows are parsed with headers |  |
| Missing email column | Validation error appears |  |
| Duplicate unique identifier | Duplicate is rejected or flagged |  |
| Arabic names in CSV | Characters are preserved |  |
| Large batch | Import completes within accepted time |  |

## PDF Generation

| Test | Expected Result | Pass |
| --- | --- | --- |
| Generate single certificate | PDF/A file is created |  |
| Generate Arabic/English certificate | Both languages render correctly |  |
| Bulk generation | One PDF per recipient is created |  |
| Invalid template | Job fails with safe error |  |
| Private storage | PDF is not directly web-accessible |  |

## Email Distribution

| Test | Expected Result | Pass |
| --- | --- | --- |
| SMTP test | TLS/SSL connection succeeds |  |
| Schedule future delivery | Queue waits until scheduled time |  |
| Throttle set to 60 seconds | Worker sends one email per minute |  |
| Failed SMTP send | Retry is scheduled |  |
| Attachment delivered | Recipient receives certificate PDF |  |

## Security

| Test | Expected Result | Pass |
| --- | --- | --- |
| Weak admin password | Account creation or password change is rejected |  |
| Expired password | Password rotation is required |  |
| Unauthorized role | Access to restricted action is denied |  |
| Audit log review | Action is recorded with actor and metadata |  |
| Direct storage URL | Access is denied |  |
