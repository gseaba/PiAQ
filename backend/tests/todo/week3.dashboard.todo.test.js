const test = require('node:test');

// Week 3 - Dashboard query endpoints
// These are intentionally non-failing placeholders so the future API
// contract can be implemented and then converted into active tests.

test.todo('GET /devices returns all registered devices with status, locationLabel, registeredAt, and lastSeenAt');

test.todo('GET /devices returns devices in a stable order that is easy for the dashboard to render');

test.todo('GET /devices/:id/latest returns the most recent summary window for the requested device');

test.todo('GET /devices/:id/latest returns 404 when the requested device does not exist');

test.todo('GET /devices/:id/history returns chart-ready points for a requested metric and time range');

test.todo('GET /devices/:id/history groups readings by requested bucket size and preserves chronological order');

test.todo('GET /devices/:id/history rejects unsupported metric names or invalid range parameters with 400 validation errors');

test.todo('GET /devices/:id/history returns an empty points array instead of failing when no readings exist in the requested range');

test.todo('GET /devices/:id/alerts returns active alerts and recent resolved alerts for the selected device');

test.todo('GET /devices/:id/alerts can filter by alert status once the frontend contract is finalized');

test.todo('latest/history/alerts controllers map database rows into the final frontend response shape once that shape is confirmed');

test.todo('history service aggregates sensor_readings into bucketed values without losing bucket boundaries');

test.todo('alerts service reads alert rows in descending recency order so the newest items appear first on the dashboard');
