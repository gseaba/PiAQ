const test = require('node:test');
const assert = require('node:assert/strict');

const { loadFresh } = require('../../helpers/module-loader');

function createResponse() {
    return {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };
}

test('registerDevice responds with a mapped device payload', async () => {
    const calls = [];
    const controller = loadFresh('src/controllers/devices.controller.js', {
        mocks: {
            'src/services/devices.service.js': {
                registerDevice: async (payload) => {
                    calls.push(payload);
                    return {
                        id: 9,
                        device_id: 'pi-001',
                        location_label: 'Atrium',
                        status: 'online',
                        registered_at: '2026-04-23T12:00:00.000Z',
                        last_seen_at: '2026-04-23T12:05:00.000Z'
                    };
                }
            }
        }
    });

    const req = {
        body: {
            deviceId: 'pi-001',
            locationLabel: 'Atrium'
        }
    };
    const res = createResponse();
    let nextCalled = false;

    await controller.registerDevice(req, res, () => {
        nextCalled = true;
    });

    assert.deepEqual(calls, [{
        deviceId: 'pi-001',
        locationLabel: 'Atrium'
    }]);
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, {
        message: 'Device registered successfully',
        device: {
            id: 9,
            deviceId: 'pi-001',
            locationLabel: 'Atrium',
            status: 'online',
            registeredAt: '2026-04-23T12:00:00.000Z',
            lastSeenAt: '2026-04-23T12:05:00.000Z'
        }
    });
});

test('registerDevice forwards service errors to next', async () => {
    const expectedError = new Error('db unavailable');
    const controller = loadFresh('src/controllers/devices.controller.js', {
        mocks: {
            'src/services/devices.service.js': {
                registerDevice: async () => {
                    throw expectedError;
                }
            }
        }
    });

    const res = createResponse();
    let receivedError;

    await controller.registerDevice({ body: { deviceId: 'pi-001' } }, res, (error) => {
        receivedError = error;
    });

    assert.equal(receivedError, expectedError);
    assert.equal(res.statusCode, null);
    assert.equal(res.body, null);
});
