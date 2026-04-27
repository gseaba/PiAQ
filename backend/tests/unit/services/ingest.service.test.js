const test = require('node:test');
const assert = require('node:assert/strict');

const { loadFresh } = require('../../helpers/module-loader');

function createReading(overrides = {}) {
    return {
        windowStart: '2026-04-23T10:00:00.000Z',
        windowEnd: '2026-04-23T10:05:00.000Z',
        co2_avg: 610.4,
        co2_max: 710.2,
        voc_avg: 112.5,
        voc_max: 150.1,
        pm1_0_avg: 2.2,
        pm2_5_avg: 3.5,
        pm10_avg: 4.1,
        temperature: 21.8,
        humidity: 47.3,
        sampleCount: 15,
        ...overrides
    };
}

test('ingestBatch inserts new readings, skips duplicates, and updates device sync state', async () => {
    const calls = [];
    let released = false;

    const client = {
        query: async (query, values) => {
            calls.push({ query, values });

            if (query === 'BEGIN' || query === 'COMMIT') {
                return {};
            }

            if (/SELECT id, device_id FROM devices/i.test(query)) {
                return { rows: [{ id: 42, device_id: 'pi-001' }] };
            }

            if (/INSERT INTO sensor_readings/i.test(query)) {
                if (calls.filter((call) => /INSERT INTO sensor_readings/i.test(call.query)).length === 1) {
                    return {
                        rows: [{
                            id: 1001,
                            window_start: '2026-04-23T10:00:00.000Z',
                            window_end: '2026-04-23T10:05:00.000Z'
                        }]
                    };
                }

                return { rows: [] };
            }

            if (/INSERT INTO device_sync_state/i.test(query) || /UPDATE devices/i.test(query)) {
                return { rows: [] };
            }

            throw new Error(`Unexpected query: ${query}`);
        },
        release: () => {
            released = true;
        }
    };

    const service = loadFresh('src/services/ingest.service.js', {
        mocks: {
            'src/config/db.js': {
                connect: async () => client
            }
        }
    });

    const readings = [
        createReading(),
        createReading({
            windowStart: '2026-04-23T10:05:00.000Z',
            windowEnd: '2026-04-23T10:10:00.000Z',
            sampleCount: 12
        })
    ];

    const result = await service.ingestBatch({
        deviceId: 'pi-001',
        readings
    });

    assert.deepEqual(result, {
        deviceId: 'pi-001',
        receivedCount: 2,
        insertedCount: 1,
        duplicateCount: 1
    });
    assert.equal(released, true);

    const insertCalls = calls.filter((call) => /INSERT INTO sensor_readings/i.test(call.query));
    assert.equal(insertCalls.length, 2);
    assert.deepEqual(insertCalls[0].values, [
        42,
        readings[0].windowStart,
        readings[0].windowEnd,
        readings[0].co2_avg,
        readings[0].co2_max,
        readings[0].voc_avg,
        readings[0].voc_max,
        readings[0].pm1_0_avg,
        readings[0].pm2_5_avg,
        readings[0].pm10_avg,
        readings[0].temperature,
        readings[0].humidity,
        readings[0].sampleCount,
        readings[0]
    ]);

    const syncStateCall = calls.find((call) => /INSERT INTO device_sync_state/i.test(call.query));
    const updateDeviceCall = calls.find((call) => /UPDATE devices/i.test(call.query));

    assert.deepEqual(syncStateCall.values, [42]);
    assert.deepEqual(updateDeviceCall.values, [42]);
    assert.equal(calls.at(-1).query, 'COMMIT');
});

test('ingestBatch rolls back and throws a 404 when the device is unknown', async () => {
    const calls = [];
    let released = false;

    const client = {
        query: async (query, values) => {
            calls.push({ query, values });

            if (query === 'BEGIN' || query === 'ROLLBACK') {
                return {};
            }

            if (/SELECT id, device_id FROM devices/i.test(query)) {
                return { rows: [] };
            }

            throw new Error(`Unexpected query: ${query}`);
        },
        release: () => {
            released = true;
        }
    };

    const service = loadFresh('src/services/ingest.service.js', {
        mocks: {
            'src/config/db.js': {
                connect: async () => client
            }
        }
    });

    await assert.rejects(
        service.ingestBatch({
            deviceId: 'missing-device',
            readings: [createReading()]
        }),
        (error) => {
            assert.equal(error.message, 'Unknown deviceId: missing-device');
            assert.equal(error.status, 404);
            return true;
        }
    );

    assert.equal(calls.at(-1).query, 'ROLLBACK');
    assert.equal(released, true);
});

test('ingestBatch rolls back and releases the client when an insert fails', async () => {
    const calls = [];
    let released = false;
    const insertError = new Error('insert failed');

    const client = {
        query: async (query, values) => {
            calls.push({ query, values });

            if (query === 'BEGIN' || query === 'ROLLBACK') {
                return {};
            }

            if (/SELECT id, device_id FROM devices/i.test(query)) {
                return { rows: [{ id: 21, device_id: 'pi-err' }] };
            }

            if (/INSERT INTO sensor_readings/i.test(query)) {
                throw insertError;
            }

            throw new Error(`Unexpected query: ${query}`);
        },
        release: () => {
            released = true;
        }
    };

    const service = loadFresh('src/services/ingest.service.js', {
        mocks: {
            'src/config/db.js': {
                connect: async () => client
            }
        }
    });

    await assert.rejects(
        service.ingestBatch({
            deviceId: 'pi-err',
            readings: [createReading()]
        }),
        insertError
    );

    assert.equal(calls.at(-1).query, 'ROLLBACK');
    assert.equal(released, true);
});
