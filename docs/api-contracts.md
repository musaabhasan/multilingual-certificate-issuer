# API Contracts

The first implementation can be server-rendered PHP, but these contracts define the stable application boundary for future controllers or a front-end framework.

## Template Layout

`POST /templates`

```json
{
  "name_en": "Cybersecurity Awareness Certificate",
  "name_ar": "شهادة التوعية بالأمن السيبراني",
  "background_path": "storage/uploads/backgrounds/template.png",
  "layout": {
    "page": { "width": 297, "height": 210, "orientation": "landscape" },
    "elements": []
  }
}
```

## CSV Mapping

`POST /batches`

```json
{
  "template_id": 1,
  "name": "May 2026 Cohort",
  "mapping": {
    "recipient_email": "email",
    "recipient_name_en": "name_en",
    "recipient_name_ar": "name_ar",
    "unique_identifier": "unique_identifier"
  }
}
```

## Render Certificate

`POST /certificate-jobs`

```json
{
  "batch_id": 1,
  "mode": "bulk"
}
```

## Schedule Distribution

`POST /mail-queue`

```json
{
  "batch_id": 1,
  "smtp_profile_id": 1,
  "email_template_id": 1,
  "scheduled_at": "2026-05-05T10:00:00Z",
  "throttle_seconds": 60
}
```

## Error Format

```json
{
  "error": {
    "code": "validation_failed",
    "message": "CSV file is missing required columns.",
    "fields": {
      "email": ["Required column is missing."]
    }
  }
}
```
