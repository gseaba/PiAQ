# PiAQ Backend Design

## Scope

The backend is responsible for:

- registering devices
- ingesting summarized sensor windows from Raspberry Pi devices
- persisting sensor history in PostgreSQL
- serving dashboard-ready latest, history, alert, and alert-rule endpoints
- evaluating threshold-based alerts after new readings are stored

## Core Tables

- `devices`: device identity, location label, registration time, and last-seen status
- `sensor_readings`: time-windowed sensor summaries keyed by `device_id + window_start + window_end`
- `alert_rules`: per-device threshold rules with metric, operator, threshold, duration, and enabled state
- `alerts`: active and resolved alert windows generated from rule evaluation
- `device_sync_state`: tracks the highest uploaded `window_end` per device so delayed batches do not move sync state backward

## API Contract

### `POST /devices/register`

```json
{
  "deviceId": "pi-001",
  "locationLabel": "Engineering Lab"
}
```

### `POST /ingest/batch`

```json
{
  "deviceId": "pi-001",
  "readings": [
    {
      "windowStart": "2026-04-23T10:00:00.000Z",
      "windowEnd": "2026-04-23T10:05:00.000Z",
      "sampleCount": 10,
      "co2_avg": 600,
      "co2_max": 720,
      "voc_avg": 100,
      "voc_max": 130,
      "pm1_0_avg": 1.2,
      "pm2_5_avg": 2.3,
      "pm10_avg": 3.4,
      "temperature": 22.4,
      "humidity": 48.5
    }
  ]
}
```

### `GET /devices/:deviceId/latest`

Returns the most recent summary window and a metric map shaped for the dashboard.

### `GET /devices/:deviceId/history`

Query params:

- `start`: ISO8601 timestamp
- `end`: ISO8601 timestamp
- `bucket`: duration string like `5m`, `1h`, or `1d`
- `metric` optional: one of `co2`, `voc`, `pm1_0`, `pm2_5`, `pm10`, `temperature`, `humidity`

### `GET /devices/:deviceId/alerts`

Optional query param:

- `status`: `active` or `resolved`

### `GET /devices/:deviceId/rules`

Returns current device-specific alert rules.

### `PUT /devices/:deviceId/rules`

Replaces current device-specific alert rules with the provided array.

```json
{
  "rules": [
    {
      "metricName": "co2",
      "operator": ">=",
      "thresholdValue": 1000,
      "durationSeconds": 300,
      "enabled": true
    }
  ]
}
```

## Alert Semantics

- Alert evaluation runs after new `sensor_readings` rows are inserted.
- Rules are evaluated against each rule's metric column.
- `co2` and `voc` use their `*_max` column when available and fall back to `*_avg`.
- Other metrics use their stored average column.
- Consecutive violating windows are merged into a single alert segment.
- A segment creates an alert only after it reaches the rule's `durationSeconds`.
- An unfinished violating segment is stored as `active`.
- A segment followed by a normal window is stored as `resolved` with `endedAt`.
- Replayed duplicate batches do not create duplicate alerts because duplicate reading windows are ignored and alert evaluation only reruns when new rows are inserted.
- Delayed batches are supported because sync state uses the maximum uploaded `window_end` and alert evaluation is based on stored reading timestamps, not arrival time.

## Current Integration Note

The Raspberry Pi uploader in `raspberryPi/uploader/uploader.py` still posts a single raw reading to a different URL shape than `/ingest/batch`. The backend contract above is the confirmed server-side contract; the Pi client should be updated separately to match it.
