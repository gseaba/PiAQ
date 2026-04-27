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
                },
                listDevices: async () => {
                    throw new Error('listDevices stub not configured');
                },
                getLatestDeviceSummary: async () => {
                    throw new Error('getLatestDeviceSummary stub not configured');
                },
                getDeviceHistory: async () => {
                    throw new Error('getDeviceHistory stub not configured');
                },
                getDeviceAlerts: async () => {
                    throw new Error('getDeviceAlerts stub not configured');
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

test('GET /devices returns registered devices in the dashboard response shape', async () => {
    const app = loadApp({
        deviceService: {
            registerDevice: async () => {
                throw new Error('registerDevice should not be called');
            },
            listDevices: async () => ([
                {
                    id: 1,
                    device_id: 'pi-001',
                    location_label: 'Atrium',
                    status: 'online',
                    registered_at: '2026-04-23T12:00:00.000Z',
                    last_seen_at: '2026-04-23T12:05:00.000Z'
                },
                {
                    id: 2,
                    device_id: 'pi-002',
                    location_label: null,
                    status: 'offline',
                    registered_at: '2026-04-23T11:00:00.000Z',
                    last_seen_at: null
                }
            ]),
            getLatestDeviceSummary: async () => {
                throw new Error('getLatestDeviceSummary should not be called');
            },
            getDeviceHistory: async () => {
                throw new Error('getDeviceHistory should not be called');
            },
            getDeviceAlerts: async () => {
                throw new Error('getDeviceAlerts should not be called');
            }
        }
    });

    await withServer(app, async (baseUrl) => {
        const response = await requestJson(baseUrl, '/devices');

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, {
            devices: [
                {
                    id: 1,
                    deviceId: 'pi-001',
                    locationLabel: 'Atrium',
                    status: 'online',
                    registeredAt: '2026-04-23T12:00:00.000Z',
                    lastSeenAt: '2026-04-23T12:05:00.000Z'
                },
                {
                    id: 2,
                    deviceId: 'pi-002',
                    locationLabel: null,
                    status: 'offline',
                    registeredAt: '2026-04-23T11:00:00.000Z',
                    lastSeenAt: null
                }
            ]
        });
    });
});

test('GET /devices/:deviceId/latest returns the latest summary window', async () => {
    const app = loadApp({
        deviceService: {
            registerDevice: async () => {
                throw new Error('registerDevice should not be called');
            },
            listDevices: async () => {
                throw new Error('listDevices should not be called');
            },
            getLatestDeviceSummary: async (deviceId) => ({
                device_id: deviceId,
                window_start: '2026-04-23T10:00:00.000Z',
                window_end: '2026-04-23T10:05:00.000Z',
                sample_count: 12,
                co2_avg: 612.5,
                co2_max: 701.4,
                voc_avg: 104.2,
                voc_max: 140.8,
                pm1_0_avg: 1.4,
                pm2_5_avg: 2.5,
                pm10_avg: 3.1,
                temperature: 22.8,
                humidity: 49.1
            }),
            getDeviceHistory: async () => {
                throw new Error('getDeviceHistory should not be called');
            },
            getDeviceAlerts: async () => {
                throw new Error('getDeviceAlerts should not be called');
            }
        }
    });

    await withServer(app, async (baseUrl) => {
        const response = await requestJson(baseUrl, '/devices/pi-001/latest');

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, {
            deviceId: 'pi-001',
            latest: {
                windowStart: '2026-04-23T10:00:00.000Z',
                windowEnd: '2026-04-23T10:05:00.000Z',
                sampleCount: 12,
                metrics: {
                    co2: { avg: 612.5, max: 701.4 },
                    voc: { avg: 104.2, max: 140.8 },
                    pm1_0: { avg: 1.4, max: 1.4 },
                    pm2_5: { avg: 2.5, max: 2.5 },
                    pm10: { avg: 3.1, max: 3.1 },
                    temperature: { avg: 22.8, max: 22.8 },
                    humidity: { avg: 49.1, max: 49.1 }
                }
            }
        });
    });
});

