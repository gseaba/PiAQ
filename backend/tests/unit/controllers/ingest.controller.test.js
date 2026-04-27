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

test('ingestBatch returns the service result with a success message', async () => {
    const calls = [];
    const controller = loadFresh('src/controllers/ingest.controller.js', {
        mocks: {
            'src/services/ingest.service.js': {
                ingestBatch: async (payload) => {
                    calls.push(payload);
                    return {
                        deviceId: 'pi-001',
                        receivedCount: 2,
                        insertedCount: 2,
                        duplicateCount: 0
                    };
                }
            }
        }
    });

    const req = {
        body: {
            deviceId: 'pi-001',
            readings: [{ sampleCount: 10 }, { sampleCount: 11 }]
        }
    };
    const res = createResponse();
    let nextCalled = false;

    await controller.ingestBatch(req, res, () => {
        nextCalled = true;
    });

    assert.deepEqual(calls, [{
        deviceId: 'pi-001',
        readings: [{ sampleCount: 10 }, { sampleCount: 11 }]
    }]);
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, {
        message: 'Batch ingested successfully',
        deviceId: 'pi-001',
        receivedCount: 2,
        insertedCount: 2,
        duplicateCount: 0
    });
});

test('ingestBatch forwards service errors to next', async () => {
    const expectedError = new Error('ingest failed');
    const controller = loadFresh('src/controllers/ingest.controller.js', {
        mocks: {
            'src/services/ingest.service.js': {
                ingestBatch: async () => {
                    throw expectedError;
                }
            }
        }
    });

    const res = createResponse();
    let receivedError;

    await controller.ingestBatch(
        { body: { deviceId: 'pi-001', readings: [] } },
        res,
        (error) => {
            receivedError = error;
        }
    );

    assert.equal(receivedError, expectedError);
    assert.equal(res.statusCode, null);
    assert.equal(res.body, null);
});
