const test = require('node:test');
const assert = require('node:assert/strict');

const { requestJson, withServer } = require('../helpers/http');
const { loadFresh } = require('../helpers/module-loader');

function loadApp({ deviceService, ingestService } = {}) {
    return loadFresh('src/app.js', {
        mocks: {
            'src/services/devices.service.js': deviceService || {
                registerDevice: async () => {
                    throw new Error('registerDevice stub not configured');
                }
            },
            'src/services/ingest.service.js': ingestService || {
                ingestBatch: async () => {
                    throw new Error('ingestBatch stub not configured');
                }
            }
        },
        clear: [
            'src/routes/devices.routes.js',
            'src/routes/ingest.routes.js',
            'src/controllers/devices.controller.js',
            'src/controllers/ingest.controller.js'
        ]
    });
}

function createValidReading(overrides = {}) {
    return {
        windowStart: '2026-04-23T10:00:00.000Z',
        windowEnd: '2026-04-23T10:05:00.000Z',
        sampleCount: 10,
        co2_avg: 600,
        co2_max: 700,
        voc_avg: 100,
        voc_max: 120,
        pm1_0_avg: 1.1,
        pm2_5_avg: 2.2,
        pm10_avg: 3.3,
        temperature: 22.4,
        humidity: 48.5,
        ...overrides
    };
}

test('GET /health returns the backend health payload', async () => {
    const app = loadApp();

    await withServer(app, async (baseUrl) => {
        const response = await requestJson(baseUrl, '/health');

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, {
            status: 'ok',
            message: 'PiAQ backend is running'
        });
    });
});

test('POST /devices/register rejects requests without a deviceId', async () => {
    const app = loadApp();

    await withServer(app, async (baseUrl) => {
        const response = await requestJson(baseUrl, '/devices/register', {
            method: 'POST',
            body: {
                locationLabel: 'Hallway'
            }
        });

        assert.equal(response.status, 400);
        assert.equal(response.body.error, 'Validation failed');
        assert.ok(
            response.body.details.some((detail) =>
                detail.field === 'deviceId' && detail.message === 'deviceId is required'
            )
        );
    });
});

test('POST /devices/register rejects location labels longer than 150 characters', async () => {
    const app = loadApp();

    await withServer(app, async (baseUrl) => {
        const response = await requestJson(baseUrl, '/devices/register', {
            method: 'POST',
            body: {
                deviceId: 'pi-001',
                locationLabel: 'L'.repeat(151)
            }
        });

        assert.equal(response.status, 400);
        assert.ok(
            response.body.details.some((detail) =>
                detail.field === 'locationLabel' &&
                detail.message === 'locationLabel must be 150 characters or fewer'
            )
        );
    });
});

test('POST /devices/register returns the normalized controller response', async () => {
    const app = loadApp({
        deviceService: {
            registerDevice: async ({ deviceId, locationLabel }) => ({
                id: 5,
                device_id: deviceId,
                location_label: locationLabel,
                status: 'online',
                registered_at: '2026-04-23T12:00:00.000Z',
                last_seen_at: '2026-04-23T12:03:00.000Z'
            })
        }
    });

    await withServer(app, async (baseUrl) => {
        const response = await requestJson(baseUrl, '/devices/register', {
            method: 'POST',
            body: {
                deviceId: 'pi-001',
                locationLabel: 'Mechanical Room'
            }
        });

        assert.equal(response.status, 201);
        assert.deepEqual(response.body, {
            message: 'Device registered successfully',
            device: {
                id: 5,
                deviceId: 'pi-001',
                locationLabel: 'Mechanical Room',
                status: 'online',
                registeredAt: '2026-04-23T12:00:00.000Z',
                lastSeenAt: '2026-04-23T12:03:00.000Z'
            }
        });
    });
});

test('POST /ingest/batch rejects an empty readings array', async () => {
    const app = loadApp();

    await withServer(app, async (baseUrl) => {
        const response = await requestJson(baseUrl, '/ingest/batch', {
            method: 'POST',
            body: {
                deviceId: 'pi-001',
                readings: []
            }
        });

        assert.equal(response.status, 400);
        assert.ok(
            response.body.details.some((detail) =>
                detail.field === 'readings' &&
                detail.message === 'readings must be a non-empty array'
            )
        );
    });
});

test('POST /ingest/batch rejects invalid reading fields', async () => {
    const app = loadApp();

    await withServer(app, async (baseUrl) => {
        const response = await requestJson(baseUrl, '/ingest/batch', {
            method: 'POST',
            body: {
                deviceId: 'pi-001',
                readings: [
                    createValidReading({
                        windowStart: 'not-a-date',
                        sampleCount: 0,
                        co2_avg: -1,
                        temperature: 'warm',
                        humidity: 101
                    })
                ]
            }
        });

        assert.equal(response.status, 400);
        assert.ok(
            response.body.details.some((detail) =>
                detail.field === 'readings[0].windowStart' &&
                detail.message === 'windowStart must be a valid ISO8601 timestamp'
            )
        );
        assert.ok(
            response.body.details.some((detail) =>
                detail.field === 'readings[0].sampleCount' &&
                detail.message === 'sampleCount must be an integer greater than 0'
            )
        );
        assert.ok(
            response.body.details.some((detail) =>
                detail.field === 'readings[0].co2_avg' &&
                detail.message === 'co2_avg must be a non-negative number'
            )
        );
        assert.ok(
            response.body.details.some((detail) =>
                detail.field === 'readings[0].temperature' &&
                detail.message === 'temperature must be a number'
            )
        );
        assert.ok(
            response.body.details.some((detail) =>
                detail.field === 'readings[0].humidity' &&
                detail.message === 'humidity must be a number between 0 and 100'
            )
        );
    });
});

test('POST /ingest/batch returns the ingest summary from the service', async () => {
    const app = loadApp({
        ingestService: {
            ingestBatch: async ({ deviceId, readings }) => ({
                deviceId,
                receivedCount: readings.length,
                insertedCount: 1,
                duplicateCount: readings.length - 1
            })
        }
    });

    await withServer(app, async (baseUrl) => {
        const response = await requestJson(baseUrl, '/ingest/batch', {
            method: 'POST',
            body: {
                deviceId: 'pi-001',
                readings: [
                    createValidReading(),
                    createValidReading({
                        windowStart: '2026-04-23T10:05:00.000Z',
                        windowEnd: '2026-04-23T10:10:00.000Z'
                    })
                ]
            }
        });

        assert.equal(response.status, 201);
        assert.deepEqual(response.body, {
            message: 'Batch ingested successfully',
            deviceId: 'pi-001',
            receivedCount: 2,
            insertedCount: 1,
            duplicateCount: 1
        });
    });
});

test('POST /ingest/batch uses the app error handler for service errors', async () => {
    const app = loadApp({
        ingestService: {
            ingestBatch: async () => {
                const error = new Error('Unknown deviceId: pi-404');
                error.status = 404;
                throw error;
            }
        }
    });
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
        await withServer(app, async (baseUrl) => {
            const response = await requestJson(baseUrl, '/ingest/batch', {
                method: 'POST',
                body: {
                    deviceId: 'pi-404',
                    readings: [createValidReading()]
                }
            });

            assert.equal(response.status, 404);
            assert.deepEqual(response.body, {
                error: 'Unknown deviceId: pi-404'
            });
        });
    } finally {
        console.error = originalConsoleError;
    }
});
