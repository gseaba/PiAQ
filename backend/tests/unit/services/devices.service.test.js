const test = require('node:test');
const assert = require('node:assert/strict');

const { loadFresh } = require('../../helpers/module-loader');

test('registerDevice upserts a device and returns the inserted row', async () => {
    const capturedCalls = [];
    const expectedRow = {
        id: 3,
        device_id: 'pi-001',
        location_label: 'Engineering Lab',
        status: 'online',
        registered_at: '2026-04-23T12:00:00.000Z',
        last_seen_at: '2026-04-23T12:00:00.000Z'
    };

    const service = loadFresh('src/services/devices.service.js', {
        mocks: {
            'src/config/db.js': {
                query: async (query, values) => {
                    capturedCalls.push({ query, values });
                    return { rows: [expectedRow] };
                }
            }
        }
    });

    const result = await service.registerDevice({
        deviceId: 'pi-001',
        locationLabel: 'Engineering Lab'
    });

    assert.deepEqual(result, expectedRow);
    assert.equal(capturedCalls.length, 1);
    assert.match(capturedCalls[0].query, /INSERT INTO devices/i);
    assert.match(capturedCalls[0].query, /ON CONFLICT \(device_id\)/i);
    assert.deepEqual(capturedCalls[0].values, ['pi-001', 'Engineering Lab']);
});

test('registerDevice stores a null location label when one is not provided', async () => {
    let capturedValues;

    const service = loadFresh('src/services/devices.service.js', {
        mocks: {
            'src/config/db.js': {
                query: async (query, values) => {
                    capturedValues = values;
                    return { rows: [{ id: 7, device_id: 'pi-002' }] };
                }
            }
        }
    });

    await service.registerDevice({ deviceId: 'pi-002' });

    assert.deepEqual(capturedValues, ['pi-002', null]);
});
