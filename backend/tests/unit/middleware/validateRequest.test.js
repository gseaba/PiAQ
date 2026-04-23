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

test('validateRequest calls next when validation passes', () => {
    const validateRequest = loadFresh('src/middleware/validateRequest.js', {
        mocks: {
            'express-validator': {
                validationResult: () => ({
                    isEmpty: () => true
                })
            }
        }
    });

    let nextCalled = false;

    validateRequest({}, createResponse(), () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
});

test('validateRequest returns a 400 with mapped error details when validation fails', () => {
    const validateRequest = loadFresh('src/middleware/validateRequest.js', {
        mocks: {
            'express-validator': {
                validationResult: () => ({
                    isEmpty: () => false,
                    array: () => ([
                        { path: 'deviceId', msg: 'deviceId is required' },
                        { path: 'readings.0.windowStart', msg: 'windowStart is required' }
                    ])
                })
            }
        }
    });

    const res = createResponse();
    let nextCalled = false;

    validateRequest({}, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
        error: 'Validation failed',
        details: [
            { field: 'deviceId', message: 'deviceId is required' },
            { field: 'readings.0.windowStart', message: 'windowStart is required' }
        ]
    });
});
