const test = require('node:test');

// Week 5 - Polish and demo readiness
// Logging and documentation are intentionally left out here because
// the document does not define a stable machine-verifiable contract yet.

test.todo('GET /system/health returns api status plus database connectivity details for demo sanity checks');

test.todo('GET /system/health returns a non-200 status when the database dependency is unavailable');

test.todo('POST /devices/:id/heartbeat updates the device last-seen timestamp and keeps the device online');

test.todo('POST /devices/:id/heartbeat returns 404 when the device does not exist');

test.todo('seed/demo data script creates example devices that can be listed by GET /devices');

test.todo('seed/demo data script creates sample sensor history that can be queried by GET /devices/:id/latest and GET /devices/:id/history');

test.todo('seed/demo data script creates sample alerts so the dashboard alerts view has demo-ready data');