test('GET /devices/:deviceId/history rejects invalid metric or time range parameters', async () => {
    const app = loadApp();

    await withServer(app, async (baseUrl) => {
        const response = await requestJson(
            baseUrl,
            '/devices/pi-001/history?start=2026-04-23T11:00:00.000Z&end=2026-04-23T10:00:00.000Z&bucket=15x&metric=noise'
        );

        assert.equal(response.status, 400);
        assert.equal(response.body.error, 'Validation failed');
        assert.ok(
            response.body.details.some((detail) =>
                detail.field === 'bucket' &&
                detail.message === 'bucket must be one of the supported duration formats like 5m, 1h, or 1d'
            )
        );
        assert.ok(
            response.body.details.some((detail) =>
                detail.field === 'metric' &&
                detail.message === 'metric must be one of: co2, voc, pm1_0, pm2_5, pm10, temperature, humidity'
            )
        );
        assert.ok(
            response.body.details.some((detail) =>
                detail.field === 'end' &&
                detail.message === 'end must be later than start'
            )
        );
    });
});

test('GET /devices/:deviceId/history returns chart-ready points for a requested metric', async () => {
    const app = loadApp({
        deviceService: {
            registerDevice: async () => {
                throw new Error('registerDevice should not be called');
            },
            listDevices: async () => {
                throw new Error('listDevices should not be called');
            },
            getLatestDeviceSummary: async () => {
                throw new Error('getLatestDeviceSummary should not be called');
            },
            getDeviceHistory: async ({ start, end, bucket, metric }) => ({
                metric,
                range: { start, end, bucket },
                points: [
                    {
                        timestamp: '2026-04-23T10:00:00.000Z',
                        avg: 601.2,
                        min: 590.1,
                        max: 640.8
                    }
                ]
            }),
            getDeviceAlerts: async () => {
                throw new Error('getDeviceAlerts should not be called');
            }
        }
    });

    await withServer(app, async (baseUrl) => {
        const response = await requestJson(
            baseUrl,
            '/devices/pi-001/history?start=2026-04-23T10:00:00.000Z&end=2026-04-23T11:00:00.000Z&bucket=5m&metric=co2'
        );

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, {
            deviceId: 'pi-001',
            range: {
                start: '2026-04-23T10:00:00.000Z',
                end: '2026-04-23T11:00:00.000Z',
                bucket: '5m'
            },
            metric: 'co2',
            points: [
                {
                    timestamp: '2026-04-23T10:00:00.000Z',
                    avg: 601.2,
                    min: 590.1,
                    max: 640.8
                }
            ]
        });
    });
});

test('GET /devices/:deviceId/alerts returns active and recent resolved alerts', async () => {
    const app = loadApp({
        deviceService: {
            registerDevice: async () => {
                throw new Error('registerDevice should not be called');
            },
            listDevices: async () => {
                throw new Error('listDevices should not be called');
            },
            getLatestDeviceSummary: async () => {
                throw new Error('getLatestDeviceSummary should not be called');
            },
            getDeviceHistory: async () => {
                throw new Error('getDeviceHistory should not be called');
            },
            getDeviceAlerts: async () => ([
                {
                    id: 11,
                    metric_name: 'co2',
                    threshold_value: 1000,
                    comparison_operator: '>',
                    started_at: '2026-04-23T10:00:00.000Z',
                    ended_at: null,
                    peak_value: 1240,
                    status: 'active',
                    message: 'CO2 exceeded threshold',
                    created_at: '2026-04-23T10:01:00.000Z'
                }
            ])
        }
    });

    await withServer(app, async (baseUrl) => {
        const response = await requestJson(baseUrl, '/devices/pi-001/alerts');

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, {
            deviceId: 'pi-001',
            filters: {
                status: null
            },
            alerts: [
                {
                    id: 11,
                    metricName: 'co2',
                    thresholdValue: 1000,
                    comparisonOperator: '>',
                    startedAt: '2026-04-23T10:00:00.000Z',
                    endedAt: null,
                    peakValue: 1240,
                    status: 'active',
                    message: 'CO2 exceeded threshold',
                    createdAt: '2026-04-23T10:01:00.000Z'
                }
            ]
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
