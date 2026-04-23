const test = require('node:test');
const assert = require('node:assert/strict');

const errorHandler = require('../../../src/middleware/errorHandler');

function createResponse(headersSent = false) {
    return {
        headersSent,
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

test('errorHandler returns the provided status and message', () => {
    const res = createResponse();
    const error = new Error('Unknown deviceId: pi-404');
    error.status = 404;
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
        errorHandler(error, {}, res, () => {});
    } finally {
        console.error = originalConsoleError;
    }

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, {
        error: 'Unknown deviceId: pi-404'
    });
});

test('errorHandler delegates to next when headers have already been sent', () => {
    const res = createResponse(true);
    const error = new Error('late failure');
    let receivedError;
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
        errorHandler(error, {}, res, (nextError) => {
            receivedError = nextError;
        });
    } finally {
        console.error = originalConsoleError;
    }

    assert.equal(receivedError, error);
    assert.equal(res.statusCode, null);
    assert.equal(res.body, null);
});
