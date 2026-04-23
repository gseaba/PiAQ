const test = require('node:test');

// Week 4 - Alert engine and offline handling
// These placeholders reflect the architecture document's threshold,
// idempotency, and delayed-batch expectations.

test.todo('ingestBatch evaluates alert rules after inserting new readings');

test.todo('alert service opens a new active alert when a metric exceeds its threshold for the required duration');

test.todo('alert service does not create a duplicate active alert when the same rule remains violated across later batches');

test.todo('alert service updates peak_value while an alert remains active');

test.todo('alert service resolves an active alert when readings return to normal and sets ended_at');

test.todo('alert service supports consecutive-window threshold checks such as CO2 above threshold for N windows');

test.todo('GET /devices/:id/alerts returns both active and resolved rows after alert transitions occur');

test.todo('POST /ingest/batch remains idempotent when the same delayed batch is retried');

test.todo('POST /ingest/batch accepts older window timestamps instead of assuming real-time arrival');

test.todo('POST /ingest/batch keeps device_sync_state.last_uploaded_timestamp at the maximum uploaded window_end even when an older delayed batch arrives later');

test.todo('POST /ingest/batch preserves duplicate protection with the device_id + window_start + window_end uniqueness rule');

test.todo('delayed batches can still trigger alerts based on their own timestamps once alert-evaluation time semantics are finalized');

test.todo('PUT /devices/:id/rules validates metric_name, operator, threshold_value, duration_seconds, and enabled');

test.todo('GET /devices/:id/rules returns device-specific rules in a stable shape for frontend editing');
